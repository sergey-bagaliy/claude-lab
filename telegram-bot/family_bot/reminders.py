"""Отправка напоминаний: раз в 20 секунд проверяем, не пора ли что-то напомнить."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import datetime

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError

from . import keyboards as kb
from .storage import Reminder, Storage
from .timeutil import format_when, from_ts, now_local

log = logging.getLogger(__name__)

LATE_AFTER_SECONDS = 5 * 60


class ReminderService:
    def __init__(
        self,
        bot: Bot,
        storage: Storage,
        clock: Callable[[], datetime] = now_local,
        interval: float = 20.0,
    ) -> None:
        self.bot = bot
        self.storage = storage
        self.clock = clock
        self.interval = interval

    def _text(self, reminder: Reminder, now: datetime) -> str:
        text = f"⏰ Напоминание: {reminder.text}"
        if reminder.created_by_chat != reminder.chat_id and reminder.created_by:
            text += f"\nОт: {reminder.created_by}"
        if now.timestamp() - reminder.due_at > LATE_AFTER_SECONDS:
            text += f"\nДолжно было прийти {format_when(from_ts(reminder.due_at), now)} — бот был выключен."
        return text

    async def tick(self) -> int:
        """Отправляет все напоминания, время которых пришло. Возвращает, сколько отправлено."""
        now = self.clock()
        sent = 0
        for reminder in self.storage.due_reminders(int(now.timestamp())):
            try:
                await self.bot.send_message(
                    reminder.chat_id, self._text(reminder, now), reply_markup=kb.reminder_alert(reminder.id)
                )
            except (TelegramForbiddenError, TelegramBadRequest) as error:
                # Человек заблокировал бота или чата нет — повторять бессмысленно.
                log.warning("Напоминание %s не доставлено: %s", reminder.id, error)
                self.storage.set_reminder_status(reminder.id, "failed")
                continue
            except Exception:
                # Например, пропал интернет — попробуем в следующий раз.
                log.exception("Не удалось отправить напоминание %s, повторю позже", reminder.id)
                continue
            self.storage.set_reminder_status(reminder.id, "sent")
            sent += 1
        return sent

    async def run_forever(self) -> None:
        log.info("Служба напоминаний запущена")
        while True:
            try:
                await self.tick()
            except Exception:
                log.exception("Ошибка в службе напоминаний")
            await asyncio.sleep(self.interval)
