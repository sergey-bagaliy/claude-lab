"""Сборка и запуск бота."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import sys
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler

import anthropic
from aiogram import Bot, Dispatcher
from aiogram.exceptions import TelegramAPIError, TelegramNetworkError, TelegramUnauthorizedError
from aiogram.types import BotCommand
from aiogram.utils.token import TokenValidationError

from .assistant import FamilyAssistant
from .backup import BackupService
from .budget import BudgetNotifier
from .config import ConfigError, Settings, load_settings
from .handlers import Deps, create_router
from .media import WikimediaPhotos
from .reminders import ReminderService
from .storage import Storage
from .timeutil import TZ, now_local
from .voice import create_voice_service

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
    "• понимает голосовые и отвечает голосом\n"
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
    assistant.on_budget_event = BudgetNotifier(bot, settings.admin_user_id)
    voice = create_voice_service(
        settings.voice, settings.whisper_model, settings.piper_voice, settings.models_dir
    )
    backups = BackupService(
        storage,
        settings.backup_dir,
        keep_days=settings.backup_keep_days,
        bot=bot,
        admin_id=settings.admin_user_id,
        send_to_admin=settings.backup_to_telegram,
    )
    deps = Deps(
        assistant=assistant, storage=storage, clock=now_local, voice=voice, admin_id=settings.admin_user_id
    )
    dispatcher = build_dispatcher(deps, settings)
    background: list[asyncio.Task[None]] = []

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
        background.append(
            asyncio.create_task(ReminderService(bot, storage, assistant=assistant).run_forever())
        )
        background.append(asyncio.create_task(backups.run_forever()))
        if voice is not None:
            background.append(asyncio.create_task(voice.warm_up()))

        log.info("Бот @%s запущен. Модель: %s. Остановить: Ctrl+C", me.username, settings.model)
        if not settings.allowed_user_ids:
            log.warning(
                "ALLOWED_USER_IDS не задан: бот отвечает ВСЕМ, кто его найдёт. "
                "Чтобы пускать только семью, задайте эту переменную (см. README)."
            )
        if settings.admin_user_id is None:
            log.warning("ADMIN_USER_ID не задан: уведомления о расходах никому не придут (см. README).")
        await dispatcher.start_polling(bot)
    finally:
        for task in background:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        await bot.session.close()
        await client.close()
        await photos.close()
        storage.close()


def _moscow_time(seconds: float | None) -> time.struct_time:
    """Время в журнале — по Москве, где бы ни работал бот (сервер часто живёт по UTC)."""
    return datetime.fromtimestamp(seconds if seconds is not None else time.time(), TZ).timetuple()


def setup_logging(log_file: str = "bot.log") -> None:
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    formatter.converter = _moscow_time
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    handlers: list[logging.Handler] = [console]
    if log_file:
        # Журнал в файл (до 3 файлов по 1 МБ) — пригодится, если что-то пошло не так.
        file = RotatingFileHandler(log_file, maxBytes=1_000_000, backupCount=3, encoding="utf-8")
        file.setFormatter(formatter)
        handlers.append(file)
    logging.basicConfig(level=logging.INFO, handlers=handlers)
    # Библиотека httpx2 пишет в лог каждый запрос — для новичка это лишний шум.
    logging.getLogger("httpx2").setLevel(logging.WARNING)


def main() -> None:
    try:
        settings = load_settings()
    except ConfigError as error:
        print(f"Ошибка настройки: {error}", file=sys.stderr)
        sys.exit(1)

    setup_logging(settings.log_file)
    try:
        asyncio.run(run(settings))
    except StartupError as error:
        print(f"Бот не запустился: {error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Бот остановлен.")
