"""Общение с Claude через официальный SDK anthropic.

Как устроен один ответ:
1. Берём из базы последние сообщения чата и добавляем новое.
2. Отправляем Claude: инструкции + историю + список инструментов.
3. Claude может: сам поискать в интернете (на серверах Anthropic),
   попросить бота выполнить инструмент (добавить в покупки, поставить напоминание,
   показать рецепт) — тогда бот выполняет и отправляет результат обратно — и так по кругу,
   пока Claude не напишет окончательный ответ.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import anthropic

from .budget import BudgetEvent, BudgetGuard
from .family import build_context, build_system_prompt
from .media import (
    MediaCard,
    PhotoAlbum,
    WikimediaPhotos,
    is_known_url,
    media_as_text,
    normalize_url,
    parse_media,
)
from .models import KNOWN_MODEL_IDS
from .pricing import estimate_cost, usage_from_response
from .recipes import Recipe, parse_recipe, recipe_as_text
from .storage import Storage
from .timeutil import now_local
from .tools import (
    CLIENT_TOOLS,
    SHOW_MEDIA,
    SHOW_PHOTOS,
    SHOW_RECIPE,
    WEB_SEARCH_TOOL,
    ToolContext,
    ToolExecutor,
)

log = logging.getLogger(__name__)

# Потолок длины ответа (с «размышлениями» модели). Платите только за реально написанное.
MAX_TOKENS = 16000
# Сколько раз подряд Claude может вызывать инструменты в одном ответе.
MAX_STEPS = 6

# Уровень «старания»: low — быстро и дёшево (чат, сказки),
# medium — для задач с поиском в интернете (рецепты, выходные, видео и аудио).
EFFORT_BY_KIND = {"chat": "low", "story": "low", "recipe": "medium", "weekend": "medium", "media": "medium"}
# Не больше стольких альбомов с фото мест за один ответ.
MAX_ALBUMS = 3
DEFAULT_PHOTOS = 4  # сколько фото в альбоме, если Claude не сказал

# Если модель откажется отвечать из-за ложного срабатывания защитных фильтров,
# сервер Anthropic сам повторит запрос на подходящей модели (fallbacks: "default").
# Для Claude Haiku 5.5 такой возможности нет — для неё параметр не отправляем.
FALLBACK_MODELS = {"claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"}
FALLBACK_BETA = "server-side-fallback-2026-07-01"

MODEL_SETTING = "model"  # ключ в таблице настроек

TRUNCATED_NOTE = "\n\n(Ответ получился длинным и обрезан. Напишите «продолжи».)"


class AssistantError(Exception):
    """Понятная пользователю ошибка: текст можно сразу отправить в чат."""


@dataclass(frozen=True)
class Person:
    user_id: int
    name: str


@dataclass
class Reply:
    text: str
    recipe: Recipe | None = None
    recipe_id: int | None = None
    media: MediaCard | None = None  # подборка видео / аудио / ссылок
    albums: list[PhotoAlbum] = field(default_factory=list)  # фото мест
    sources: list[tuple[str, str]] = field(default_factory=list)  # (название, ссылка)

    def display_text(self) -> str:
        if not self.sources:
            return self.text
        lines = [self.text, "", "Источники:"]
        lines += [f"• {title[:60]} — {url}" for title, url in self.sources]
        return "\n".join(lines)


class FamilyAssistant:
    def __init__(
        self,
        client: anthropic.AsyncAnthropic,
        storage: Storage,
        model: str,
        memory_size: int = 20,
        daily_budget_usd: float = 0.0,
        web_search: bool = True,
        clock: Callable[[], datetime] = now_local,
        photos: WikimediaPhotos | None = None,
    ) -> None:
        self.client = client
        self.photos = photos
        self.storage = storage
        # Модель по умолчанию (из CLAUDE_MODEL). Выбор в «⚙️ Настройках» бота важнее.
        self.default_model = model
        self.memory_size = memory_size
        self.budget = BudgetGuard(storage, daily_budget_usd, clock)
        # Кому сообщать о расходах (бот подставляет отправку сообщения хозяину).
        self.on_budget_event: Callable[[BudgetEvent], Awaitable[None]] | None = None
        self.web_search = web_search
        self.clock = clock
        self.tools = ToolExecutor(storage, clock)
        self.system_prompt = build_system_prompt()
        self._locks: dict[int, asyncio.Lock] = {}

    # ---------- публичные методы ----------

    async def ask(
        self, chat_id: int, person: Person, text: str, kind: str = "chat", recipe_query: str = ""
    ) -> Reply:
        # Замок на чат: два быстрых сообщения подряд обработаются по очереди.
        lock = self._locks.setdefault(chat_id, asyncio.Lock())
        async with lock:
            self._check_budget()
            now = self.clock()
            members = [m.first_name for m in self.storage.members()]
            user_content = f"{build_context(now, person.name, members)}\n{text}"
            messages: list[dict[str, Any]] = self.storage.history(chat_id, self.memory_size)
            messages.append({"role": "user", "content": user_content})
            return await self._run_turn(chat_id, person, messages, user_content, kind, recipe_query or text)

    def reset(self, chat_id: int) -> None:
        self.storage.clear_history(chat_id)

    @property
    def model(self) -> str:
        """Модель, которая сейчас отвечает: выбранная в настройках бота или по умолчанию."""
        chosen = self.storage.get_setting(MODEL_SETTING)
        return chosen if chosen in KNOWN_MODEL_IDS else self.default_model

    def set_model(self, model_id: str) -> None:
        if model_id not in KNOWN_MODEL_IDS:
            raise ValueError(f"Неизвестная модель: {model_id}")
        self.storage.set_setting(MODEL_SETTING, model_id)
        log.info("Модель переключена на %s", model_id)

    # ---------- внутреннее ----------

    @property
    def daily_budget_usd(self) -> float:
        return self.budget.daily_budget_usd

    @daily_budget_usd.setter
    def daily_budget_usd(self, value: float) -> None:
        self.budget.daily_budget_usd = value

    def _check_budget(self) -> None:
        if self.budget.is_exhausted():
            raise AssistantError(
                f"Дневной лимит расходов на Claude исчерпан (${self.budget.limit_today():.2f}). "
                "Хозяину бота уже пришло уведомление — он может поднять лимит на сегодня. "
                "Иначе завтра всё снова заработает. Покупки, напоминания и примеры работают и сейчас."
            )

    async def _notify_budget(self) -> None:
        for event in self.budget.new_events():
            log.warning("Лимит расходов: %s ($%.2f из $%.2f)", event.level, event.spent, event.limit)
            if self.on_budget_event is not None:
                try:
                    await self.on_budget_event(event)
                except Exception:
                    log.exception("Не удалось отправить уведомление о лимите")

    async def _run_turn(
        self,
        chat_id: int,
        person: Person,
        messages: list[dict[str, Any]],
        user_content: str,
        kind: str,
        recipe_query: str,
    ) -> Reply:
        ctx = ToolContext(chat_id=chat_id, person_name=person.name)
        turn = _Turn()
        # Модель фиксируем на весь ответ: если кто-то переключит её в настройках прямо сейчас,
        # этот ответ спокойно закончится на прежней, а следующий пойдёт на новой.
        # Историю разговора бот хранит обычным текстом, поэтому смена модели между ответами безопасна.
        model = self.model

        for _ in range(MAX_STEPS):
            response = await self._create(messages, EFFORT_BY_KIND.get(kind, "low"), kind, model)
            turn.observe(response)

            if response.stop_reason == "refusal":
                category = response.stop_details.category if response.stop_details else None
                log.warning("Claude отказался отвечать, категория: %s", category)
                raise AssistantError("На этот вопрос я ответить не могу. Попробуйте спросить иначе.")

            if response.stop_reason == "pause_turn":
                # Долгий поиск: сервер просит прислать ответ обратно, чтобы продолжить.
                messages = messages + [{"role": "assistant", "content": response.content}]
                continue

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if response.stop_reason == "tool_use" and tool_uses:
                results = await self._run_tools(tool_uses, ctx, turn)
                if turn.recipe is not None or turn.media is not None:
                    # Карточка готова — Claude больше не вызываем (экономия).
                    return self._finish_card(chat_id, user_content, turn, recipe_query)
                # Важно: ответ Claude возвращаем целиком и без изменений.
                messages = messages + [
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": results},
                ]
                continue

            text = _text_of(response)
            if not text and not turn.albums:
                log.warning("Пустой ответ от Claude, stop_reason=%s", response.stop_reason)
                raise AssistantError("Claude прислал пустой ответ. Попробуйте спросить иначе.")
            if response.stop_reason == "max_tokens":
                text += TRUNCATED_NOTE
            memory = text
            if turn.albums:
                memory += "\n(Отправлены фото: " + ", ".join(a.title for a in turn.albums) + ")"
            self.storage.add_exchange(chat_id, user_content, memory.strip(), self.memory_size)
            return Reply(text=text, sources=_sources_of(response), albums=turn.albums)

        raise AssistantError("Запрос оказался слишком сложным. Попробуйте разбить его на части.")

    def _finish_card(self, chat_id: int, user_content: str, turn: _Turn, recipe_query: str) -> Reply:
        if turn.recipe is not None:
            recipe = turn.recipe
            recipe_id = self.storage.save_recipe(chat_id, recipe.title, recipe.ingredients, recipe_query)
            self.storage.add_exchange(chat_id, user_content, recipe_as_text(recipe), self.memory_size)
            return Reply(text="", recipe=recipe, recipe_id=recipe_id, albums=turn.albums)
        assert turn.media is not None
        self.storage.add_exchange(chat_id, user_content, media_as_text(turn.media), self.memory_size)
        return Reply(text="", media=turn.media, albums=turn.albums)

    async def _run_tools(self, tool_uses: list[Any], ctx: ToolContext, turn: _Turn) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for block in tool_uses:
            data = block.input
            if not isinstance(data, dict):
                content, is_error = "Входные данные должны быть объектом JSON.", True
            elif block.name == SHOW_RECIPE:
                try:
                    allow_url = is_known_url(data.get("source_url"), turn.found_urls, turn.searched)
                    turn.recipe = parse_recipe(data, allow_url=allow_url)
                    content, is_error = "Карточка рецепта показана пользователю.", False
                except ValueError as error:
                    content, is_error = str(error), True
            elif block.name == SHOW_MEDIA:
                try:
                    turn.media = parse_media(data, turn.found_urls, turn.searched)
                    content, is_error = "Подборка показана пользователю.", False
                except ValueError as error:
                    content, is_error = str(error), True
            elif block.name == SHOW_PHOTOS:
                content, is_error = await self._photos(data, turn)
            else:
                result = self.tools.run(block.name, data, ctx)
                content, is_error = result.content, result.is_error
            log.info("Инструмент %s → %s", block.name, "ошибка" if is_error else "ок")
            results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error}
            )
        return results

    async def _photos(self, data: dict[str, Any], turn: _Turn) -> tuple[str, bool]:
        if self.photos is None:
            return "Фото сейчас недоступны. Скажи об этом пользователю.", True
        if len(turn.albums) >= MAX_ALBUMS:
            return f"За один ответ — не больше {MAX_ALBUMS} альбомов с фото.", True
        place = " ".join(str(data.get("title", "")).split())[:80]
        query = " ".join(str(data.get("search_query", "")).split())[:100]
        if not place or not query:
            return "Нужны title и search_query.", True
        try:
            count = min(max(int(data.get("count") or DEFAULT_PHOTOS), 1), 6)
        except (TypeError, ValueError):
            count = DEFAULT_PHOTOS
        photos = await self.photos.search(query, limit=count)
        if not photos:
            return (
                f"Фото по запросу «{query}» не нашлось. Попробуй другой запрос на английском "
                "или скажи пользователю, что фото не нашлось.",
                True,
            )
        turn.albums.append(PhotoAlbum(title=place, photos=photos))
        return f"Пользователю отправлено фото: {len(photos)} шт. ({place}).", False

    async def _create(self, messages: list[dict[str, Any]], effort: str, kind: str, model: str) -> Any:
        tools = ([WEB_SEARCH_TOOL] if self.web_search else []) + CLIENT_TOOLS
        params: dict[str, Any] = {
            "model": model,
            "max_tokens": MAX_TOKENS,
            "system": self.system_prompt,
            "messages": messages,
            "tools": tools,
            "output_config": {"effort": effort},
            # Кэш: одинаковое начало запроса (инструкции, инструменты, история)
            # в следующий раз обходится примерно в 20 раз дешевле.
            "cache_control": {"type": "ephemeral"},
        }
        if model in FALLBACK_MODELS:
            params["betas"] = [FALLBACK_BETA]
            params["fallbacks"] = "default"

        try:
            response = await self.client.beta.messages.create(**params)
        except anthropic.AuthenticationError:
            log.error("Claude не принял API-ключ (401)")
            raise AssistantError(
                "Claude не принял API-ключ. Проверьте переменную ANTHROPIC_API_KEY."
            ) from None
        except anthropic.PermissionDeniedError as error:
            log.error("Нет доступа к Claude API (403): %s", error.message)
            raise AssistantError(
                "Claude отказал в доступе (403). Частые причины: у ключа нет прав или запрос идёт "
                "из страны, которую Anthropic не поддерживает. Подробности — в README, раздел про сервер."
            ) from None
        except anthropic.NotFoundError:
            log.error("Модель %s не найдена (404)", model)
            raise AssistantError(
                f"Модель {model} не найдена. Выберите другую в «⚙️ Настройках» или проверьте CLAUDE_MODEL."
            ) from None
        except anthropic.RateLimitError:
            log.warning("Превышен лимит запросов к Claude (429)")
            raise AssistantError(
                "Слишком много вопросов подряд. Подождите минуту и спросите снова."
            ) from None
        except anthropic.BadRequestError as error:
            message = error.message.lower()
            if self.web_search and ("web search" in message or "web_search" in message):
                # Поиск отключён администратором в Claude Console — работаем без него.
                log.warning("Поиск в интернете недоступен, продолжаю без него: %s", error.message)
                self.web_search = False
                return await self._create(messages, effort, kind, model)
            log.error("Claude отклонил запрос (400): %s", error.message)
            if "credit balance" in message:
                raise AssistantError(
                    "На балансе Claude Console закончились деньги. Пополните баланс и попробуйте снова."
                ) from None
            raise AssistantError(
                "Claude не смог обработать запрос. Нажмите «🧹 Новый разговор» и спросите снова."
            ) from None
        except anthropic.APIStatusError as error:
            log.error("Ошибка сервиса Claude (%s): %s", error.status_code, error.message)
            raise AssistantError(
                "Сервис Claude сейчас перегружен или недоступен. Попробуйте через пару минут."
            ) from None
        except anthropic.APIConnectionError:
            log.error("Нет связи с Claude API")
            raise AssistantError(
                "Не получилось связаться с Claude. Проверьте интернет и попробуйте снова."
            ) from None

        self._record_usage(response, kind, model)
        await self._notify_budget()
        return response

    def _record_usage(self, response: Any, kind: str, model: str) -> None:
        counts = usage_from_response(getattr(response, "usage", None))
        cost = estimate_cost(model, counts)
        self.storage.add_usage(self.clock().strftime("%Y-%m-%d"), kind, model, counts, cost)
        log.info(
            "Claude (%s): вход %s, кэш %s, выход %s, поисков %s ≈ $%.4f",
            kind,
            counts.input_tokens,
            counts.cache_read_tokens,
            counts.output_tokens,
            counts.web_searches,
            cost,
        )


def _text_of(response: Any) -> str:
    """Пользователю показываем только текст (блоки «размышлений» и служебные — нет)."""
    return "".join(b.text for b in response.content if b.type == "text").strip()


def _sources_of(response: Any, limit: int = 3) -> list[tuple[str, str]]:
    """Ссылки на источники из найденного в интернете (Anthropic требует их показывать)."""
    sources: dict[str, str] = {}
    for block in response.content:
        if block.type != "text":
            continue
        for citation in getattr(block, "citations", None) or []:
            url = getattr(citation, "url", None)
            if url and url not in sources:
                sources[url] = getattr(citation, "title", None) or url
    return [(title, url) for url, title in list(sources.items())[:limit]]


@dataclass
class _Turn:
    """Что накопилось за один ответ: был ли поиск, какие адреса нашлись, что показать."""

    searched: bool = False
    found_urls: set[str] = field(default_factory=set)
    recipe: Recipe | None = None
    media: MediaCard | None = None
    albums: list[PhotoAlbum] = field(default_factory=list)

    def observe(self, response: Any) -> None:
        self.searched = self.searched or _did_search(response)
        self.found_urls |= _found_urls(response)


def _found_urls(response: Any) -> set[str]:
    """Адреса из результатов поиска и цитат — только им бот доверяет."""
    urls: set[str] = set()
    for block in response.content:
        if block.type == "web_search_tool_result" and isinstance(block.content, list):
            urls |= {normalize_url(r.url) for r in block.content if getattr(r, "url", None)}
        elif block.type == "text":
            for citation in getattr(block, "citations", None) or []:
                if getattr(citation, "url", None):
                    urls.add(normalize_url(citation.url))
    return urls


def _did_search(response: Any) -> bool:
    usage = getattr(response, "usage", None)
    server_tools = getattr(usage, "server_tool_use", None) if usage else None
    if server_tools and (getattr(server_tools, "web_search_requests", 0) or 0) > 0:
        return True
    return any(b.type == "server_tool_use" for b in response.content)
