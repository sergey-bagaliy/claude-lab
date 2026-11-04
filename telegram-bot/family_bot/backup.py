"""Ежедневная резервная копия базы.

Каждый день в 03:30 по Москве (и сразу при запуске, если сегодняшней копии ещё нет)
бот сохраняет копию family_bot.db в папку backups и удаляет копии старше 14 дней.
По желанию (BACKUP_TO_TELEGRAM=1) копия отправляется хозяину бота в Telegram —
тогда она переживёт даже поломку сервера.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import FSInputFile

from .storage import Storage
from .timeutil import MONTHS, now_local

log = logging.getLogger(__name__)

BACKUP_HOUR, BACKUP_MINUTE = 3, 30
PREFIX = "family_bot-"


class BackupService:
    def __init__(
        self,
        storage: Storage,
        backup_dir: str | Path,
        keep_days: int = 14,
        clock: Callable[[], datetime] = now_local,
        bot: Bot | None = None,
        admin_id: int | None = None,
        send_to_admin: bool = False,
    ) -> None:
        self.storage = storage
        self.backup_dir = Path(backup_dir)
        self.keep_days = keep_days
        self.clock = clock
        self.bot = bot
        self.admin_id = admin_id
        self.send_to_admin = send_to_admin

    def path_for(self, day: date) -> Path:
        return self.backup_dir / f"{PREFIX}{day:%Y-%m-%d}.db"

    def make_backup(self) -> Path:
        """Копия базы за сегодня (перезаписывается, если уже есть) + удаление старых."""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        path = self.path_for(self.clock().date())
        self.storage.backup_to(path)
        self.rotate()
        log.info("Резервная копия базы: %s", path)
        return path

    def rotate(self) -> list[Path]:
        oldest = self.clock().date() - timedelta(days=self.keep_days - 1)
        removed = []
        for path in self.backup_dir.glob(f"{PREFIX}*.db"):
            try:
                day = date.fromisoformat(path.stem.removeprefix(PREFIX))
            except ValueError:
                continue  # чужой файл — не трогаем
            if day < oldest:
                path.unlink()
                removed.append(path)
        return removed

    def seconds_until_next_run(self) -> float:
        now = self.clock()
        run = now.replace(hour=BACKUP_HOUR, minute=BACKUP_MINUTE, second=0, microsecond=0)
        if run <= now:
            run += timedelta(days=1)
        return (run - now).total_seconds()

    async def backup_and_send(self) -> Path:
        # Копия делается в основном потоке: SQLite не разрешает работать с базой из другого потока,
        # а маленькая база копируется за миллисекунды.
        path = self.make_backup()
        if self.send_to_admin and self.bot is not None and self.admin_id is not None:
            day = self.clock().date()
            try:
                await self.bot.send_document(
                    self.admin_id,
                    FSInputFile(path),
                    caption=f"💾 Резервная копия базы бота за {day.day} {MONTHS[day.month - 1]}",
                    disable_notification=True,
                )
            except TelegramAPIError as error:
                log.warning("Не удалось отправить копию базы в Telegram: %s", error)
        return path

    async def run_forever(self) -> None:
        log.info(
            "Резервное копирование: каждый день в %02d:%02d, папка %s",
            BACKUP_HOUR,
            BACKUP_MINUTE,
            self.backup_dir,
        )
        if not self.path_for(self.clock().date()).exists():
            await self._safe_backup()
        while True:
            await asyncio.sleep(self.seconds_until_next_run())
            await self._safe_backup()

    async def _safe_backup(self) -> None:
        try:
            await self.backup_and_send()
        except Exception:
            log.exception("Резервное копирование не удалось")
