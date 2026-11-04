"""Время по Краснодару (оно же московское) и удобные подписи дат."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

# Краснодар живёт по московскому времени (UTC+3).
TZ = ZoneInfo("Europe/Moscow")

WEEKDAYS = ("понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье")
MONTHS = (
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
)

WHEN_FORMAT = "%Y-%m-%d %H:%M"  # так Claude передаёт время напоминаний: 2026-11-05 17:30


def now_local() -> datetime:
    return datetime.now(TZ)


def from_ts(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, TZ)


def parse_local(text: str) -> datetime:
    """'2026-11-05 17:30' → время по Краснодару. Бросает ValueError при ошибке."""
    return datetime.strptime(text.strip(), WHEN_FORMAT).replace(tzinfo=TZ)


def format_date(day: date) -> str:
    """4 ноября 2026, среда."""
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}, {WEEKDAYS[day.weekday()]}"


def format_when(moment: datetime, now: datetime) -> str:
    """Человеческая подпись: «сегодня в 17:30», «завтра в 09:00», «7 ноября в 12:00»."""
    moment = moment.astimezone(TZ)
    days = (moment.date() - now.astimezone(TZ).date()).days
    clock = moment.strftime("%H:%M")
    if days == 0:
        return f"сегодня в {clock}"
    if days == 1:
        return f"завтра в {clock}"
    if days == 2:
        return f"послезавтра в {clock}"
    return f"{moment.day} {MONTHS[moment.month - 1]} в {clock}"


def tomorrow_same_time(moment: datetime) -> datetime:
    return moment + timedelta(days=1)


def season(day: date) -> str:
    if day.month in (12, 1, 2):
        return "зима"
    if day.month in (3, 4, 5):
        return "весна"
    if day.month in (6, 7, 8):
        return "лето"
    return "осень"
