"""Отправка напоминаний: раз в 20 секунд проверяем, не пора ли что-то напомнить.

• Разовое напоминание отправляется один раз.
• Повторяющееся («каждое утро в 8:00») после отправки переносится на следующий подходящий день.
• «Рассылка» (generate) — каждый раз Claude готовит новый текст: интересный факт, мотивацию, погоду.
Если бот был выключен несколько дней, пропущенное повторяющееся напоминание придёт один раз, а не пачкой.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import datetime
from typing import TYPE_CHECKING

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.types import LinkPreviewOptions

from . import keyboards as kb
from .schedule import describe_schedule, next_occurrence
from .storage import Reminder, Storage
from .timeutil import format_when, from_ts, now_local

if TYPE_CHECKING:
    from .assistant import FamilyAssistant

log = logging.getLogger(__name__)

LATE_AFTER_SECONDS = 5 * 60


class ReminderService:
    def __init__(
        self,
        bot: Bot,
        storage: Storage,
        clock: Callable[[], datetime] = now_local,
        interval: float = 20.0,
        assistant: FamilyAssistant | None = None,
    ) -> None:
        self.bot = bot
        self.storage = storage
        self.clock = clock
        self.interval = interval
        self.assistant = assistant  # нужен для рассылок, где текст каждый раз готовит Claude

    def _footer(self, reminder: Reminder, now: datetime) -> str:
        lines = []
        if reminder.created_by_chat != reminder.chat_id and reminder.created_by:
            lines.append(f"От: {reminder.created_by}")
        if now.timestamp() - reminder.due_at > LATE_AFTER_SECONDS:
            lines.append(
                f"Должно было прийти {format_when(from_ts(reminder.due_at), now)} — бот был выключен."
            )
        return "\n" + "\n".join(lines) if lines else ""

    async def _generated_text(self, reminder: Reminder) -> str:
        """Новый выпуск рассылки от Claude. Если не вышло — объясняем почему."""
        title = reminder.text[:1].upper() + reminder.text[1:]
        if self.assistant is None:
            return f"📬 {title}"
        names = {m.chat_id: m.first_name for m in self.storage.members()}
        recipient = names.get(reminder.chat_id, reminder.created_by or "член семьи")
        schedule = describe_schedule(reminder.repeat_days, from_ts(reminder.due_at))
        try:
            content = await self.assistant.scheduled_message(
                reminder.chat_id, recipient, reminder.text, schedule, reminder.last_texts
            )
        except Exception as error:
            log.warning("Выпуск рассылки %s не готов: %s", reminder.id, error)
            return f"📬 {title}\n\nСегодня без нового выпуска: {error}"
        self.storage.remember_text(reminder.id, content)
        return f"📬 {title}\n\n{content}"

    async def _message(self, reminder: Reminder, now: datetime) -> str:
        if reminder.generate:
            return await self._generated_text(reminder) + self._footer(reminder, now)
        icon = "🔁" if reminder.is_recurring else "⏰"
        return f"{icon} Напоминание: {reminder.text}" + self._footer(reminder, now)

    def _after_sent(self, reminder: Reminder, now: datetime) -> None:
        if not reminder.is_recurring:
            self.storage.set_reminder_status(reminder.id, "sent")
            return
        moment = from_ts(reminder.due_at)
        upcoming = next_occurrence(max(now, moment), moment.time(), reminder.repeat_days)
        self.storage.reschedule(reminder.id, int(upcoming.timestamp()))

    async def tick(self) -> int:
        """Отправляет все напоминания, время которых пришло. Возвращает, сколько отправлено."""
        now = self.clock()
        sent = 0
        for reminder in self.storage.due_reminders(int(now.timestamp())):
            markup = (
                kb.recurring_alert(reminder.id) if reminder.is_recurring else kb.reminder_alert(reminder.id)
            )
            try:
                text = await self._message(reminder, now)
                await self.bot.send_message(
                    reminder.chat_id,
                    text,
                    reply_markup=markup,
                    link_preview_options=LinkPreviewOptions(is_disabled=True),
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
            self._after_sent(reminder, now)
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
