"""Отправка напоминаний в нужное время."""

from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError
from aiogram.methods import SendMessage

from family_bot.reminders import ReminderService

from .conftest import FakeTelegramSession


def make_service(storage, clock):
    session = FakeTelegramSession()
    bot = Bot(token="123456:TEST-TOKEN", session=session)
    return ReminderService(bot, storage, clock), session


async def test_sends_only_due_reminders(storage, clock):
    now = int(clock().timestamp())
    storage.add_reminder(200, "забрать Катю", now + 60, created_by="Сергей", created_by_chat=100)
    service, session = make_service(storage, clock)

    assert await service.tick() == 0  # ещё рано
    clock.advance(minutes=1)
    assert await service.tick() == 1

    [sent] = session.sent()
    assert sent.chat_id == 200
    assert sent.text == "⏰ Напоминание: забрать Катю\nОт: Сергей"
    buttons = [b.text for row in sent.reply_markup.inline_keyboard for b in row]
    assert buttons == ["✅ Сделано", "⏰ +15 мин", "⏰ +1 час", "📅 Завтра"]

    assert await service.tick() == 0  # второй раз не отправляем


async def test_late_reminder_says_so(storage, clock):
    storage.add_reminder(100, "выпить таблетку", int(clock().timestamp()) - 3600, "Сергей", 100)
    service, session = make_service(storage, clock)
    await service.tick()
    assert "бот был выключен" in session.sent()[0].text
    assert "От:" not in session.sent()[0].text  # сам себе — без подписи


async def test_blocked_user_does_not_break_others(storage, clock):
    now = int(clock().timestamp())
    first = storage.add_reminder(300, "кому-то", now, "Сергей", 100)
    storage.add_reminder(100, "себе", now, "Сергей", 100)
    service, session = make_service(storage, clock)

    original = session.make_request

    async def make_request(bot, method, timeout=None):
        if isinstance(method, SendMessage) and method.chat_id == 300:
            raise TelegramForbiddenError(method=method, message="bot was blocked by the user")
        return await original(bot, method, timeout)

    session.make_request = make_request
    assert await service.tick() == 1
    assert storage.reminder(first).status == "failed"
