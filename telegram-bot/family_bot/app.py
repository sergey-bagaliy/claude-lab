"""Сборка и запуск бота."""

from __future__ import annotations

import asyncio
import logging
import sys

import anthropic
from aiogram import Bot, Dispatcher
from aiogram.exceptions import TelegramNetworkError, TelegramUnauthorizedError
from aiogram.types import BotCommand
from aiogram.utils.token import TokenValidationError

from .assistant import FamilyAssistant
from .config import ConfigError, Settings, load_settings
from .handlers import create_router
from .memory import ChatMemory

log = logging.getLogger(__name__)

BOT_COMMANDS = [
    BotCommand(command="primery", description="10 примеров на умножение для Никиты"),
    BotCommand(command="vyhodnye", description="Идеи на выходные для всей семьи"),
    BotCommand(command="sbros", description="Забыть историю разговора"),
    BotCommand(command="start", description="Что умеет бот"),
]


class StartupError(Exception):
    """Бот не смог запуститься; текст ошибки понятен человеку."""


def build_dispatcher(assistant: FamilyAssistant, settings: Settings) -> Dispatcher:
    dispatcher = Dispatcher()
    dispatcher.include_router(create_router(assistant, settings.allowed_user_ids))
    return dispatcher


async def run(settings: Settings) -> None:
    try:
        bot = Bot(token=settings.telegram_token)
    except TokenValidationError:
        raise StartupError(
            "TELEGRAM_BOT_TOKEN не похож на токен бота. Он выглядит как "
            "«1234567890:AA...» — скопируйте его целиком из сообщения @BotFather."
        ) from None
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    assistant = FamilyAssistant(client, settings.model, ChatMemory(settings.memory_size))
    dispatcher = build_dispatcher(assistant, settings)

    try:
        try:
            me = await bot.get_me()
            await bot.set_my_commands(BOT_COMMANDS)  # меню команд в Telegram
        except TelegramUnauthorizedError:
            raise StartupError(
                "Telegram не принял токен. Проверьте TELEGRAM_BOT_TOKEN — "
                "скопируйте его заново у @BotFather (команда /mybots → API Token)."
            ) from None
        except TelegramNetworkError as error:
            raise StartupError(
                f"Не получилось подключиться к Telegram. Проверьте интернет.\n{error}"
            ) from None

        log.info("Бот @%s запущен. Модель: %s. Остановить: Ctrl+C", me.username, settings.model)
        if not settings.allowed_user_ids:
            log.warning(
                "ALLOWED_USER_IDS не задан: бот отвечает ВСЕМ, кто его найдёт. "
                "Чтобы пускать только семью, задайте эту переменную (см. README)."
            )
        await dispatcher.start_polling(bot)
    finally:
        await bot.session.close()
        await client.close()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # Библиотека httpx2 пишет в лог каждый запрос — для новичка это лишний шум.
    logging.getLogger("httpx2").setLevel(logging.WARNING)

    try:
        settings = load_settings()
    except ConfigError as error:
        print(f"Ошибка настройки: {error}", file=sys.stderr)
        sys.exit(1)

    try:
        asyncio.run(run(settings))
    except StartupError as error:
        print(f"Бот не запустился: {error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Бот остановлен.")
