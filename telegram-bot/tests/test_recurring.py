"""Повторяющиеся напоминания и рассылки («каждое утро — интересный факт»)."""

import sqlite3
from datetime import datetime, time

import pytest
from aiogram import Bot

from family_bot.app import build_dispatcher
from family_bot.assistant import AssistantError
from family_bot.config import Settings
from family_bot.handlers import Deps
from family_bot.reminders import ReminderService
from family_bot.schedule import describe_schedule, next_occurrence, repeat_days_for
from family_bot.storage import Storage
from family_bot.timeutil import parse_local
from family_bot.tools import MAX_RECURRING, ToolContext, ToolExecutor

from .conftest import (
    SERGEY,
    FakeTelegramSession,
    claude_message,
    claude_text,
    make_callback,
    make_update,
    tool_use,
)

CTX = ToolContext(chat_id=100, person_name="Сергей")


def at(text: str) -> datetime:
    return parse_local(text)


# ---------- расписание ----------


@pytest.mark.parametrize(
    "after, days, expected",
    [
        ("2026-11-04 15:00", "0123456", "2026-11-05 08:00"),  # сегодня 8:00 уже было — завтра
        ("2026-11-04 07:00", "0123456", "2026-11-04 08:00"),  # сегодня ещё успеваем
        ("2026-11-06 09:00", "01234", "2026-11-09 08:00"),  # пятница после 8 → понедельник
        ("2026-11-04 15:00", "56", "2026-11-07 08:00"),  # по выходным → суббота
        ("2026-11-04 08:00", "2", "2026-11-11 08:00"),  # каждую среду, ровно 8:00 — следующая неделя
    ],
)
def test_next_occurrence(after, days, expected):
    assert next_occurrence(at(after), time(8, 0), days) == at(expected)


def test_describe_schedule():
    moment = at("2026-11-05 08:00")
    assert describe_schedule("0123456", moment) == "каждый день в 08:00"
    assert describe_schedule("01234", moment) == "по будням в 08:00"
    assert describe_schedule("56", moment) == "по выходным в 08:00"
    assert describe_schedule("2", moment) == "каждую среду в 08:00"
    assert describe_schedule("02", moment) == "по дням: пн, ср в 08:00"
    assert repeat_days_for("weekly", at("2026-11-06 10:00")) == "4"  # пятница
    with pytest.raises(ValueError):
        repeat_days_for("hourly", moment)


# ---------- база ----------


def test_old_database_is_upgraded(tmp_path):
    path = str(tmp_path / "old.db")
    old = sqlite3.connect(path)
    old.executescript(
        """CREATE TABLE reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL,
        text TEXT NOT NULL, due_at INTEGER NOT NULL, created_by TEXT NOT NULL DEFAULT '',
        created_by_chat INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending');
        INSERT INTO reminders(chat_id, text, due_at) VALUES (100, 'позвонить маме', 1000);"""
    )
    old.commit()
    old.close()

    db = Storage(path)  # бот обновился, база — старая
    [reminder] = db.due_reminders(2000)
    assert reminder.text == "позвонить маме" and not reminder.is_recurring and not reminder.generate
    db.add_reminder(100, "факт", 3000, "Сергей", 100, repeat_days="0123456", generate=True)
    assert db.reminder(2).is_recurring and db.reminder(2).generate
    db.close()


def test_remember_last_texts(storage):
    reminder_id = storage.add_reminder(100, "факт", 1000, "Сергей", 100, "0123456", True)
    for n in range(7):
        storage.remember_text(reminder_id, f"выпуск {n}")
    assert storage.reminder(reminder_id).last_texts == tuple(f"выпуск {n}" for n in range(2, 7))
    assert storage.count_recurring_for(100) == 1


# ---------- инструменты Claude ----------


@pytest.fixture
def tools(storage, clock):
    storage.touch_user(100, "Сергей", 100, 0)
    storage.touch_user(200, "Вика", 200, 0)
    return ToolExecutor(storage, clock)


def test_daily_reminder_starts_tomorrow_if_time_passed(tools, storage):
    result = tools.run(
        "create_reminder",
        {
            "text": "нужно добиваться своих целей",
            "when": "2026-11-04 08:00",
            "for_whom": "",
            "repeat": "daily",
        },
        CTX,
    )
    assert not result.is_error
    assert "каждый день в 08:00" in result.content and "завтра в 08:00" in result.content
    [reminder] = storage.pending_reminders_for(100)
    assert reminder.repeat_days == "0123456" and not reminder.generate
    assert reminder.due_at == int(at("2026-11-05 08:00").timestamp())


