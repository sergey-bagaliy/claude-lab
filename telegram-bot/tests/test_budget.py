"""Дневной лимит расходов и уведомления хозяину бота."""

import pytest
from aiogram import Bot

from family_bot.budget import BudgetGuard, BudgetNotifier, event_text, extend_keyboard
from family_bot.pricing import UsageCounts

from .conftest import SERGEY, FakeTelegramSession, claude_message, claude_text, text


def spend(storage, clock, usd: float) -> None:
    storage.add_usage(clock().strftime("%Y-%m-%d"), "chat", "m", UsageCounts(), usd)


@pytest.fixture
def guard(storage, clock):
    return BudgetGuard(storage, daily_budget_usd=1.0, clock=clock)


def test_warning_and_exhausted_come_once(guard, storage, clock):
    spend(storage, clock, 0.5)
    assert guard.new_events() == []
    spend(storage, clock, 0.35)  # 85%
    [warning] = guard.new_events()
    assert warning.level == "warning" and warning.spent == pytest.approx(0.85)
    assert guard.new_events() == []  # второй раз не предупреждаем
    spend(storage, clock, 0.2)
    [exhausted] = guard.new_events()
    assert exhausted.level == "exhausted" and guard.is_exhausted()
    assert guard.new_events() == []


def test_jump_straight_to_exhausted_gives_one_message(guard, storage, clock):
    spend(storage, clock, 1.5)
    assert [e.level for e in guard.new_events()] == ["exhausted"]


def test_extend_today_rearms_notifications(guard, storage, clock):
    spend(storage, clock, 1.0)
    guard.new_events()
    assert guard.extend_today(0.5) == pytest.approx(1.5)
    assert not guard.is_exhausted() and guard.extra_today() == pytest.approx(0.5)
    spend(storage, clock, 0.6)
    assert [e.level for e in guard.new_events()] == ["exhausted"]  # новый лимит — новое уведомление


def test_extension_is_only_for_today(guard, storage, clock):
    guard.extend_today(2.0)
    clock.advance(days=1)
    assert guard.limit_today() == pytest.approx(1.0)


def test_no_limit_no_events(storage, clock):
    guard = BudgetGuard(storage, daily_budget_usd=0, clock=clock)
    spend(storage, clock, 100)
    assert guard.new_events() == [] and not guard.is_exhausted()


def test_texts_and_buttons(guard, storage, clock):
    spend(storage, clock, 0.9)
    [warning] = guard.new_events()
    assert "$0.90 из $1.00 (90%)" in event_text(warning)
    buttons = [b.callback_data for row in extend_keyboard().inline_keyboard for b in row]
    labels = [b.text for row in extend_keyboard().inline_keyboard for b in row]
    assert buttons == ["budget:add:50", "budget:add:100", "budget:add:200"]
    assert labels == ["+$0.50", "+$1", "+$2"]


async def test_notifier_writes_to_admin(guard, storage, clock):
    session = FakeTelegramSession()
    notifier = BudgetNotifier(Bot(token="123456:TEST", session=session), admin_id=100)
    spend(storage, clock, 1.2)
    [event] = guard.new_events()
    await notifier(event)
    [sent] = session.sent()
    assert sent.chat_id == 100 and sent.text.startswith("⛔ Дневной лимит")
    assert sent.reply_markup is not None


async def test_notifier_without_admin_only_logs(guard, storage, clock):
    session = FakeTelegramSession()
    spend(storage, clock, 1.2)
    await BudgetNotifier(Bot(token="123456:TEST", session=session), admin_id=None)(guard.new_events()[0])
    assert session.sent() == []


async def test_assistant_notifies_when_threshold_crossed(assistant, fake_claude):
    events = []

    async def notify(event):
        events.append(event)

    assistant.on_budget_event = notify
    assistant.daily_budget_usd = 0.02
    fake_claude.messages.queue.append(claude_message(text("ok"), searches=2))  # ≈ $0.024
    await assistant.ask(1, SERGEY, "Привет")
    assert [e.level for e in events] == ["exhausted"]


async def test_extended_limit_lets_claude_answer_again(assistant, fake_claude):
    assistant.daily_budget_usd = 0.01
    fake_claude.messages.queue += [claude_message(text("ok"), searches=2), claude_text("снова отвечаю")]
    await assistant.ask(1, SERGEY, "Привет")
    assistant.budget.extend_today(1.0)
    reply = await assistant.ask(1, SERGEY, "Ещё")
    assert reply.text == "снова отвечаю"


async def test_notification_failure_does_not_break_answer(assistant, fake_claude):
    async def broken(event):
        raise RuntimeError("Telegram недоступен")

    assistant.on_budget_event = broken
    assistant.daily_budget_usd = 0.001
    reply = await assistant.ask(1, SERGEY, "Привет")
    assert reply.text == "Ответ Claude"
