"""Дневной лимит расходов на Claude и уведомления хозяину бота.

• На 80% лимита — предупреждение.
• На 100% — платные функции выключаются до полуночи (по Москве), хозяину приходит
  сообщение с кнопками «+$0.50 / +$1 / +$2 на сегодня».
Каждое уведомление приходит один раз в день (после увеличения лимита — снова).
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from .storage import Storage
from .timeutil import now_local

log = logging.getLogger(__name__)

WARN_SHARE = 0.8  # предупредить, когда потрачено 80% лимита
EXTEND_OPTIONS_CENTS = (50, 100, 200)  # кнопки «+$0.50», «+$1», «+$2»


@dataclass(frozen=True)
class BudgetEvent:
    level: str  # "warning" — 80%, "exhausted" — 100%
    spent: float
    limit: float


class BudgetGuard:
    def __init__(
        self, storage: Storage, daily_budget_usd: float, clock: Callable[[], datetime] = now_local
    ) -> None:
        self.storage = storage
        self.daily_budget_usd = daily_budget_usd  # 0 — без лимита
        self.clock = clock

    def _day(self) -> str:
        return self.clock().strftime("%Y-%m-%d")

    @property
    def enabled(self) -> bool:
        return self.daily_budget_usd > 0

    def extra_today(self) -> float:
        return float(self.storage.get_setting(f"budget_extra:{self._day()}") or 0)

    def limit_today(self) -> float:
        return self.daily_budget_usd + self.extra_today()

    def spent_today(self) -> float:
        return self.storage.spent(self._day()).cost_usd

    def is_exhausted(self) -> bool:
        return self.enabled and self.spent_today() >= self.limit_today()

    def extend_today(self, amount_usd: float) -> float:
        """Поднимает лимит только на сегодня. Возвращает новый лимит."""
        key = f"budget_extra:{self._day()}"
        self.storage.set_setting(key, f"{self.extra_today() + amount_usd:.2f}")
        return self.limit_today()

    def new_events(self) -> list[BudgetEvent]:
        """Пороги, пересечённые после последней проверки. Каждый — один раз на текущий лимит."""
        if not self.enabled:
            return []
        spent, limit = self.spent_today(), self.limit_today()
        events = []
        for level, share in (("warning", WARN_SHARE), ("exhausted", 1.0)):
            key = f"budget_notified:{self._day()}:{level}"
            if spent >= limit * share and self.storage.get_setting(key) != f"{limit:.2f}":
                self.storage.set_setting(key, f"{limit:.2f}")
                events.append(BudgetEvent(level, spent, limit))
        # Если сразу перескочили 100%, предупреждение про 80% уже не нужно.
        if any(e.level == "exhausted" for e in events):
            events = [e for e in events if e.level == "exhausted"]
        return events


def event_text(event: BudgetEvent) -> str:
    if event.level == "warning":
        return (
            f"⚠️ Расходы на Claude сегодня: ${event.spent:.2f} из ${event.limit:.2f} "
            f"({event.spent / event.limit:.0%}).\n"
            "Когда лимит закончится, платные функции отдохнут до полуночи."
        )
    return (
        f"⛔ Дневной лимит на Claude исчерпан: потрачено ${event.spent:.2f} из ${event.limit:.2f}.\n"
        "Ответы Claude, рецепты, сказки и поиск выключены до полуночи (по Москве). "
        "Покупки, напоминания, примеры и голосовые распознаются как обычно.\n\n"
        "Поднять лимит только на сегодня:"
    )


def extend_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=f"+${cents / 100:.2f}".replace(".00", ""), callback_data=f"budget:add:{cents}"
                )
                for cents in EXTEND_OPTIONS_CENTS
            ]
        ]
    )


class BudgetNotifier:
    """Отправляет уведомления о лимите хозяину бота (ADMIN_USER_ID)."""

    def __init__(self, bot: Bot, admin_id: int | None) -> None:
        self.bot = bot
        self.admin_id = admin_id

    async def __call__(self, event: BudgetEvent) -> None:
        if self.admin_id is None:
            log.warning(
                "Лимит: %s ($%.2f из $%.2f), но ADMIN_USER_ID не задан", event.level, event.spent, event.limit
            )
            return
        markup = extend_keyboard() if event.level == "exhausted" else None
        try:
            await self.bot.send_message(self.admin_id, event_text(event), reply_markup=markup)
        except TelegramAPIError as error:
            log.warning("Не удалось отправить уведомление о лимите: %s", error)
