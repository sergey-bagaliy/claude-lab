"""Расписание повторяющихся напоминаний: «каждый день», «по будням», «по выходным», «раз в неделю»."""

from __future__ import annotations

from datetime import datetime, time, timedelta

from .timeutil import TZ

# Дни недели как цифры: 0 — понедельник … 6 — воскресенье.
REPEAT_DAYS = {
    "daily": "0123456",
    "weekdays": "01234",
    "weekends": "56",
}
WEEKLY_PHRASES = (
    "каждый понедельник",
    "каждый вторник",
    "каждую среду",
    "каждый четверг",
    "каждую пятницу",
    "каждую субботу",
    "каждое воскресенье",
)
SHORT_DAYS = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")


def repeat_days_for(repeat: str, first: datetime) -> str:
    """Тип повтора от Claude → строка дней. Для «weekly» — день недели первой даты."""
    if repeat in REPEAT_DAYS:
        return REPEAT_DAYS[repeat]
    if repeat == "weekly":
        return str(first.astimezone(TZ).weekday())
    raise ValueError(repeat)


def next_occurrence(after: datetime, at: time, days: str) -> datetime:
    """Ближайший момент строго после `after` в указанное время и в указанные дни недели."""
    after = after.astimezone(TZ)
    for offset in range(8):
        day = after.date() + timedelta(days=offset)
        candidate = datetime.combine(day, at, tzinfo=TZ)
        if candidate > after and str(candidate.weekday()) in days:
            return candidate
    raise ValueError(f"Неверные дни повтора: {days!r}")


def describe_days(days: str) -> str:
    if days == REPEAT_DAYS["daily"]:
        return "каждый день"
    if days == REPEAT_DAYS["weekdays"]:
        return "по будням"
    if days == REPEAT_DAYS["weekends"]:
        return "по выходным"
    if len(days) == 1:
        return WEEKLY_PHRASES[int(days)]
    return "по дням: " + ", ".join(SHORT_DAYS[int(d)] for d in days)


def describe_schedule(days: str, moment: datetime) -> str:
    """«каждый день в 08:00», «по будням в 07:30», «каждую среду в 19:00»."""
    return f"{describe_days(days)} в {moment.astimezone(TZ):%H:%M}"
