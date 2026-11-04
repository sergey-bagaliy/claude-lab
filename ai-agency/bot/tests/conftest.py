"""Общие заготовки для тестов: фиксированное время, база в памяти, подменённый API Anthropic и Telegram.

Никаких реальных запросов в сеть: Anthropic и Telegram заменены «фейками».
"""

from __future__ import annotations

import copy
import itertools
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.base import StorageKey
from aiogram.fsm.storage.memory import MemoryStorage

from admin_bot.ai import AIAssistant
from admin_bot.booking import BookingService, ClientInfo
from admin_bot.business import Business, load_business
from admin_bot.storage import Storage

ROOT = Path(__file__).resolve().parents[1]
CONFIGS = ROOT / "configs"

# Среда, 4 ноября 2026, 10:00 по Москве (Краснодар).
NOW = datetime.fromisoformat("2026-11-04T10:00:00+03:00")


class FakeNotifier:
    def __init__(self) -> None:
        self.messages: list[str] = []

    async def notify_owner(self, text: str) -> None:
        self.messages.append(text)


# ------------------------------------------------------------ подмена Anthropic API

_ids = itertools.count(1)


def text_block(text: str) -> SimpleNamespace:
    return SimpleNamespace(type="text", text=text)


def thinking_block() -> SimpleNamespace:
    return SimpleNamespace(type="thinking", thinking="", signature="sig")


def tool_use(name: str, **inputs: Any) -> SimpleNamespace:
    return SimpleNamespace(type="tool_use", id=f"toolu_{next(_ids)}", name=name, input=inputs)


def response(stop_reason: str, *blocks: SimpleNamespace) -> SimpleNamespace:
    return SimpleNamespace(stop_reason=stop_reason, content=list(blocks))


class _FakeMessages:
    def __init__(self, owner: FakeAnthropic, kind: str):
        self._owner = owner
        self._kind = kind

    async def create(self, **kwargs: Any) -> Any:
        # Копируем список сообщений: код дальше дописывает в него, а нам нужен снимок на момент вызова.
        snapshot = dict(kwargs)
        snapshot["messages"] = copy.copy(kwargs["messages"])
        self._owner.calls.append((self._kind, snapshot))
        if not self._owner.responses:
            raise AssertionError("FakeAnthropic: закончились заготовленные ответы")
        item = self._owner.responses.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item


class FakeAnthropic:
    """Повторяет нужную нам часть AsyncAnthropic: client.messages.create и client.beta.messages.create."""

    def __init__(self, responses: list[Any] | None = None):
        self.responses = list(responses or [])
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.messages = _FakeMessages(self, "messages")
        self.beta = SimpleNamespace(messages=_FakeMessages(self, "beta"))


# ------------------------------------------------------------ подмена Telegram


class Recorder:
    """Асинхронная функция, которая запоминает, с чем её вызвали."""

    def __init__(self) -> None:
        self.calls: list[tuple[tuple, dict]] = []

    async def __call__(self, *args: Any, **kwargs: Any) -> None:
        self.calls.append((args, kwargs))

    @property
    def texts(self) -> list[str]:
        return [args[0] if args else kwargs.get("text", "") for args, kwargs in self.calls]

    @property
    def last_markup(self) -> Any:
        return self.calls[-1][1].get("reply_markup") if self.calls else None


def make_user(user_id: int = 111, name: str = "Иван Петров", username: str | None = "ivan") -> SimpleNamespace:
    return SimpleNamespace(id=user_id, full_name=name, username=username)


class FakeMessage:
    def __init__(self, text: str | None = None, user_id: int = 111, contact: Any = None):
        self.text = text
        self.contact = contact
        self.from_user = make_user(user_id)
        self.chat = SimpleNamespace(id=user_id)
        self.bot = SimpleNamespace(send_chat_action=Recorder())
        self.answer = Recorder()
        self.edit_text = Recorder()


class FakeCallback:
    def __init__(self, data: str, user_id: int = 111):
        self.data = data
        self.from_user = make_user(user_id)
        self.message = FakeMessage(user_id=user_id)
        self.answer = Recorder()


def callback_datas(markup: Any) -> list[str]:
    return [b.callback_data for row in markup.inline_keyboard for b in row if b.callback_data]


# ------------------------------------------------------------ фикстуры


@pytest.fixture
def business() -> Business:
    return load_business(CONFIGS / "dentistry.yaml")


@pytest.fixture
def auto_business() -> Business:
    return load_business(CONFIGS / "autoservice.yaml")


@pytest.fixture
def notifier() -> FakeNotifier:
    return FakeNotifier()


def _make_env(biz: Business, notifier: FakeNotifier) -> tuple[Storage, BookingService]:
    db = Storage(":memory:", biz.schedule.tz)
    return db, BookingService(biz, db, notifier, clock=lambda: NOW)


@pytest.fixture
def env(business: Business, notifier: FakeNotifier):
    db, booking = _make_env(business, notifier)
    yield SimpleNamespace(business=business, db=db, booking=booking, notifier=notifier)
    db.close()


@pytest.fixture
def auto_env(auto_business: Business, notifier: FakeNotifier):
    db, booking = _make_env(auto_business, notifier)
    yield SimpleNamespace(business=auto_business, db=db, booking=booking, notifier=notifier)
    db.close()


@pytest.fixture
def client() -> ClientInfo:
    return ClientInfo(user_id=111, full_name="Иван Петров", username="ivan")


@pytest.fixture
def fake_api() -> FakeAnthropic:
    return FakeAnthropic()


@pytest.fixture
def assistant(env, fake_api: FakeAnthropic) -> AIAssistant:
    return AIAssistant(fake_api, env.business, env.booking, env.db)


@pytest.fixture
def state() -> FSMContext:
    return FSMContext(storage=MemoryStorage(), key=StorageKey(bot_id=1, chat_id=111, user_id=111))
