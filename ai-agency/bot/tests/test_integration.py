"""Сквозной тест: настоящий Dispatcher aiogram + подменённая сессия Telegram + подменённый Anthropic.

Проверяет, что фильтры, порядок обработчиков, FSM и подстановка зависимостей работают вместе.
"""

from datetime import datetime
from typing import Any

import pytest
from aiogram import Bot, Dispatcher
from aiogram.client.session.base import BaseSession
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.methods import TelegramMethod
from aiogram.types import CallbackQuery, Chat, Contact, Message, Update, User

from admin_bot.ai import AIAssistant
from admin_bot.handlers import create_router
from admin_bot.keyboards import MENU_BOOK
from admin_bot.settings import Settings

from .conftest import NOW, FakeAnthropic, response, text_block

USER = User(id=111, is_bot=False, first_name="Иван")
CHAT = Chat(id=111, type="private")
FAKE_TOKEN = "42:TEST"  # не настоящий токен — сеть не используется


class FakeSession(BaseSession):
    """Вместо HTTP-запросов к Telegram запоминает вызванные методы."""

    def __init__(self) -> None:
        super().__init__()
        self.requests: list[TelegramMethod] = []

    async def make_request(self, bot: Bot, method: TelegramMethod, timeout: int | None = None) -> Any:
        self.requests.append(method)
        if method.__returning__ is Message:
            return Message(message_id=len(self.requests), date=datetime.now(), chat=CHAT, text=getattr(method, "text", ""))
        return True

    async def stream_content(self, *args, **kwargs):  # pragma: no cover - не используется
        raise NotImplementedError

    async def close(self) -> None:
        pass

    def sent_texts(self) -> list[str]:
        return [getattr(r, "text", "") for r in self.requests if getattr(r, "text", None)]


@pytest.fixture
def wired(env):
    session = FakeSession()
    bot = Bot(token=FAKE_TOKEN, session=session)
    api = FakeAnthropic()
    assistant = AIAssistant(api, env.business, env.booking, env.db)
    settings = Settings.from_env({"TELEGRAM_BOT_TOKEN": FAKE_TOKEN, "ANTHROPIC_API_KEY": "test", "OWNER_CHAT_ID": "777"})
    dp = Dispatcher(
        storage=MemoryStorage(), db=env.db, business=env.business, booking=env.booking,
        assistant=assistant, settings=settings,
    )
    dp.include_router(create_router())
    counter = iter(range(1, 1000))

    async def send_text(text: str | None = None, contact: Contact | None = None) -> None:
        msg = Message(message_id=next(counter), date=datetime.now(), chat=CHAT, from_user=USER, text=text, contact=contact)
        await dp.feed_update(bot, Update(update_id=next(counter), message=msg))

    async def press(data: str) -> None:
        origin = Message(message_id=next(counter), date=datetime.now(), chat=CHAT, text="…")
        cq = CallbackQuery(id=str(next(counter)), from_user=USER, chat_instance="x", data=data, message=origin)
        await dp.feed_update(bot, Update(update_id=next(counter), callback_query=cq))

    return session, api, send_text, press


async def test_end_to_end_consent_ai_and_booking(wired, env):
    session, api, send_text, press = wired

    await send_text("/start")
    assert "согласие" in session.sent_texts()[-1]

    await send_text("Где вы находитесь?")  # без согласия ИИ не вызывается
    assert api.calls == []

    await press("consent:yes")
    assert env.db.has_consent(111)

    api.responses = [response("end_turn", text_block("Мы на ул. Примерной."))]
    await send_text("Где вы находитесь?")
    assert session.sent_texts()[-1] == "Мы на ул. Примерной."

    await send_text(MENU_BOOK)
    await press("svc:consultation")
    await press("day:consultation:2026-11-05")
    await press("slot:consultation:2026-11-05:1000")
    await send_text("Иван")
    await send_text(contact=Contact(phone_number="+79181234567", first_name="Иван"))
    await press("book:confirm")

    [booking] = env.db.upcoming_for_user(111, NOW)
    assert booking.start.hour == 10 and booking.phone == "+79181234567"
    assert len(api.calls) == 1  # шаги формы не уходили в ИИ
    assert any("Вы записаны" in t for t in session.sent_texts())