def test_generated_newsletter(tools, storage):
    result = tools.run(
        "create_reminder",
        {
            "text": "интересный факт",
            "when": "2026-11-05 08:00",
            "for_whom": "",
            "repeat": "daily",
            "generate": True,
        },
        CTX,
    )
    assert "новый текст готовит Claude" in result.content
    assert storage.pending_reminders_for(100)[0].generate


def test_weekdays_from_saturday_moves_to_monday(tools, storage):
    tools.run(
        "create_reminder",
        {"text": "зарядка", "when": "2026-11-07 07:00", "for_whom": "", "repeat": "weekdays"},
        CTX,
    )
    assert storage.pending_reminders_for(100)[0].due_at == int(at("2026-11-09 07:00").timestamp())


def test_bad_repeat_and_limit(tools):
    bad = tools.run(
        "create_reminder", {"text": "x", "when": "2026-11-05 08:00", "for_whom": "", "repeat": "hourly"}, CTX
    )
    assert bad.is_error and "daily" in bad.content
    data = {"text": "x", "when": "2026-11-05 08:00", "for_whom": "", "repeat": "daily"}
    for _ in range(MAX_RECURRING):
        assert not tools.run("create_reminder", data, CTX).is_error
    over = tools.run("create_reminder", data, CTX)
    assert over.is_error and "предел" in over.content


def test_list_and_delete(tools, storage):
    tools.run(
        "create_reminder",
        {
            "text": "интересный факт",
            "when": "2026-11-05 08:00",
            "for_whom": "",
            "repeat": "daily",
            "generate": True,
        },
        CTX,
    )
    listing = tools.run("list_reminders", {}, CTX).content
    assert "№1: каждый день в 08:00 — 🤖 интересный факт" in listing

    assert tools.run("delete_reminder", {"reminder_id": 1}, ToolContext(300, "Гость")).is_error  # чужое
    assert tools.run("delete_reminder", {"reminder_id": "abc"}, CTX).is_error
    assert "отменено" in tools.run("delete_reminder", {"reminder_id": 1}, CTX).content
    assert storage.pending_reminders_for(100) == []
    assert tools.run("delete_reminder", {"reminder_id": 1}, CTX).is_error  # уже отменено


# ---------- служба напоминаний ----------


class FakeAssistant:
    def __init__(self, reply="Осьминоги имеют три сердца.", error=None):
        self.reply, self.error = reply, error
        self.calls = []

    async def scheduled_message(self, chat_id, recipient, instruction, schedule, previous):
        self.calls.append((chat_id, recipient, instruction, schedule, previous))
        if self.error:
            raise self.error
        return self.reply


def make_service(storage, clock, assistant=None):
    session = FakeTelegramSession()
    return ReminderService(
        Bot(token="123456:TEST", session=session), storage, clock, assistant=assistant
    ), session


async def test_recurring_text_is_sent_and_rescheduled(storage, clock):
    reminder_id = storage.add_reminder(
        100, "нужно больше работать", int(clock().timestamp()), "Сергей", 100, "0123456"
    )
    service, session = make_service(storage, clock)
    assert await service.tick() == 1
    [sent] = session.sent()
    assert sent.text == "🔁 Напоминание: нужно больше работать"
    assert [b.text for row in sent.reply_markup.inline_keyboard for b in row] == [
        "👍 Ок",
        "🔕 Больше не присылать",
    ]
    reminder = storage.reminder(reminder_id)
    assert reminder.status == "pending" and reminder.due_at == int(at("2026-11-05 15:00").timestamp())
    assert await service.tick() == 0  # сегодня второй раз не шлём


async def test_newsletter_asks_claude_and_remembers(storage, clock):
    storage.touch_user(100, "Сергей", 100, 0)
    reminder_id = storage.add_reminder(
        100, "интересный факт", int(clock().timestamp()), "Сергей", 100, "0123456", True
    )
    storage.remember_text(reminder_id, "Вчерашний факт")
    assistant = FakeAssistant()
    service, session = make_service(storage, clock, assistant)
    await service.tick()

    assert session.sent()[0].text == "📬 Интересный факт\n\nОсьминоги имеют три сердца."
    assert assistant.calls == [(100, "Сергей", "интересный факт", "каждый день в 15:00", ("Вчерашний факт",))]
    assert storage.reminder(reminder_id).last_texts == ("Вчерашний факт", "Осьминоги имеют три сердца.")


async def test_newsletter_failure_is_explained(storage, clock):
    storage.add_reminder(100, "мотивация на день", int(clock().timestamp()), "Сергей", 100, "01234", True)
    service, session = make_service(
        storage, clock, FakeAssistant(error=AssistantError("Дневной лимит исчерпан"))
    )
    await service.tick()
    assert (
        session.sent()[0].text == "📬 Мотивация на день\n\nСегодня без нового выпуска: Дневной лимит исчерпан"
    )


