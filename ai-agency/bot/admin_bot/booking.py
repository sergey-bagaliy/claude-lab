"""Логика записи: проверки, создание и отмена записей, уведомления владельцу.

Этим модулем пользуются и кнопочный сценарий записи, и ИИ-ассистент —
поэтому правила одни и те же: нельзя записать на занятое или прошедшее время,
без согласия на обработку ПДн, без имени и телефона.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Protocol

from .business import WEEKDAY_NAMES, Business, Service
from .scheduling import booking_days, day_bounds, free_slots
from .storage import Booking, Storage

log = logging.getLogger(__name__)


class BookingError(Exception):
    """Понятная клиенту причина, почему записать не получилось."""


class Notifier(Protocol):
    async def notify_owner(self, text: str) -> None: ...


@dataclass(frozen=True)
class ClientInfo:
    """Кто пишет боту (из Telegram)."""

    user_id: int
    full_name: str = ""
    username: str | None = None

    @property
    def label(self) -> str:
        parts = [self.full_name or "без имени"]
        if self.username:
            parts.append(f"@{self.username}")
        parts.append(f"id {self.user_id}")
        return ", ".join(parts)


def normalize_phone(raw: str) -> str | None:
    """Приводит российский номер к виду +7XXXXXXXXXX. None — если номер не похож на телефон."""
    raw = (raw or "").strip()
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits[0] in "78":
        return "+7" + digits[1:]
    if len(digits) == 10 and digits[0] == "9":
        return "+7" + digits
    if raw.startswith("+") and 11 <= len(digits) <= 15:
        return "+" + digits
    return None


def format_dt(dt: datetime) -> str:
    return f"{dt:%d.%m.%Y} ({WEEKDAY_NAMES[dt.weekday()]}) в {dt:%H:%M}"


class BookingService:
    def __init__(
        self,
        business: Business,
        storage: Storage,
        notifier: Notifier,
        clock: Callable[[], datetime] | None = None,
    ):
        self.business = business
        self.storage = storage
        self.notifier = notifier
        self._clock = clock

    # ------------------------------------------------------------ время

    def now(self) -> datetime:
        tz = self.business.schedule.tz
        return self._clock().astimezone(tz) if self._clock else datetime.now(tz)

    def get_service(self, service_id: str) -> Service:
        service = self.business.service(service_id)
        if service is None:
            ids = ", ".join(s.id for s in self.business.services)
            raise BookingError(f"Нет услуги с id {service_id!r}. Доступные id: {ids}")
        return service

    # ------------------------------------------------------------ свободное время

    def free_slots(self, service_id: str, day: date) -> list[datetime]:
        service = self.get_service(service_id)
        schedule = self.business.schedule
        start, end = day_bounds(day, schedule)
        busy = self.storage.busy_intervals(start, end)
        return free_slots(day, service.duration_minutes, schedule, busy, self.now())

    def days_with_slots(self, service_id: str, limit: int | None = None) -> list[date]:
        days = []
        for day in booking_days(self.business.schedule, self.now()):
            if self.free_slots(service_id, day):
                days.append(day)
                if limit and len(days) >= limit:
                    break
        return days

    def check_day_in_horizon(self, day: date) -> None:
        today = self.now().date()
        horizon = self.business.schedule.booking_horizon_days
        if day < today:
            raise BookingError("Эта дата уже прошла.")
        if day > today + timedelta(days=horizon):
            raise BookingError(f"Запись открыта только на {horizon} дней вперёд.")

    # ------------------------------------------------------------ запись

    async def book(
        self,
        client: ClientInfo,
        service_id: str,
        start: datetime,
        client_name: str,
        phone: str,
        comment: str = "",
        source: str = "buttons",
    ) -> Booking:
        if not self.storage.has_consent(client.user_id):
            raise BookingError("Клиент ещё не дал согласие на обработку персональных данных — запись невозможна.")
        service = self.get_service(service_id)
        client_name = (client_name or "").strip()
        if not 2 <= len(client_name) <= 80:
            raise BookingError("Нужно имя клиента (от 2 до 80 символов).")
        normalized = normalize_phone(phone)
        if not normalized:
            raise BookingError("Телефон не распознан. Нужен номер вида +7 900 000-00-00.")
        if start.tzinfo is None:
            start = start.replace(tzinfo=self.business.schedule.tz)
        start = start.astimezone(self.business.schedule.tz)
        self.check_day_in_horizon(start.date())
        if start not in self.free_slots(service_id, start.date()):
            raise BookingError("Это время недоступно (занято, нерабочее или уже прошло). Выберите другое.")

        booking = self.storage.create_booking_if_free(
            user_id=client.user_id,
            client_name=client_name,
            phone=normalized,
            service_id=service.id,
            start=start,
            end=start + timedelta(minutes=service.duration_minutes),
            comment=(comment or "").strip()[:300],
            source=source,
            capacity=self.business.schedule.capacity,
            now=self.now(),
        )
        if booking is None:
            raise BookingError("Это время только что заняли. Выберите другое.")
        await self._notify(self.owner_booking_text(booking, client, title="🆕 Новая запись"))
        return booking

    async def cancel(self, client: ClientInfo, booking_id: int) -> Booking:
        booking = self.storage.cancel_booking(client.user_id, booking_id)
        if booking is None:
            raise BookingError("Запись не найдена или уже отменена.")
        await self._notify(self.owner_booking_text(booking, client, title="❌ Клиент отменил запись"))
        return booking

    async def forget(self, client: ClientInfo) -> list[Booking]:
        cancelled = self.storage.forget_user(client.user_id, self.now())
        lines = [f"🗑 Клиент ({client.label}) отозвал согласие на обработку ПДн. Его данные удалены из бота."]
        for b in cancelled:
            lines.append(f"Освободилось время: {self.service_name(b.service_id)}, {format_dt(b.start)}")
        await self._notify("\n".join(lines))
        return cancelled

    async def handoff(self, client: ClientInfo, reason: str, last_message: str = "") -> None:
        text = [f"🙋 Клиенту нужен администратор\nКлиент: {client.label}", f"Причина: {reason.strip() or 'не указана'}"]
        if last_message:
            text.append(f"Последнее сообщение: {last_message.strip()[:500]}")
        text.append("Ответьте клиенту в Telegram или перезвоните.")
        await self._notify("\n".join(text))

    # ------------------------------------------------------------ тексты

    def service_name(self, service_id: str) -> str:
        service = self.business.service(service_id)
        return service.name if service else service_id

    def client_booking_text(self, booking: Booking) -> str:
        return f"{self.service_name(booking.service_id)} — {format_dt(booking.start)}"

    def owner_booking_text(self, booking: Booking, client: ClientInfo, title: str) -> str:
        lines = [
            title,
            f"Услуга: {self.service_name(booking.service_id)}",
            f"Когда: {format_dt(booking.start)}",
            f"Имя: {booking.client_name}",
            f"Телефон: {booking.phone}",
            f"Telegram: {client.label}",
        ]
        if booking.comment:
            lines.append(f"Комментарий: {booking.comment}")
        lines.append(f"Источник: {'ИИ-диалог' if booking.source == 'ai' else 'кнопки'}; № записи {booking.id}")
        return "\n".join(lines)

    async def _notify(self, text: str) -> None:
        try:
            await self.notifier.notify_owner(text)
        except Exception:  # уведомление не должно ломать запись клиента
            log.exception("Не удалось отправить уведомление владельцу")
