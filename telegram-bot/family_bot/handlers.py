"""Обработчики команд и сообщений Telegram (aiogram 3)."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware, F, Router
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandObject
from aiogram.types import Message, TelegramObject
from aiogram.utils.chat_action import ChatActionSender

from . import texts
from .assistant import AssistantError, FamilyAssistant
from .multiplication import format_examples, make_examples

log = logging.getLogger(__name__)


class AccessMiddleware(BaseMiddleware):
    """Пускает только людей из списка ALLOWED_USER_IDS (если список задан).

    Без списка бот отвечает всем, кто его найдёт, — и тратит ваши деньги на API.
    """

    def __init__(self, allowed_user_ids: frozenset[int]) -> None:
        self.allowed_user_ids = allowed_user_ids

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if not self.allowed_user_ids or not isinstance(event, Message):
            return await handler(event, data)

        user = event.from_user
        if user is None or user.id not in self.allowed_user_ids:
            user_id = user.id if user else 0
            log.info("Отказано в доступе пользователю %s", user_id)
            await event.answer(texts.access_denied_text(user_id))
            return None
        return await handler(event, data)


async def _send_long(message: Message, text: str) -> None:
    # Ответ Claude отправляем как обычный текст (без HTML/Markdown),
    # чтобы спецсимволы в ответе не ломали отправку.
    for part in texts.split_message(text):
        await message.answer(part, parse_mode=None)


def create_router(assistant: FamilyAssistant, allowed_user_ids: frozenset[int]) -> Router:
    router = Router(name="family")
    router.message.outer_middleware(AccessMiddleware(allowed_user_ids))

    @router.message(Command("start", "help"))
    async def cmd_start(message: Message) -> None:
        await message.answer(texts.START_TEXT)

    @router.message(Command("primery"))
    async def cmd_primery(message: Message, command: CommandObject) -> None:
        table: int | None = None
        if command.args:
            arg = command.args.strip()
            if not arg.isdigit() or not 2 <= int(arg) <= 9:
                await message.answer(texts.PRIMERY_USAGE)
                return
            table = int(arg)

        examples = make_examples(count=10, table=table)
        await message.answer(format_examples(examples, table), parse_mode=ParseMode.HTML)

    @router.message(Command("vyhodnye"))
    async def cmd_vyhodnye(message: Message) -> None:
        await message.answer("Подбираю идеи на выходные, минутку… 🌳")
        await _reply_from_claude(message, lambda: assistant.weekend_ideas(message.chat.id))

    @router.message(Command("sbros"))
    async def cmd_sbros(message: Message) -> None:
        assistant.reset(message.chat.id)
        await message.answer(texts.RESET_TEXT)

    @router.message(F.text.startswith("/"))
    async def unknown_command(message: Message) -> None:
        await message.answer(texts.UNKNOWN_COMMAND_TEXT)

    @router.message(F.text)
    async def dialog(message: Message) -> None:
        await _reply_from_claude(message, lambda: assistant.ask(message.chat.id, message.text))

    @router.message()
    async def not_text(message: Message) -> None:
        await message.answer(texts.ONLY_TEXT)

    return router


async def _reply_from_claude(message: Message, ask: Callable[[], Awaitable[str]]) -> None:
    try:
        # Пока Claude думает, в чате видно «печатает…».
        async with ChatActionSender.typing(chat_id=message.chat.id, bot=message.bot):
            reply = await ask()
    except AssistantError as error:
        await message.answer(f"⚠️ {error}")
        return
    except Exception:
        log.exception("Неожиданная ошибка при ответе")
        await message.answer("⚠️ Что-то пошло не так. Попробуйте ещё раз чуть позже.")
        return
    await _send_long(message, reply)
