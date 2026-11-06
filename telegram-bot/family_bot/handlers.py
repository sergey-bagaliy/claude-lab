"""Обработчики Telegram (aiogram 3): кнопки меню, команды, кнопки под сообщениями, диалог."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from aiogram import BaseMiddleware, Bot, F, Router
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramBadRequest, TelegramNetworkError
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    LinkPreviewOptions,
    Message,
    TelegramObject,
    User,
)
from aiogram.utils.chat_action import ChatActionSender

from . import keyboards as kb
from . import texts
from .assistant import AssistantError, FamilyAssistant, Person, Reply
from .family import (
    RECIPE_PRESETS,
    STORY_THEMES,
    build_media_request,
    build_recipe_request,
    build_story_request,
    build_weekend_request,
)
from .media import PhotoAlbum, album_captions, render_media_html
from .models import MODEL_CHOICES, model_label
from .multiplication import QuizGame, format_examples, make_examples, new_game, question_text, result_text
from .recipes import render_recipe_html
from .storage import Storage
from .timeutil import format_when
from .tools import describe_reminder
from .voice import MAX_VOICE_SECONDS, VOICE_SETTING, VoiceService

log = logging.getLogger(__name__)

NO_PREVIEW = LinkPreviewOptions(is_disabled=True)
KIND_LABELS = {
    "chat": "Разговор",
    "recipe": "Рецепты",
    "weekend": "Выходные",
    "story": "Сказки",
    "media": "Видео и аудио",
}


class Forms(StatesGroup):
    recipe_query = State()  # ждём, что приготовить
    shopping_items = State()  # ждём товары для списка покупок


@dataclass
class Deps:
    assistant: FamilyAssistant
    storage: Storage
    clock: Callable[[], datetime]
    voice: VoiceService | None = None  # None — голосовые выключены
    admin_id: int | None = None  # хозяин бота: уведомления о лимите и кнопки «+$ на сегодня»
    quiz_games: dict[int, QuizGame] = field(default_factory=dict)


class AccessMiddleware(BaseMiddleware):
    """Пускает только семью (если задан ALLOWED_USER_IDS) и запоминает, кто пользуется ботом."""

    def __init__(
        self, allowed_user_ids: frozenset[int], storage: Storage, clock: Callable[[], datetime]
    ) -> None:
        self.allowed_user_ids = allowed_user_ids
        self.storage = storage
        self.clock = clock

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user: User | None = getattr(event, "from_user", None)
        if user is None or user.is_bot:
            return None

        if self.allowed_user_ids and user.id not in self.allowed_user_ids:
            log.info("Отказано в доступе пользователю %s", user.id)
            if isinstance(event, CallbackQuery):
                await event.answer(texts.access_denied_text(user.id), show_alert=True)
            elif isinstance(event, Message):
                await event.answer(texts.access_denied_text(user.id))
            return None

        chat_id = _chat_id(event, user)
        self.storage.touch_user(
            user.id,
            user.first_name or "Член семьи",
            chat_id,
            int(self.clock().timestamp()),
            private_chat=chat_id == user.id,  # в личном чате его номер совпадает с номером человека
        )
        data["person"] = Person(user_id=user.id, name=user.first_name or "Член семьи")
        return await handler(event, data)


def _chat_id(event: TelegramObject, user: User) -> int:
    if isinstance(event, Message):
        return event.chat.id
    if isinstance(event, CallbackQuery) and isinstance(event.message, Message):
        return event.message.chat.id
    return user.id


def _message_of(callback: CallbackQuery) -> Message | None:
    """Сообщение под кнопкой (очень старые сообщения Telegram уже не отдаёт)."""
    return callback.message if isinstance(callback.message, Message) else None


async def _safe_edit(
    message: Message, text: str, markup: InlineKeyboardMarkup | None, html: bool = False
) -> None:
    try:
        await message.edit_text(
            text,
            reply_markup=markup,
            parse_mode=ParseMode.HTML if html else None,
            link_preview_options=NO_PREVIEW,
        )
    except TelegramBadRequest as error:
        if "not modified" not in str(error).lower():
            raise


def _parse_items(text: str) -> list[str]:
    raw = text.replace(";", ",").replace("\n", ",").split(",")
    return [item.strip(" .-•") for item in raw if item.strip(" .-•")]


def create_router(deps: Deps, allowed_user_ids: frozenset[int]) -> Router:
    router = Router(name="family")
    access = AccessMiddleware(allowed_user_ids, deps.storage, deps.clock)
    router.message.outer_middleware(access)
    router.callback_query.outer_middleware(access)

    storage, assistant = deps.storage, deps.assistant

    # ================= ответы Claude =================

    async def ask_claude(
        message: Message,
        person: Person,
        request: str,
        kind: str = "chat",
        *,
        status: str | None = None,
        recipe_query: str = "",
        markup: InlineKeyboardMarkup | None = None,
        voice_reply: bool = False,
        read_aloud: bool = False,
    ) -> None:
        if status:
            await message.answer(status)
        try:
            async with ChatActionSender.typing(chat_id=message.chat.id, bot=message.bot):
                reply = await assistant.ask(
                    message.chat.id, person, request, kind=kind, recipe_query=recipe_query
                )
        except AssistantError as error:
            await message.answer(f"⚠️ {error}")
            return
        except Exception:
            log.exception("Неожиданная ошибка при ответе")
            await message.answer("⚠️ Что-то пошло не так. Попробуйте ещё раз чуть позже.")
            return
        if read_aloud and deps.voice is not None and reply.text:
            markup = kb.with_read_aloud(markup, storage.save_text(message.chat.id, reply.text))
        await send_reply(message, reply, markup)
        if voice_reply and reply.text and voice_replies_on():
            await send_voice(message, reply.text)

    def voice_replies_on() -> bool:
        return deps.voice is not None and storage.get_setting(VOICE_SETTING) != "0"

    async def send_voice(message: Message, text: str) -> None:
        """Озвучивает текст и присылает голосовым. Если не вышло — текст уже отправлен, просто пишем в лог."""
        if deps.voice is None:
            return
        try:
            async with ChatActionSender.record_voice(chat_id=message.chat.id, bot=message.bot):
                audio = await deps.voice.speak(text)
        except Exception:
            log.exception("Не удалось озвучить ответ")
            await message.answer(texts.VOICE_TTS_FAILED)
            return
        if audio:
            await message.answer_voice(BufferedInputFile(audio, filename="otvet.ogg"))

    async def send_album(message: Message, album: PhotoAlbum) -> None:
        """Фото места альбомом. Если Telegram не смог скачать какое-то фото — шлём по одному."""
        captions = album_captions(album)
        media = [
            InputMediaPhoto(media=photo.url, caption=caption, parse_mode=ParseMode.HTML)
            for photo, caption in zip(album.photos, captions, strict=True)
        ]
        try:
            await message.answer_media_group(media)
            return
        except (TelegramBadRequest, TelegramNetworkError) as error:
            log.warning("Альбом «%s» не отправился целиком: %s", album.title, error)
        sent = 0
        for photo, caption in zip(album.photos, captions, strict=True):
            try:
                await message.answer_photo(photo.url, caption=caption, parse_mode=ParseMode.HTML)
                sent += 1
            except (TelegramBadRequest, TelegramNetworkError):
                continue
        if not sent:
            links = "\n".join(f"• {p.page_url}" for p in album.photos)
            await message.answer(f"{texts.PHOTOS_FAILED}\n{links}", link_preview_options=NO_PREVIEW)

    async def send_reply(message: Message, reply: Reply, markup: InlineKeyboardMarkup | None) -> None:
        for album in reply.albums:
            await send_album(message, album)
        if reply.media is not None:
            first = reply.media.items[0].url
            await message.answer(
                render_media_html(reply.media),
                parse_mode=ParseMode.HTML,
                link_preview_options=LinkPreviewOptions(
                    url=first, prefer_large_media=True, show_above_text=True
                ),
                reply_markup=markup,
            )
            return
        if reply.recipe is not None and reply.recipe_id is not None:
            recipe = reply.recipe
            preview = (
                LinkPreviewOptions(url=recipe.url, prefer_large_media=True, show_above_text=True)
                if recipe.url
                else NO_PREVIEW
            )
            await message.answer(
                render_recipe_html(recipe),
                parse_mode=ParseMode.HTML,
                link_preview_options=preview,
                reply_markup=kb.recipe_actions(reply.recipe_id),
            )
            return
        if not reply.text:
            return  # только фото, без текста
        parts = texts.split_message(reply.display_text())
        for number, part in enumerate(parts, start=1):
            await message.answer(
                part,
                parse_mode=None,  # ответ Claude — обычный текст, спецсимволы ничего не сломают
                link_preview_options=NO_PREVIEW,
                reply_markup=markup if number == len(parts) else None,
            )

    # ================= разделы =================

    async def show_start(message: Message, state: FSMContext) -> None:
        await state.clear()
        await message.answer(texts.START_TEXT, reply_markup=kb.main_menu())

    async def show_help(message: Message, state: FSMContext) -> None:
        await state.clear()
        await message.answer(texts.HELP_TEXT, parse_mode=ParseMode.HTML, reply_markup=kb.main_menu())

    async def recipe_start(message: Message, state: FSMContext) -> None:
        await state.set_state(Forms.recipe_query)
        await message.answer(texts.RECIPE_ASK, reply_markup=kb.recipe_presets())

    async def recipe_search(message: Message, person: Person, query: str, exclude: str | None = None) -> None:
        await ask_claude(
            message,
            person,
            build_recipe_request(query, exclude),
            "recipe",
            status=texts.RECIPE_SEARCHING,
            recipe_query=query,
        )

    def shopping_view() -> tuple[str, InlineKeyboardMarkup]:
        items = storage.shopping()
        if not items:
            return texts.SHOPPING_EMPTY, kb.shopping([])
        left = sum(1 for i in items if not i.bought)
        text = f"🛒 Список покупок — осталось купить: {left}\nНажмите на товар, когда купите."
        return text, kb.shopping(items)

    async def show_shopping(message: Message, state: FSMContext) -> None:
        await state.clear()
        text, markup = shopping_view()
        await message.answer(text, reply_markup=markup)

    def reminders_view(chat_id: int) -> tuple[str, InlineKeyboardMarkup | None]:
        now = deps.clock()
        items = storage.pending_reminders_for(chat_id)
        if not items:
            return "⏰ Напоминаний пока нет.\n\n" + texts.REMINDERS_HINT, None
        names = {m.chat_id: m.first_name for m in storage.members()}
        labels = []
        for r in items[:20]:
            label = describe_reminder(r, now)
            if r.chat_id != chat_id:
                label += f" → {names.get(r.chat_id, '?')}"
            elif r.created_by_chat != chat_id and r.created_by:
                label += f" (от: {r.created_by})"
            labels.append(label)
        text = "⏰ Запланировано:\n\n" + "\n".join(f"• {label}" for label in labels)
        text += "\n\nНажмите ❌, чтобы удалить.\n\n" + texts.REMINDERS_HINT
        return text, kb.reminders(items[:20], labels)

    async def show_reminders(message: Message, state: FSMContext) -> None:
        await state.clear()
        text, markup = reminders_view(message.chat.id)
        await message.answer(text, reply_markup=markup)

    async def show_weekend(message: Message, person: Person, state: FSMContext, variant: str = "any") -> None:
        await state.clear()
        await ask_claude(
            message,
            person,
            build_weekend_request(variant),
            "weekend",
            status=texts.WEEKEND_SEARCHING,
            markup=kb.weekend(),
        )

    async def show_story(message: Message, person: Person, state: FSMContext, theme: str) -> None:
        await state.clear()
        await ask_claude(
            message,
            person,
            build_story_request(theme),
            "story",
            status=texts.STORY_WRITING,
            markup=kb.story(),
            read_aloud=True,
        )

    async def show_quiz_menu(message: Message, state: FSMContext) -> None:
        await state.clear()
        await message.answer(texts.QUIZ_MENU, reply_markup=kb.quiz_menu())

    def start_game(chat_id: int, table: int | None) -> QuizGame:
        game = new_game(table)
        deps.quiz_games[chat_id] = game
        return game

    def settings_view() -> tuple[str, InlineKeyboardMarkup]:
        now = deps.clock()
        current = assistant.model
        today = storage.spent(now.strftime("%Y-%m-%d"))
        month = storage.spent(now.strftime("%Y-%m"))
        lines = ["⚙️ Настройки", "", f"🤖 Сейчас отвечает: {model_label(current)}", "", "Кто будет отвечать:"]
        for choice in MODEL_CHOICES.values():
            lines.append(f"{choice.label} — {choice.about} {choice.per_month}.")
        spent = f"💰 Потрачено сегодня: ${today.cost_usd:.2f}"
        if assistant.budget.enabled:
            spent += f" из ${assistant.budget.limit_today():.2f} (дневной лимит)"
        lines += [
            "",
            spent + f", за месяц: ${month.cost_usd:.2f}",
            "Суммы в месяц — примерная оценка для обычного дня (20 вопросов и 2 рецепта).",
            "Переключить можно в любой момент — история разговора сохранится.",
        ]
        if deps.voice is None:
            lines += ["", "🎤 Голосовые выключены — как включить, написано в README (раздел «Голос»)."]
        else:
            state = "включено" if voice_replies_on() else "выключено"
            lines += ["", f"🎤 Голосовые распознаю. Отвечать голосом на голосовые: {state}."]
        voice_flag = None if deps.voice is None else voice_replies_on()
        return "\n".join(lines), kb.settings(current, voice_flag)

    async def show_settings(message: Message, state: FSMContext) -> None:
        await state.clear()
        text, markup = settings_view()
        await message.answer(text, reply_markup=markup)

    async def show_costs(message: Message, state: FSMContext) -> None:
        await state.clear()
        now = deps.clock()
        today = storage.spent(now.strftime("%Y-%m-%d"))
        month = storage.spent(now.strftime("%Y-%m"))
        lines = [
            "💰 Расходы на Claude (примерный подсчёт)",
            f"Сейчас отвечает: {model_label(assistant.model)}",
            "",
            f"Сегодня: ${today.cost_usd:.2f} — запросов: {today.requests}",
            f"За этот месяц: ${month.cost_usd:.2f} — запросов: {month.requests}",
        ]
        if assistant.budget.enabled:
            limit = assistant.budget.limit_today()
            left = max(0.0, limit - today.cost_usd)
            extra = assistant.budget.extra_today()
            note = f" (из них +${extra:.2f} добавлено на сегодня)" if extra else ""
            lines.append(f"Дневной лимит: ${limit:.2f}{note}, осталось ${left:.2f}")
        by_kind = storage.spent_by_kind(now.strftime("%Y-%m-%d"))
        if by_kind:
            lines += ["", "Сегодня по разделам:"]
            lines += [
                f"• {KIND_LABELS.get(kind, kind)}: ${s.cost_usd:.3f} ({s.requests})"
                for kind, s in by_kind.items()
            ]
        lines += [
            "",
            "Бесплатно: покупки, напоминания, примеры для Никиты.",
            "Точная сумма — в Claude Console.",
        ]
        await message.answer("\n".join(lines))

    async def reset(message: Message, state: FSMContext) -> None:
        await state.clear()
        assistant.reset(message.chat.id)
        await message.answer(texts.RESET_TEXT, reply_markup=kb.main_menu())

    # ================= команды =================

    @router.message(Command("start"))
    async def cmd_start(message: Message, state: FSMContext) -> None:
        await show_start(message, state)

    @router.message(Command("help"))
    async def cmd_help(message: Message, state: FSMContext) -> None:
        await show_help(message, state)

    @router.message(Command("recept"))
    async def cmd_recept(message: Message, command: CommandObject, person: Person, state: FSMContext) -> None:
        await state.clear()
        if command.args:
            await recipe_search(message, person, command.args.strip())
        else:
            await recipe_start(message, state)

    @router.message(Command("pokupki"))
    async def cmd_pokupki(message: Message, state: FSMContext) -> None:
        await show_shopping(message, state)

    @router.message(Command("napomni"))
    async def cmd_napomni(
        message: Message, command: CommandObject, person: Person, state: FSMContext
    ) -> None:
        await state.clear()
        if command.args:
            await ask_claude(message, person, f"Поставь напоминание: {command.args.strip()}")
        else:
            await show_reminders(message, state)

    @router.message(Command("vyhodnye"))
    async def cmd_vyhodnye(message: Message, person: Person, state: FSMContext) -> None:
        await show_weekend(message, person, state)

    @router.message(Command("primery"))
    async def cmd_primery(message: Message, command: CommandObject, state: FSMContext) -> None:
        await state.clear()
        if not command.args:
            await show_quiz_menu(message, state)
            return
        arg = command.args.strip()
        if not arg.isdigit() or not 2 <= int(arg) <= 9:
            await message.answer(texts.PRIMERY_USAGE)
            return
        game = start_game(message.chat.id, int(arg))
        await message.answer(
            question_text(game),
            parse_mode=ParseMode.HTML,
            reply_markup=kb.quiz_options(game.id, game.options[game.index]),
        )

    @router.message(Command("skazka"))
    async def cmd_skazka(message: Message, command: CommandObject, person: Person, state: FSMContext) -> None:
        theme = f"про {command.args.strip()}" if command.args else STORY_THEMES["any"]
        await show_story(message, person, state, theme)

    @router.message(Command("settings"))
    async def cmd_settings(message: Message, state: FSMContext) -> None:
        await show_settings(message, state)

    @router.message(Command("rashod"))
    async def cmd_rashod(message: Message, state: FSMContext) -> None:
        await show_costs(message, state)

    @router.message(Command("sbros"))
    async def cmd_sbros(message: Message, state: FSMContext) -> None:
        await reset(message, state)

    # ================= кнопки главного меню =================

    @router.message(F.text == texts.BTN_RECIPE)
    async def btn_recipe(message: Message, state: FSMContext) -> None:
        await recipe_start(message, state)

    @router.message(F.text == texts.BTN_SHOPPING)
    async def btn_shopping(message: Message, state: FSMContext) -> None:
        await show_shopping(message, state)

    @router.message(F.text == texts.BTN_REMINDERS)
    async def btn_reminders(message: Message, state: FSMContext) -> None:
        await show_reminders(message, state)

    @router.message(F.text == texts.BTN_WEEKEND)
    async def btn_weekend(message: Message, person: Person, state: FSMContext) -> None:
        await show_weekend(message, person, state)

    @router.message(F.text == texts.BTN_QUIZ)
    async def btn_quiz(message: Message, state: FSMContext) -> None:
        await show_quiz_menu(message, state)

    @router.message(F.text == texts.BTN_STORY)
    async def btn_story(message: Message, person: Person, state: FSMContext) -> None:
        await show_story(message, person, state, STORY_THEMES["any"])

    @router.message(F.text == texts.BTN_NEW)
    async def btn_new(message: Message, state: FSMContext) -> None:
        await reset(message, state)

    @router.message(F.text == texts.BTN_SETTINGS)
    async def btn_settings(message: Message, state: FSMContext) -> None:
        await show_settings(message, state)

    # ================= ожидание ввода (после кнопок) =================

    @router.message(StateFilter(Forms.recipe_query), F.text, ~F.text.startswith("/"))
    async def got_recipe_query(message: Message, person: Person, state: FSMContext) -> None:
        await state.clear()
        await recipe_search(message, person, message.text.strip())

    @router.message(StateFilter(Forms.shopping_items), F.text, ~F.text.startswith("/"))
    async def got_shopping_items(message: Message, person: Person, state: FSMContext) -> None:
        await state.clear()
        added = storage.add_shopping(_parse_items(message.text), added_by=person.name)
        note = "Добавил: " + ", ".join(added) if added else "Это уже есть в списке."
        text, markup = shopping_view()
        await message.answer(f"{note}\n\n{text}", reply_markup=markup)

    # ================= прочие сообщения =================

    @router.message(F.text.startswith("/"))
    async def unknown_command(message: Message, bot: Bot) -> None:
        command = message.text.split()[0]
        if "@" in command:
            me = await bot.me()
            if command.split("@", 1)[1].lower() != (me.username or "").lower():
                return  # в группе это команда для другого бота — молчим
        await message.answer(texts.UNKNOWN_COMMAND_TEXT)

    @router.message(F.text)
    async def dialog(message: Message, person: Person) -> None:
        await ask_claude(message, person, message.text)

    @router.message(F.voice)
    async def voice_message(message: Message, person: Person, bot: Bot, state: FSMContext) -> None:
        if deps.voice is None:
            await message.answer(texts.VOICE_DISABLED)
            return
        if message.voice.duration > MAX_VOICE_SECONDS:
            await message.answer(texts.VOICE_TOO_LONG)
            return
        waiting_for = await state.get_state()  # например, бот ждал «что приготовить?»
        await state.clear()
        try:
            async with ChatActionSender.typing(chat_id=message.chat.id, bot=bot):
                audio = await bot.download(message.voice)
                text = await deps.voice.transcribe(audio.getvalue())
        except Exception:
            log.exception("Не удалось распознать голосовое")
            await message.answer(texts.VOICE_STT_FAILED)
            return
        if not text:
            await message.answer(texts.VOICE_EMPTY)
            return
        await message.answer(f"🎤 «{text}»")
        if waiting_for == Forms.recipe_query.state:
            await recipe_search(message, person, text)
        elif waiting_for == Forms.shopping_items.state:
            added = storage.add_shopping(_parse_items(text), added_by=person.name)
            view_text, markup = shopping_view()
            note = "Добавил: " + ", ".join(added) if added else "Это уже есть в списке."
            await message.answer(f"{note}\n\n{view_text}", reply_markup=markup)
        else:
            await ask_claude(message, person, text, voice_reply=True)

    @router.message()
    async def not_text(message: Message) -> None:
        await message.answer(texts.ONLY_TEXT)

    # ================= кнопки под сообщениями =================

    @router.callback_query(F.data.startswith("rq:"))
    async def cb_recipe_preset(callback: CallbackQuery, person: Person, state: FSMContext) -> None:
        await callback.answer()
        message = _message_of(callback)
        preset = RECIPE_PRESETS.get(callback.data.split(":", 1)[1])
        if message is None or preset is None:
            return
        await state.clear()
        await recipe_search(message, person, preset)

    @router.callback_query(F.data.startswith("rcp:"))
    async def cb_recipe(callback: CallbackQuery, person: Person) -> None:
        _, action, raw_id = callback.data.split(":")
        saved = storage.recipe(int(raw_id))
        message = _message_of(callback)
        if saved is None or message is None:
            await callback.answer("Рецепт не найден, попробуйте найти заново.", show_alert=True)
            return
        if action == "add":
            added = storage.add_shopping(saved.ingredients, added_by=person.name)
            await callback.answer(f"Добавлено в покупки: {len(added)}")
            try:
                await message.edit_reply_markup(reply_markup=kb.recipe_actions(saved.id, added=True))
            except TelegramBadRequest:
                pass
        elif action == "noop":
            await callback.answer("Продукты уже в списке покупок 🛒")
        elif action == "more":
            await callback.answer()
            await recipe_search(message, person, saved.query, exclude=saved.title)

    @router.callback_query(F.data.startswith("shop:"))
    async def cb_shopping(callback: CallbackQuery, state: FSMContext) -> None:
        message = _message_of(callback)
        parts = callback.data.split(":")
        if message is None:
            await callback.answer()
            return
        if parts[1] == "add":
            await callback.answer()
            await state.set_state(Forms.shopping_items)
            await message.answer(texts.SHOPPING_ASK)
            return
        if parts[1] == "t":
            item = storage.toggle_bought(int(parts[2]))
            await callback.answer(
                ("✅ Куплено: " if item and item.bought else "Вернул в список: ")
                + (item.text if item else "")
            )
        elif parts[1] == "clear":
            removed = storage.clear_bought()
            await callback.answer(f"Убрано купленного: {removed}")
        text, markup = shopping_view()
        await _safe_edit(message, text, markup)

    @router.callback_query(F.data.startswith("rem:"))
    async def cb_reminder(callback: CallbackQuery) -> None:
        message = _message_of(callback)
        parts = callback.data.split(":")
        reminder = storage.reminder(int(parts[2]))
        chat_id = message.chat.id if message else 0
        if reminder is None or chat_id not in (reminder.chat_id, reminder.created_by_chat) or message is None:
            await callback.answer("Напоминание не найдено.", show_alert=True)
            return
        action = parts[1]
        if reminder.is_recurring and action in ("ok", "done"):
            await callback.answer("👍")
            await message.edit_reply_markup(reply_markup=None)
            return
        if reminder.is_recurring and action == "snz":
            await callback.answer(
                "Повторяющееся напоминание отложить нельзя — только отключить 🔕", show_alert=True
            )
            return
        if action == "stop":
            storage.set_reminder_status(reminder.id, "cancelled")
            await callback.answer("Больше не пришлю")
            await message.edit_reply_markup(reply_markup=None)
            await message.answer(f"🔕 Отключил: «{reminder.text}». Включить снова — просто попросите.")
            return
        if action == "del":
            storage.set_reminder_status(reminder.id, "cancelled")
            await callback.answer("Удалено")
            text, markup = reminders_view(chat_id)
            await _safe_edit(message, text, markup)
        elif action == "done":
            storage.set_reminder_status(reminder.id, "done")
            await callback.answer("Отлично! 👍")
            await _safe_edit(message, f"✅ Сделано: {reminder.text}", None)
        elif action == "snz":
            now = deps.clock()
            due = now + timedelta(minutes=int(parts[3]))
            storage.reschedule(reminder.id, int(due.timestamp()))
            await callback.answer("Отложено")
            await _safe_edit(message, f"⏰ Напомню {format_when(due, now)}: {reminder.text}", None)

    @router.callback_query(F.data.startswith("quiz:"))
    async def cb_quiz(callback: CallbackQuery) -> None:
        message = _message_of(callback)
        if message is None:
            await callback.answer()
            return
        parts = callback.data.split(":")
        action, chat_id = parts[1], message.chat.id

        if action == "menu":
            await callback.answer()
            await _safe_edit(message, texts.QUIZ_MENU, kb.quiz_menu())
        elif action == "list":
            await callback.answer()
            await message.answer(format_examples(make_examples()), parse_mode=ParseMode.HTML)
        elif action == "new":
            await callback.answer("Поехали! 🚀")
            game = start_game(chat_id, int(parts[2]) or None)
            await _safe_edit(
                message, question_text(game), kb.quiz_options(game.id, game.options[0]), html=True
            )
        elif action == "a":
            game = deps.quiz_games.get(chat_id)
            if game is None or game.id != parts[2] or game.finished:
                await callback.answer(texts.QUIZ_EXPIRED, show_alert=True)
                return
            example = game.current
            if game.answer(int(parts[3])):
                feedback = f"✅ Верно! {example.a} × {example.b} = {example.answer}"
                await callback.answer("Верно! ✅")
            else:
                feedback = f"❌ Почти! {example.a} × {example.b} = {example.answer}"
                await callback.answer(f"Правильно: {example.answer}")
            if game.finished:
                deps.quiz_games.pop(chat_id, None)
                await _safe_edit(
                    message, result_text(game, feedback), kb.quiz_finished(game.table), html=True
                )
            else:
                await _safe_edit(
                    message,
                    question_text(game, feedback),
                    kb.quiz_options(game.id, game.options[game.index]),
                    html=True,
                )

    @router.callback_query(F.data.startswith("story:"))
    async def cb_story(callback: CallbackQuery, person: Person, state: FSMContext) -> None:
        await callback.answer()
        message = _message_of(callback)
        if message is not None:
            theme = STORY_THEMES.get(callback.data.split(":", 1)[1], STORY_THEMES["any"])
            await show_story(message, person, state, theme)

    @router.callback_query(F.data.startswith("set:"))
    async def cb_settings(callback: CallbackQuery, person: Person, state: FSMContext) -> None:
        message = _message_of(callback)
        parts = callback.data.split(":")
        if message is None:
            await callback.answer()
            return
        if parts[1] == "costs":
            await callback.answer()
            await show_costs(message, state)
            return
        if parts[1] == "voice":
            if deps.voice is None:
                await callback.answer(texts.VOICE_DISABLED, show_alert=True)
                return
            turn_on = not voice_replies_on()
            storage.set_setting(VOICE_SETTING, "1" if turn_on else "0")
            await callback.answer("Буду отвечать голосом 🔊" if turn_on else "Отвечаю только текстом")
            text, markup = settings_view()
            await _safe_edit(message, text, markup)
            return
        choice = MODEL_CHOICES.get(parts[2]) if len(parts) > 2 else None
        if choice is None:
            await callback.answer("Такой модели нет.", show_alert=True)
            return
        if assistant.model == choice.model_id:
            await callback.answer(f"Уже отвечает {choice.label}")
            return
        assistant.set_model(choice.model_id)
        log.info("%s выбрал(а) модель %s", person.name, choice.model_id)
        await callback.answer(f"Готово! Теперь отвечает {choice.label}")
        text, markup = settings_view()
        await _safe_edit(message, text, markup)

    @router.callback_query(F.data.startswith("tts:"))
    async def cb_read_aloud(callback: CallbackQuery) -> None:
        message = _message_of(callback)
        saved = storage.text(int(callback.data.split(":", 1)[1]))
        if message is None or saved is None or saved[0] != message.chat.id:
            await callback.answer("Текст не найден.", show_alert=True)
            return
        if deps.voice is None:
            await callback.answer(texts.VOICE_DISABLED, show_alert=True)
            return
        await callback.answer("Читаю вслух… 🔊")
        await send_voice(message, saved[1])

    @router.callback_query(F.data.startswith("budget:"))
    async def cb_budget(callback: CallbackQuery, person: Person) -> None:
        if deps.admin_id is None or person.user_id != deps.admin_id:
            await callback.answer("Поднять лимит может только хозяин бота.", show_alert=True)
            return
        cents = int(callback.data.split(":")[2])
        limit = assistant.budget.extend_today(cents / 100)
        log.info("%s поднял(а) лимит на сегодня до $%.2f", person.name, limit)
        await callback.answer(f"Готово! Лимит на сегодня: ${limit:.2f}")
        message = _message_of(callback)
        if message is not None:
            await _safe_edit(
                message,
                f"✅ Лимит на сегодня поднят до ${limit:.2f}. Claude снова отвечает.",
                None,
            )

    @router.callback_query(F.data.startswith("media:"))
    async def cb_media(callback: CallbackQuery, person: Person, state: FSMContext) -> None:
        await callback.answer()
        message = _message_of(callback)
        kind = callback.data.split(":", 1)[1]
        if message is None or kind not in texts.MEDIA_SEARCHING:
            return
        await state.clear()
        await ask_claude(
            message,
            person,
            build_media_request(kind),
            "media",
            status=texts.MEDIA_SEARCHING[kind],
            markup=kb.story(),
        )

    @router.callback_query(F.data.startswith("wk:"))
    async def cb_weekend(callback: CallbackQuery, person: Person, state: FSMContext) -> None:
        await callback.answer()
        message = _message_of(callback)
        if message is not None:
            await show_weekend(message, person, state, callback.data.split(":", 1)[1])

    return router
