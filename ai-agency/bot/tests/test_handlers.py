"""Тесты обработчиков Telegram: Telegram подменён FakeMessage / FakeCallback."""

from types import SimpleNamespace

from aiogram import Dispatcher

from admin_bot import handlers as h
from admin_bot import keyboards as kb
from admin_bot.settings import Settings

from .conftest import NOW, FakeCallback, FakeMessage, Recorder, callback_datas


class FakeAssistant:
    def __init__(self):
        self.calls = []

    async def reply(self, client, text):
        self.calls.append((client.user_id, text))
        return "ответ ИИ"


def settings(owner: int | None = 777) -> Settings:
    return Settings.from_env(
        {"TELEGRAM_BOT_TOKEN": "t", "ANTHROPIC_API_KEY": "k", "OWNER_CHAT_ID": str(owner) if owner else ""}
    )


async def test_start_asks_consent_then_greets(env, state):
    msg = FakeMessage("/start")
    await h.cmd_start(msg, state, env.db, env.business)
    assert "согласие" in msg.answer.texts[0]
    assert "consent:yes" in callback_datas(msg.answer.last_markup)

    cb = FakeCallback("consent:yes")
    await h.on_consent(cb, env.db, env.business, env.booking)
    assert env.db.has_consent(111)
    assert env.business.greeting in cb.message.answer.texts[0]

    msg2 = FakeMessage("/start")
    await h.cmd_start(msg2, state, env.db, env.business)
    assert msg2.answer.texts == [env.business.greeting]


async def test_free_text_goes_to_ai_only_after_consent(env, state):
    ai = FakeAssistant()
    msg = FakeMessage("Сколько стоит чистка?")
    await h.on_text(msg, state, env.db, env.business, ai)
    assert ai.calls == [] and "согласие" in msg.answer.texts[0]

    env.db.give_consent(111, env.business.privacy_policy_url, NOW)
    msg = FakeMessage("Сколько стоит чистка?")
    await h.on_text(msg, state, env.db, env.business, ai)
    assert ai.calls == [(111, "Сколько стоит чистка?")]
    assert msg.answer.texts == ["ответ ИИ"]
    assert msg.bot.send_chat_action.calls  # показали «печатает…»


async def _walk_to_confirm(env, state, phone_message):
    """Проходит сценарий записи кнопками до шага подтверждения."""
    env.db.give_consent(111, env.business.privacy_policy_url, NOW)
    msg = FakeMessage(kb.MENU_BOOK)
    await h.start_booking(msg, state, env.db, env.business)
    service_cb = callback_datas(msg.answer.last_markup)[0]
    assert service_cb.startswith("svc:")

    cb = FakeCallback(service_cb)
    await h.on_service(cb, state, env.db, env.business, env.booking)
    days = callback_datas(cb.message.edit_text.last_markup)
    tomorrow = next(d for d in days if d.endswith("2026-11-05"))

    cb = FakeCallback(tomorrow)
    await h.on_day(cb, env.booking)
    slot = next(d for d in callback_datas(cb.message.edit_text.last_markup) if d.endswith(":1000"))

    cb = FakeCallback(slot)
    await h.on_slot(cb, state, env.booking)
    assert await state.get_state() == h.BookingForm.name.state

    await h.on_name(FakeMessage("Иван"), state)
    assert await state.get_state() == h.BookingForm.phone.state

    await h.on_phone(phone_message, state, env.booking)


async def test_button_booking_flow_dentistry(env, state):
    contact = SimpleNamespace(phone_number="79181234567")
    phone_msg = FakeMessage(None, contact=contact)
    await _walk_to_confirm(env, state, phone_msg)
    # В стоматологии нет доп. вопроса — сразу подтверждение.
    assert await state.get_state() == h.BookingForm.confirm.state
    assert "+79181234567" in phone_msg.answer.texts[-1]

    cb = FakeCallback("book:confirm")
    await h.on_confirm(cb, state, env.booking)
    assert "Вы записаны" in cb.message.edit_text.texts[0]
    assert await state.get_state() is None
    [booking] = env.db.upcoming_for_user(111, NOW)
    assert booking.client_name == "Иван" and booking.source == "buttons"
    assert "Новая запись" in env.notifier.messages[0]


