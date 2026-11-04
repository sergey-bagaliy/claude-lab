from datetime import datetime

import pytest

from admin_bot.booking import BookingError, ClientInfo, normalize_phone
from admin_bot.storage import DELETED

from .conftest import NOW


def at(text: str) -> datetime:
    return datetime.fromisoformat(f"{text}+03:00")


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("8 (918) 123-45-67", "+79181234567"),
        ("+7 918 123 45 67", "+79181234567"),
        ("9181234567", "+79181234567"),
        ("+375 29 123-45-67", "+375291234567"),
        ("123", None),
        ("", None),
    ],
)
def test_normalize_phone(raw, expected):
    assert normalize_phone(raw) == expected


async def test_booking_requires_consent(env, client):
    with pytest.raises(BookingError, match="согласие"):
        await env.booking.book(client, "consultation", at("2026-11-05T10:00"), "Иван", "+79181234567")
    assert env.notifier.messages == []


async def test_successful_booking_notifies_owner(env, client):
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    booking = await env.booking.book(client, "consultation", at("2026-11-05T10:00"), "Иван", "8 918 123-45-67")
    assert booking.phone == "+79181234567"
    assert booking.end == at("2026-11-05T10:30")
    [note] = env.notifier.messages
    assert "Новая запись" in note and "Консультация стоматолога" in note and "+79181234567" in note
    assert "05.11.2026 (четверг) в 10:00" in note


async def test_no_double_booking_with_one_chair(env, client):
    other = ClientInfo(user_id=222, full_name="Мария")
    for c in (client, other):
        env.db.give_consent(c.user_id, env.business.privacy_policy_url, NOW)
    await env.booking.book(client, "hygiene", at("2026-11-05T10:00"), "Иван", "+79181234567")
    with pytest.raises(BookingError, match="недоступно"):
        await env.booking.book(other, "consultation", at("2026-11-05T10:30"), "Мария", "+79181234568")


async def test_storage_rejects_race_condition(env, client):
    """Даже если проверка слотов пропущена, база не даст занять одно время дважды."""
    kwargs = dict(
        user_id=1, client_name="А", phone="+79180000000", service_id="consultation",
        start=at("2026-11-05T10:00"), end=at("2026-11-05T10:30"), comment="", source="ai", capacity=1, now=NOW,
    )
    assert env.db.create_booking_if_free(**kwargs) is not None
    assert env.db.create_booking_if_free(**kwargs) is None


async def test_capacity_two_in_autoservice(auto_env):
    clients = [ClientInfo(user_id=i) for i in (1, 2, 3)]
    for c in clients:
        auto_env.db.give_consent(c.user_id, "https://example.com/privacy", NOW)
    start = at("2026-11-05T10:00")
    await auto_env.booking.book(clients[0], "tires", start, "Олег", "+79180000001", comment="Kia Rio 2018")
    await auto_env.booking.book(clients[1], "tires", start, "Анна", "+79180000002")
    with pytest.raises(BookingError):
        await auto_env.booking.book(clients[2], "tires", start, "Пётр", "+79180000003")
    assert "Kia Rio 2018" in auto_env.notifier.messages[0]


@pytest.mark.parametrize(
    ("when", "message"),
    [
        ("2026-11-04T09:00", "прошла|недоступно"),  # уже прошло
        ("2026-11-04T10:30", "недоступно"),  # меньше часа до начала
        ("2026-11-05T14:00", "недоступно"),  # перерыв
        ("2026-11-05T10:10", "недоступно"),  # не по сетке
        ("2026-11-08T12:00", "недоступно"),  # воскресенье
        ("2026-12-10T10:00", "дней вперёд"),  # дальше горизонта
    ],
)
async def test_invalid_times_rejected(env, client, when, message):
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    with pytest.raises(BookingError, match=message):
        await env.booking.book(client, "consultation", at(when), "Иван", "+79181234567")


async def test_validation_of_name_phone_service(env, client):
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    start = at("2026-11-05T10:00")
    with pytest.raises(BookingError, match="имя"):
        await env.booking.book(client, "consultation", start, " ", "+79181234567")
    with pytest.raises(BookingError, match="Телефон"):
        await env.booking.book(client, "consultation", start, "Иван", "позвоните мне")
    with pytest.raises(BookingError, match="Нет услуги"):
        await env.booking.book(client, "botox", start, "Иван", "+79181234567")


async def test_cancel_only_own_booking(env, client):
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    booking = await env.booking.book(client, "consultation", at("2026-11-05T10:00"), "Иван", "+79181234567")
    with pytest.raises(BookingError):
        await env.booking.cancel(ClientInfo(user_id=999), booking.id)
    cancelled = await env.booking.cancel(client, booking.id)
    assert cancelled.status == "cancelled"
    assert "отменил" in env.notifier.messages[-1]
    # Время снова свободно
    assert at("2026-11-05T10:00") in env.booking.free_slots("consultation", at("2026-11-05T10:00").date())


async def test_forget_user_deletes_personal_data(env, client):
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    await env.booking.book(client, "consultation", at("2026-11-05T10:00"), "Иван", "+79181234567")
    env.db.add_history(client.user_id, "user", "привет", NOW)
    cancelled = await env.booking.forget(client)
    assert len(cancelled) == 1
    assert not env.db.has_consent(client.user_id)
    assert env.db.get_history(client.user_id, 10) == []
    assert env.db.upcoming_for_user(client.user_id, NOW) == []
    row = env.db._conn.execute("SELECT client_name, phone FROM bookings").fetchone()
    assert tuple(row) == (DELETED, DELETED)
    assert "отозвал согласие" in env.notifier.messages[-1]


def test_history_starts_with_user_message(env):
    for i in range(5):
        env.db.add_history(1, "user", f"q{i}", NOW)
        env.db.add_history(1, "assistant", f"a{i}", NOW)
    history = env.db.get_history(1, 3)  # последние 3 сообщения: a3, q4, a4 → a3 отбрасывается
    assert [m["content"] for m in history] == ["q4", "a4"]
    assert history[0]["role"] == "user"


async def test_notifier_failure_does_not_break_booking(env, client):
    class Broken:
        async def notify_owner(self, text):
            raise RuntimeError("telegram down")

    env.booking.notifier = Broken()
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    booking = await env.booking.book(client, "consultation", at("2026-11-05T10:00"), "Иван", "+79181234567")
    assert booking.id > 0