async def test_missed_days_send_once(storage, clock):
    reminder_id = storage.add_reminder(
        100, "зарядка", int(at("2026-11-01 08:00").timestamp()), "Сергей", 100, "0123456"
    )
    service, session = make_service(storage, clock)
    assert await service.tick() == 1
    assert "бот был выключен" in session.sent()[0].text
    assert storage.reminder(reminder_id).due_at == int(
        at("2026-11-05 08:00").timestamp()
    )  # дальше — по графику


async def test_one_time_reminder_still_works(storage, clock):
    reminder_id = storage.add_reminder(100, "позвонить маме", int(clock().timestamp()), "Сергей", 100)
    service, session = make_service(storage, clock)
    await service.tick()
    assert session.sent()[0].text == "⏰ Напоминание: позвонить маме"
    assert storage.reminder(reminder_id).status == "sent"


# ---------- текст рассылки от Claude ----------


async def test_scheduled_message_request(assistant, fake_claude, storage):
    fake_claude.messages.queue.append(claude_text("Пчёлы танцуют, чтобы показать дорогу к цветам."))
    text = await assistant.scheduled_message(
        100, "Сергей", "интересный факт", "каждый день в 08:00", ("Старый факт",)
    )
    assert text == "Пчёлы танцуют, чтобы показать дорогу к цветам."

    [call] = fake_claude.messages.calls
    assert [t["name"] for t in call["tools"]] == ["web_search"]  # инструментов бота тут нет
    assert call["output_config"] == {"effort": "low"}
    request = call["messages"][0]["content"]
    assert "«интересный факт»" in request and "каждый день в 08:00" in request and "Старый факт" in request
    assert storage.spent_by_kind("2026-11-04")["daily"].requests == 1
    # выпуск в истории — можно ответить «расскажи подробнее»
    assert storage.history(100, 20)[-1]["content"] == text


async def test_scheduled_message_respects_budget(assistant, fake_claude):
    assistant.daily_budget_usd = 0.001
    await assistant.ask(1, SERGEY, "Привет")
    with pytest.raises(AssistantError, match="лимит"):
        await assistant.scheduled_message(1, "Сергей", "факт", "каждый день в 08:00")


# ---------- целиком через Telegram ----------


class Env:
    def __init__(self, assistant, storage, clock):
        self.session = FakeTelegramSession()
        self.bot = Bot(token="123456:TEST", session=self.session)
        deps = Deps(assistant=assistant, storage=storage, clock=clock)
        self.dp = build_dispatcher(deps, Settings(telegram_token="x", anthropic_api_key="y"))

    async def send(self, text, **kw):
        await self.dp.feed_update(self.bot, make_update(text, **kw))

    async def press(self, data, **kw):
        await self.dp.feed_update(self.bot, make_callback(data, **kw))


async def test_every_morning_interesting_fact(assistant, storage, clock, fake_claude):
    env = Env(assistant, storage, clock)
    fake_claude.messages.queue += [
        claude_message(
            tool_use(
                "create_reminder",
                {
                    "text": "интересный факт",
                    "when": "2026-11-05 08:00",
                    "for_whom": "",
                    "repeat": "daily",
                    "generate": True,
                },
            ),
            stop_reason="tool_use",
        ),
        claude_text("Готово! Каждое утро в 08:00 буду присылать интересный факт."),
    ]
    await env.send("Присылай мне каждое утро какой-нибудь интересный факт")
    assert env.session.sent()[-1].text.startswith("Готово!")

    clock.now = at("2026-11-05 08:00")  # наступило утро
    fake_claude.messages.queue.append(claude_text("Улитки могут спать до трёх лет."))
    service = ReminderService(env.bot, storage, clock, assistant=assistant)
    assert await service.tick() == 1
    assert env.session.sent()[-1].text == "📬 Интересный факт\n\nУлитки могут спать до трёх лет."

    await env.send("⏰ Напоминания")
    assert "каждый день в 08:00 — 🤖 интересный факт" in env.session.sent()[-1].text


async def test_recurring_buttons(assistant, storage, clock):
    env = Env(assistant, storage, clock)
    reminder_id = storage.add_reminder(100, "зарядка", int(clock().timestamp()), "Сергей", 100, "0123456")

    await env.press(f"rem:done:{reminder_id}")  # «сделано» не отменяет повтор
    assert storage.reminder(reminder_id).status == "pending"
    await env.press(f"rem:snz:{reminder_id}:15")
    assert storage.reminder(reminder_id).due_at == int(clock().timestamp())  # не сдвинули

    await env.press(f"rem:stop:{reminder_id}")
    assert storage.reminder(reminder_id).status == "cancelled"
    assert env.session.sent()[-1].text.startswith("🔕 Отключил: «зарядка»")
