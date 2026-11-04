from datetime import date, datetime

from admin_bot.scheduling import booking_days, fits_capacity, free_slots

from .conftest import NOW


def dt(text: str) -> datetime:
    return datetime.fromisoformat(f"{text}+03:00")


def hhmm(slots):
    return [f"{s:%H:%M}" for s in slots]


def test_today_respects_lead_time_break_and_closing(business):
    slots = hhmm(free_slots(date(2026, 11, 4), 30, business.schedule, [], NOW))
    assert slots[0] == "11:00"  # сейчас 10:00 + минимум 60 минут
    assert "13:30" in slots  # заканчивается ровно к перерыву
    assert "14:00" not in slots  # перерыв 14:00–14:30
    assert "14:30" in slots
    assert slots[-1] == "19:30"  # услуга должна закончиться до закрытия в 20:00


def test_long_service_does_not_overlap_break(business):
    slots = hhmm(free_slots(date(2026, 11, 5), 60, business.schedule, [], NOW))
    assert slots[0] == "09:00"
    assert "13:00" in slots and "13:30" not in slots and "14:00" not in slots
    assert slots[-1] == "19:00"


def test_days_off(business):
    assert free_slots(date(2026, 11, 8), 30, business.schedule, [], NOW) == []  # воскресенье
    assert free_slots(date(2026, 12, 31), 30, business.schedule, [], NOW) == []  # праздник из конфига


def test_busy_slot_removed(business):
    busy = [(dt("2026-11-05T10:00"), dt("2026-11-05T11:00"))]
    slots = hhmm(free_slots(date(2026, 11, 5), 30, business.schedule, busy, NOW))
    assert "09:30" in slots and "10:00" not in slots and "10:30" not in slots and "11:00" in slots


def test_capacity_two_posts(auto_business):
    busy = [(dt("2026-11-05T10:00"), dt("2026-11-05T11:00"))]
    assert "10:00" in hhmm(free_slots(date(2026, 11, 5), 30, auto_business.schedule, busy, NOW))
    busy.append((dt("2026-11-05T10:00"), dt("2026-11-05T10:30")))
    slots = hhmm(free_slots(date(2026, 11, 5), 30, auto_business.schedule, busy, NOW))
    assert "10:00" not in slots and "10:30" in slots


def test_fits_capacity_counts_real_overlap():
    a = (dt("2026-11-05T10:00"), dt("2026-11-05T11:00"))
    b = (dt("2026-11-05T11:00"), dt("2026-11-05T12:00"))
    # Две записи подряд не пересекаются друг с другом — третья поместится при 2 местах.
    assert fits_capacity(dt("2026-11-05T10:30"), dt("2026-11-05T11:30"), [a, b], capacity=2)
    c = (dt("2026-11-05T10:30"), dt("2026-11-05T11:30"))
    assert not fits_capacity(dt("2026-11-05T10:45"), dt("2026-11-05T11:15"), [a, c], capacity=2)
    assert not fits_capacity(dt("2026-11-05T10:00"), dt("2026-11-05T10:30"), [a], capacity=1)


def test_booking_days_horizon(business):
    days = booking_days(business.schedule, NOW)
    assert days[0] == date(2026, 11, 4)
    assert date(2026, 11, 8) not in days  # воскресенье
    assert max(days) <= date(2026, 11, 18)  # 14 дней вперёд
