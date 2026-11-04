"""Запуск бота: python -m admin_bot"""

from __future__ import annotations

import asyncio
import logging
import sys

import anthropic
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from .ai import AIAssistant
from .booking import BookingService
from .business import ConfigError, load_business
from .handlers import create_router
from .notify import TelegramNotifier
from .settings import Settings, SettingsError
from .storage import Storage

log = logging.getLogger("admin_bot")

COMMANDS = [
    BotCommand(command="start", description="Начать"),
    BotCommand(command="book", description="Записаться"),
    BotCommand(command="help", description="Что умеет бот"),
    BotCommand(command="delete_my_data", description="Удалить мои данные"),
]


async def run() -> None:
    settings = Settings.from_env()
    business = load_business(settings.business_config)
    db = Storage(settings.db_path, business.schedule.tz)

    bot = Bot(token=settings.telegram_token)
    notifier = TelegramNotifier(bot, settings.owner_chat_id)
    booking = BookingService(business, db, notifier)
    assistant = AIAssistant(
        anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key),
        business,
        booking,
        db,
        model=settings.model,
        effort=settings.effort,
        history_messages=settings.history_messages,
    )

    # Всё, что передаём в Dispatcher, aiogram подставляет в обработчики по имени параметра.
    dp = Dispatcher(
        storage=MemoryStorage(),
        db=db,
        business=business,
        booking=booking,
        assistant=assistant,
        settings=settings,
    )
    dp.include_router(create_router())

    if settings.owner_chat_id is None:
        log.warning("OWNER_CHAT_ID не задан: заявки не будут приходить владельцу. Напишите боту /myid.")
    log.info("Бот «%s» запущен. Модель: %s. Конфиг: %s", business.name, settings.model, settings.business_config)
    await bot.set_my_commands(COMMANDS)
    try:
        await dp.start_polling(bot)
    finally:
        db.close()
        await bot.session.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        asyncio.run(run())
    except (SettingsError, ConfigError) as exc:
        print(f"Ошибка настройки: {exc}", file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
