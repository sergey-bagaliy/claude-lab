"""Расчёт свободного времени: рабочие часы, перерывы, выходные, занятые записи.

Чистые функции без базы данных и Telegram — их легко проверять тестами.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime, timedelta

from .business import Schedule

Interval = tuple[datetime, datetime]


def overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    """Пересекаются ли полуинтервалы [a_start, a_end) и [b_start, b_end)."""
    return a_start < b_end and b_start < a_end


def fits_capacity(start: datetime, end: datetime, busy: Iterable[Interval], capacity: int) -> bool:
    """Можно ли добавить запись [start, end), не превысив число мест (кресел, постов).

    Считаем максимальную одновременную загрузку внутри интервала:
    проверяем начало интервала и начало каждой занятой записи внутри него.
    """
    busy = [(s, e) for s, e in busy if overlaps(start, end, s, e)]
    if len(busy) < capacity:
        return True
    points = [start] + [s for s, _ in busy if start <= s < end]
    for point in points:
        in_use = sum(1 for s, e in busy if s <= point < e)
        if in_use >= capacity:
            return False
    return True


def day_bounds(day: date, schedule: Schedule) -> Interval:
    """Начало и конец календарного дня в часовом поясе бизнеса."""
    start = datetime.combine(day, datetime.min.time(), tzinfo=schedule.tz)
    return start, start + timedelta(days=1)


def free_slots(
    day: date,
    duration_minutes: int,
    schedule: Schedule,
    busy: Iterable[Interval],
    now: datetime,
) -> list[datetime]:
    """Список времени начала, на которое можно записать услугу длительностью duration_minutes."""
    hours = schedule.hours_for(day)
    if hours is None:
        return []
    tz = schedule.tz
    busy = list(busy)
    opening = datetime.combine(day, hours.start, tzinfo=tz)
    closing = datetime.combine(day, hours.end, tzinfo=tz)
    breaks = [
        (datetime.combine(day, b.start, tzinfo=tz), datetime.combine(day, b.end, tzinfo=tz))
        for b in schedule.breaks
    ]
    duration = timedelta(minutes=duration_minutes)
    step = timedelta(minutes=schedule.slot_step_minutes)
    earliest = now + timedelta(minutes=schedule.min_lead_minutes)

    result = []
    start = opening
    while start + duration <= closing:
        end = start + duration
        if (
            start >= earliest
            and not any(overlaps(start, end, bs, be) for bs, be in breaks)
            and fits_capacity(start, end, busy, schedule.capacity)
        ):
            result.append(start)
        start += step
    return result


def booking_days(schedule: Schedule, now: datetime) -> list[date]:
    """Рабочие дни, на которые вообще можно записаться (горизонт записи из конфига)."""
    today = now.astimezone(schedule.tz).date()
    days = (today + timedelta(days=i) for i in range(schedule.booking_horizon_days + 1))
    return [d for d in days if schedule.hours_for(d) is not None]