async def test_button_booking_flow_autoservice_asks_car(auto_env, state):
    phone_msg = FakeMessage("8 918 000-00-01")
    await _walk_to_confirm(auto_env, state, phone_msg)
    assert await state.get_state() == h.BookingForm.comment.state
    assert "марку" in phone_msg.answer.texts[-1]

    car = FakeMessage("Lada Vesta 2020")
    await h.on_comment(car, state, auto_env.booking)
    assert "Lada Vesta 2020" in car.answer.texts[-1]
    await h.on_confirm(FakeCallback("book:confirm"), state, auto_env.booking)
    assert "Lada Vesta 2020" in auto_env.notifier.messages[0]


async def test_bad_phone_is_asked_again(env, state):
    phone_msg = FakeMessage("не скажу")
    await _walk_to_confirm(env, state, phone_msg)
    assert await state.get_state() == h.BookingForm.phone.state
    assert "распознать" in phone_msg.answer.texts[-1]


async def test_taken_slot_shows_alert(env, state):
    env.db.give_consent(222, env.business.privacy_policy_url, NOW)
    from admin_bot.booking import ClientInfo
    from datetime import datetime

    await env.booking.book(
        ClientInfo(222), "consultation", datetime.fromisoformat("2026-11-05T10:00+03:00"), "Мария", "+79180000000"
    )
    cb = FakeCallback("slot:consultation:2026-11-05:1000")
    await h.on_slot(cb, state, env.booking)
    args, kwargs = cb.answer.calls[0]
    assert "занято" in args[0] and kwargs["show_alert"]
    assert await state.get_state() is None


async def test_stale_confirm_button(env, state):
    cb = FakeCallback("book:confirm")
    await h.on_confirm(cb, state, env.booking)
    assert "устарела" in cb.answer.calls[0][0][0]
    assert env.notifier.messages == []


async def test_my_bookings_and_cancel(env, state):
    contact = SimpleNamespace(phone_number="+79181234567")
    await _walk_to_confirm(env, state, FakeMessage(None, contact=contact))
    await h.on_confirm(FakeCallback("book:confirm"), state, env.booking)

    msg = FakeMessage(kb.MENU_MY)
    await h.show_my(msg, state, env.db, env.booking)
    [cancel_data] = callback_datas(msg.answer.last_markup)
    cb = FakeCallback(cancel_data)
    await h.on_cancel_booking(cb, env.booking)
    assert "отменена" in cb.message.edit_text.texts[0]
    assert env.db.upcoming_for_user(111, NOW) == []


async def test_call_admin_notifies_owner(env, state):
    msg = FakeMessage(kb.MENU_ADMIN)
    await h.call_admin(msg, state, env.db, env.business, env.booking)
    assert env.notifier.messages == [] and "согласие" in msg.answer.texts[0]  # сначала согласие

    env.db.give_consent(111, env.business.privacy_policy_url, NOW)
    msg = FakeMessage(kb.MENU_ADMIN)
    await h.call_admin(msg, state, env.db, env.business, env.booking)
    assert "нужен администратор" in env.notifier.messages[0]
    assert env.business.phone in msg.answer.texts[0]


async def test_schedule_only_for_owner(env):
    stranger = FakeMessage("/schedule", user_id=111)
    await h.cmd_schedule(stranger, settings(owner=777), env.booking, env.db)
    assert "только владельцу" in stranger.answer.texts[0]

    owner = FakeMessage("/schedule", user_id=777)
    await h.cmd_schedule(owner, settings(owner=777), env.booking, env.db)
    assert "записей нет" in owner.answer.texts[0]


async def test_delete_my_data(env, state):
    env.db.give_consent(111, env.business.privacy_policy_url, NOW)
    cb = FakeCallback("forget:yes")
    await h.on_forget(cb, state, env.booking)
    assert not env.db.has_consent(111)
    assert "удалены" in cb.message.edit_text.texts[0]


def test_router_builds_and_attaches():
    dp = Dispatcher()
    dp.include_router(h.create_router())
    assert len(dp.sub_routers) == 1
    assert isinstance(Recorder(), Recorder)
