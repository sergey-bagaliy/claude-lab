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
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import anthropic

from .family import build_context, build_system_prompt
from .pricing import estimate_cost, usage_from_response
from .recipes import Recipe, parse_recipe, recipe_as_text
from .storage import Storage
from .timeutil import now_local
from .tools import CLIENT_TOOLS, SHOW_RECIPE, WEB_SEARCH_TOOL, ToolContext, ToolExecutor

log = logging.getLogger(__name__)

# Потолок длины ответа (с «размышлениями» модели). Платите только за реально написанное.
MAX_TOKENS = 16000
# Сколько раз подряд Claude может вызывать инструменты в одном ответе.
MAX_STEPS = 6

# Уровень «старания»: low — быстро и дёшево (чат, сказки),
# medium — для задач с поиском в интернете (рецепты, выходные).
EFFORT_BY_KIND = {"chat": "low", "story": "low", "recipe": "medium", "weekend": "medium"}

# Если модель откажется отвечать из-за ложного срабатывания защитных фильтров,
# сервер Anthropic сам повторит запрос на подходящей модели (fallbacks: "default").
# Для Claude Haiku 5.5 такой возможности нет — для неё параметр не отправляем.
FALLBACK_MODELS = {"claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"}
FALLBACK_BETA = "server-side-fallback-2026-07-01"

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
    ) -> None:
        self.client = client
        self.storage = storage
        self.model = model
        self.memory_size = memory_size
        self.daily_budget_usd = daily_budget_usd
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

    # ---------- внутреннее ----------

    def _check_budget(self) -> None:
        if self.daily_budget_usd <= 0:
            return
        spent = self.storage.spent(self.clock().strftime("%Y-%m-%d")).cost_usd
        if spent >= self.daily_budget_usd:
            raise AssistantError(
                f"Дневной лимит расходов на Claude исчерпан (${self.daily_budget_usd:.2f}). "
                "Завтра снова заработает. Список покупок, напоминания и примеры работают и сейчас."
            )

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
        searched = False

        for _ in range(MAX_STEPS):
            response = await self._create(messages, EFFORT_BY_KIND.get(kind, "low"), kind)
            searched = searched or _did_search(response)

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
                results, recipe = self._run_tools(tool_uses, ctx, searched)
                if recipe is not None:
                    recipe_id = self.storage.save_recipe(
                        chat_id, recipe.title, recipe.ingredients, recipe_query
                    )
                    self.storage.add_exchange(chat_id, user_content, recipe_as_text(recipe), self.memory_size)
                    return Reply(text=_text_of(response), recipe=recipe, recipe_id=recipe_id)
                # Важно: ответ Claude возвращаем целиком и без изменений.
                messages = messages + [
                    {"role": "assistant", "content": response.content},
                    {"role": "user", "content": results},
                ]
                continue

            text = _text_of(response)
            if not text:
                log.warning("Пустой ответ от Claude, stop_reason=%s", response.stop_reason)
                raise AssistantError("Claude прислал пустой ответ. Попробуйте спросить иначе.")
            if response.stop_reason == "max_tokens":
                text += TRUNCATED_NOTE
            self.storage.add_exchange(chat_id, user_content, text, self.memory_size)
            return Reply(text=text, sources=_sources_of(response))

        raise AssistantError("Запрос оказался слишком сложным. Попробуйте разбить его на части.")

    def _run_tools(
        self, tool_uses: list[Any], ctx: ToolContext, searched: bool
    ) -> tuple[list[dict[str, Any]], Recipe | None]:
        results: list[dict[str, Any]] = []
        recipe: Recipe | None = None
        for block in tool_uses:
            if block.name == SHOW_RECIPE:
                try:
                    recipe = parse_recipe(block.input, allow_url=searched)
                    content, is_error = "Карточка рецепта показана пользователю.", False
                except ValueError as error:
                    content, is_error = str(error), True
            else:
                result = self.tools.run(block.name, block.input, ctx)
                content, is_error = result.content, result.is_error
            log.info("Инструмент %s → %s", block.name, "ошибка" if is_error else "ок")
            results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error}
            )
        return results, recipe

    async def _create(self, messages: list[dict[str, Any]], effort: str, kind: str) -> Any:
        tools = ([WEB_SEARCH_TOOL] if self.web_search else []) + CLIENT_TOOLS
        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": MAX_TOKENS,
            "system": self.system_prompt,
            "messages": messages,
            "tools": tools,
            "output_config": {"effort": effort},
            # Кэш: одинаковое начало запроса (инструкции, инструменты, история)
            # в следующий раз обходится примерно в 20 раз дешевле.
            "cache_control": {"type": "ephemeral"},
        }
        if self.model in FALLBACK_MODELS:
            params["betas"] = [FALLBACK_BETA]
            params["fallbacks"] = "default"

        try:
            response = await self.client.beta.messages.create(**params)
        except anthropic.AuthenticationError:
            log.error("Claude не принял API-ключ (401)")
            raise AssistantError(
                "Claude не принял API-ключ. Проверьте переменную ANTHROPIC_API_KEY."
            ) from None
        except anthropic.PermissionDeniedError:
            log.error("Нет доступа к Claude API (403)")
            raise AssistantError(
                "У API-ключа нет доступа к Claude. Проверьте ключ в Claude Console."
            ) from None
        except anthropic.NotFoundError:
            log.error("Модель %s не найдена (404)", self.model)
            raise AssistantError(
                f"Модель {self.model} не найдена. Проверьте переменную CLAUDE_MODEL."
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
                return await self._create(messages, effort, kind)
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

        self._record_usage(response, kind)
        return response

    def _record_usage(self, response: Any, kind: str) -> None:
        counts = usage_from_response(getattr(response, "usage", None))
        cost = estimate_cost(self.model, counts)
        self.storage.add_usage(self.clock().strftime("%Y-%m-%d"), kind, self.model, counts, cost)
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


def _did_search(response: Any) -> bool:
    usage = getattr(response, "usage", None)
    server_tools = getattr(usage, "server_tool_use", None) if usage else None
    if server_tools and (getattr(server_tools, "web_search_requests", 0) or 0) > 0:
        return True
    return any(b.type == "server_tool_use" for b in response.content)
