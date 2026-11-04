"""Сборка и запуск бота."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import sys
from logging.handlers import RotatingFileHandler

import anthropic
from aiogram import Bot, Dispatcher
from aiogram.exceptions import TelegramAPIError, TelegramNetworkError, TelegramUnauthorizedError
from aiogram.types import BotCommand
from aiogram.utils.token import TokenValidationError

from .assistant import FamilyAssistant
from .config import ConfigError, Settings, load_settings
from .handlers import Deps, create_router
from .media import WikimediaPhotos
from .reminders import ReminderService
from .storage import Storage
from .timeutil import now_local

log = logging.getLogger(__name__)

BOT_COMMANDS = [
    BotCommand(command="recept", description="🍲 Рецепт с фото"),
    BotCommand(command="pokupki", description="🛒 Список покупок"),
    BotCommand(command="napomni", description="⏰ Напоминания"),
    BotCommand(command="vyhodnye", description="🌳 Идеи на выходные"),
    BotCommand(command="primery", description="🧮 Тренажёр умножения для Никиты"),
    BotCommand(command="skazka", description="📖 Сказка для Кати"),
    BotCommand(command="settings", description="⚙️ Настройки: Haiku или Sonnet"),
    BotCommand(command="rashod", description="💰 Расходы на Claude"),
    BotCommand(command="sbros", description="🧹 Новый разговор"),
    BotCommand(command="help", description="❓ Что умеет бот"),
]

# Описание в профиле бота: его видно до нажатия «Старт».
BOT_DESCRIPTION = (
    "Семейный помощник 🏠\n\n"
    "• рецепты с фото и продукты сразу в список покупок\n"
    "• общий список покупок для всей семьи\n"
    "• напоминания обычной фразой — себе и близким\n"
    "• тренажёр умножения для Никиты, сказки, аудиосказки и мультфильмы для Кати\n"
    "• фото курортов и интересных мест\n"
    "• идеи на выходные с учётом погоды в Краснодаре"
)
BOT_SHORT_DESCRIPTION = "Рецепты, покупки, напоминания и помощь с детьми для нашей семьи"


class StartupError(Exception):
    """Бот не смог запуститься; текст ошибки понятен человеку."""


def build_dispatcher(deps: Deps, settings: Settings) -> Dispatcher:
    dispatcher = Dispatcher()
    dispatcher.include_router(create_router(deps, settings.allowed_user_ids))
    return dispatcher


async def setup_profile(bot: Bot) -> None:
    """Меню команд и описание бота. Если не получилось — не страшно, бот работает и так."""
    try:
        await bot.set_my_commands(BOT_COMMANDS)
        await bot.set_my_description(BOT_DESCRIPTION)
        await bot.set_my_short_description(BOT_SHORT_DESCRIPTION)
    except TelegramAPIError as error:
        log.warning("Не удалось обновить профиль бота: %s", error)


async def run(settings: Settings) -> None:
    try:
        bot = Bot(token=settings.telegram_token)
    except TokenValidationError:
        raise StartupError(
            "TELEGRAM_BOT_TOKEN не похож на токен бота. Он выглядит как "
            "«1234567890:AA...» — скопируйте его целиком из сообщения @BotFather."
        ) from None

    storage = Storage(settings.db_path)
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    photos = WikimediaPhotos()
    assistant = FamilyAssistant(
        client=client,
        storage=storage,
        model=settings.model,
        memory_size=settings.memory_size,
        daily_budget_usd=settings.daily_budget_usd,
        web_search=settings.web_search,
        clock=now_local,
        photos=photos,
    )
    deps = Deps(
        assistant=assistant, storage=storage, clock=now_local, daily_budget_usd=settings.daily_budget_usd
    )
    dispatcher = build_dispatcher(deps, settings)
    reminders_task: asyncio.Task[None] | None = None

    try:
        try:
            me = await bot.get_me()
        except TelegramUnauthorizedError:
            raise StartupError(
                "Telegram не принял токен. Проверьте TELEGRAM_BOT_TOKEN — "
                "скопируйте его заново у @BotFather (команда /mybots → API Token)."
            ) from None
        except TelegramNetworkError as error:
            raise StartupError(
                f"Не получилось подключиться к Telegram. Проверьте интернет.\n{error}"
            ) from None

        await setup_profile(bot)
        reminders_task = asyncio.create_task(ReminderService(bot, storage).run_forever())

        log.info("Бот @%s запущен. Модель: %s. Остановить: Ctrl+C", me.username, settings.model)
        if not settings.allowed_user_ids:
            log.warning(
                "ALLOWED_USER_IDS не задан: бот отвечает ВСЕМ, кто его найдёт. "
                "Чтобы пускать только семью, задайте эту переменную (см. README)."
            )
        await dispatcher.start_polling(bot)
    finally:
        if reminders_task is not None:
            reminders_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await reminders_task
        await bot.session.close()
        await client.close()
        await photos.close()
        storage.close()


def setup_logging() -> None:
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    # Журнал в файл bot.log (до 3 файлов по 1 МБ) — пригодится, если что-то пошло не так.
    file = RotatingFileHandler("bot.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    file.setFormatter(formatter)
    logging.basicConfig(level=logging.INFO, handlers=[console, file])
    # Библиотека httpx2 пишет в лог каждый запрос — для новичка это лишний шум.
    logging.getLogger("httpx2").setLevel(logging.WARNING)


def main() -> None:
    try:
        settings = load_settings()
    except ConfigError as error:
        print(f"Ошибка настройки: {error}", file=sys.stderr)
        sys.exit(1)

    setup_logging()
    try:
        asyncio.run(run(settings))
    except StartupError as error:
        print(f"Бот не запустился: {error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Бот остановлен.")
