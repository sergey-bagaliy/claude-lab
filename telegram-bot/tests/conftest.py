"""Общие заглушки для тестов: подменяем Claude API и Telegram API.

Ни один тест не ходит в интернет и не тратит деньги.
"""

from __future__ import annotations

import asyncio
import copy
import itertools
from datetime import datetime, timedelta
from typing import Any

import anthropic
import httpx2
import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import GetMe, SendMessage
from aiogram.types import CallbackQuery, Chat, Message, Update, User
from anthropic.types.beta import BetaMessage

from family_bot.assistant import FamilyAssistant, Person
from family_bot.media import Photo
from family_bot.storage import Storage
from family_bot.timeutil import TZ

SERGEY = Person(user_id=100, name="Сергей")
VIKA = Person(user_id=200, name="Вика")

_ids = itertools.count(1)


# ---------- время ----------


class FakeClock:
    """Часы, которые можно перевести вперёд."""

    def __init__(self, start: datetime) -> None:
        self.now = start

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **kwargs: Any) -> None:
        self.now += timedelta(**kwargs)


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock(datetime(2026, 11, 4, 15, 0, tzinfo=TZ))  # среда, 15:00


# ---------- ответы Claude ----------


def text(value: str, citations: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {"type": "text", "text": value, "citations": citations}


def citation(url: str, title: str) -> dict[str, Any]:
    return {
        "type": "web_search_result_location",
        "url": url,
        "title": title,
        "encrypted_index": "x",
        "cited_text": "…",
    }


def thinking() -> dict[str, Any]:
    return {"type": "thinking", "thinking": "", "signature": "sig"}


def tool_use(name: str, data: dict[str, Any]) -> dict[str, Any]:
    return {"type": "tool_use", "id": f"toolu_{next(_ids)}", "name": name, "input": data}


def server_search(query: str = "рецепт") -> dict[str, Any]:
    return {
        "type": "server_tool_use",
        "id": f"srvtoolu_{next(_ids)}",
        "name": "web_search",
        "input": {"query": query},
    }


def search_results(*urls: str) -> dict[str, Any]:
    """Блок с результатами поиска, как его присылает API."""
    return {
        "type": "web_search_tool_result",
        "tool_use_id": f"srvtoolu_{next(_ids)}",
        "content": [
            {"type": "web_search_result", "url": url, "title": f"Страница {n}", "encrypted_content": "e"}
            for n, url in enumerate(urls, start=1)
        ],
    }


def claude_message(
    *blocks: dict[str, Any], stop_reason: str = "end_turn", searches: int = 0, stop_details: Any = None
) -> BetaMessage:
    """Настоящий объект ответа SDK, как будто пришёл от API."""
    return BetaMessage.model_validate(
        {
            "id": f"msg_{next(_ids)}",
            "type": "message",
            "role": "assistant",
            "model": "claude-sonnet-5-5",
            "content": list(blocks),
            "stop_reason": stop_reason,
            "stop_sequence": None,
            "stop_details": stop_details,
            "usage": {
                "input_tokens": 1000,
                "output_tokens": 200,
                "cache_read_input_tokens": 0,
                "cache_creation_input_tokens": 0,
                "server_tool_use": {"web_search_requests": searches, "web_fetch_requests": 0},
            },
        }
    )


def claude_text(value: str = "Ответ Claude", **kwargs: Any) -> BetaMessage:
    return claude_message(thinking(), text(value), **kwargs)


RECIPE_INPUT = {
    "title": "Курица с рисом",
    "source_url": "https://example.ru/recipe/kurica-s-risom",
    "cook_time_minutes": 40,
    "servings": 4,
    "ingredients": ["курица — 600 г", "рис — 1 стакан", "морковь — 1 шт."],
    "steps": ["Обжарить курицу.", "Добавить морковь.", "Добавить рис и воду, тушить 20 минут."],
    "kids_tip": "Кате — без перца, Никита может помыть морковь.",
}


def recipe_turn() -> BetaMessage:
    """Claude поискал в интернете и вызвал show_recipe."""
    return claude_message(
        thinking(), server_search(), tool_use("show_recipe", RECIPE_INPUT), stop_reason="tool_use", searches=1
    )


def api_status_error(cls: type[anthropic.APIStatusError], status: int, message: str = "error"):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls(message, response=httpx2.Response(status, request=request), body=None)


def api_connection_error() -> anthropic.APIConnectionError:
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return anthropic.APIConnectionError(request=request)


class FakeMessages:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.queue: list[BetaMessage | Exception] = []
        self.delay = 0.0  # сколько секунд «думает» Claude

    async def create(self, **kwargs: Any) -> BetaMessage:
        self.calls.append(copy.deepcopy(kwargs))
        await asyncio.sleep(self.delay)
        item = self.queue.pop(0) if self.queue else claude_text()
        if isinstance(item, Exception):
            raise item
        return item


class FakeClaude:
    """Подмена anthropic.AsyncAnthropic: запоминает запросы, отдаёт заготовленные ответы."""

    def __init__(self) -> None:
        self.messages = FakeMessages()
        self.beta = self  # бот вызывает client.beta.messages.create


def make_photo(n: int) -> Photo:
    return Photo(
        url=f"https://upload.wikimedia.org/thumb/{n}.jpg",
        page_url=f"https://commons.wikimedia.org/wiki/File:{n}.jpg",
        author=f"Автор {n}",
        license="CC BY-SA 4.0",
    )


class FakePhotos:
    """Подмена поиска фото в Wikimedia Commons."""

    def __init__(self, count: int = 3) -> None:
        self.count = count
        self.queries: list[str] = []

    async def search(self, query: str, limit: int = 6) -> list[Photo]:
        self.queries.append(query)
        return [make_photo(n) for n in range(1, self.count + 1)]


@pytest.fixture
def fake_photos() -> FakePhotos:
    return FakePhotos()


@pytest.fixture
def fake_claude() -> FakeClaude:
    return FakeClaude()


@pytest.fixture
def storage() -> Storage:
    db = Storage(":memory:")
    yield db
    db.close()


@pytest.fixture
def assistant(
    fake_claude: FakeClaude, storage: Storage, clock: FakeClock, fake_photos: FakePhotos
) -> FamilyAssistant:
    storage.touch_user(SERGEY.user_id, SERGEY.name, SERGEY.user_id, 0)
    return FamilyAssistant(
        client=fake_claude,  # type: ignore[arg-type]
        storage=storage,
        model="claude-sonnet-5-5",
        memory_size=20,
        daily_budget_usd=0,
        clock=clock,
        photos=fake_photos,  # type: ignore[arg-type]
    )


# ---------- Telegram ----------

BOT_USER = User(id=1, is_bot=True, first_name="Помощник", username="family_helper_krd_bot")


class FakeTelegramSession(BaseSession):
    """Подмена сетевой сессии aiogram: ничего не отправляет, всё запоминает."""

    def __init__(self) -> None:
        super().__init__()
        self.requests: list[Any] = []

    async def make_request(self, bot: Bot, method: Any, timeout: int | None = None) -> Any:
        if isinstance(method, GetMe):
            return BOT_USER
        self.requests.append(method)
        if isinstance(method, SendMessage):
            return Message(
                message_id=len(self.requests),
                date=datetime.now(),
                chat=Chat(id=int(method.chat_id), type="private"),
                text=method.text,
            )
        return True

    async def stream_content(self, *args: Any, **kwargs: Any):  # pragma: no cover
        yield b""

    async def close(self) -> None:
        pass

    def sent(self) -> list[SendMessage]:
        return [r for r in self.requests if isinstance(r, SendMessage)]

    def of_type(self, cls: type) -> list[Any]:
        return [r for r in self.requests if isinstance(r, cls)]


def _user(user_id: int) -> User:
    name = {100: "Сергей", 200: "Вика"}.get(user_id, "Гость")
    return User(id=user_id, is_bot=False, first_name=name)


def make_update(
    value: str | None = None, user_id: int = 100, chat_id: int | None = None, **extra: Any
) -> Update:
    update_id = next(_ids)
    chat_id = chat_id if chat_id is not None else user_id
    message = Message(
        message_id=update_id,
        date=datetime.now(),
        chat=Chat(id=chat_id, type="private" if chat_id > 0 else "group"),
        from_user=_user(user_id),
        text=value,
        **extra,
    )
    return Update(update_id=update_id, message=message)


def make_callback(data: str, user_id: int = 100, chat_id: int | None = None, message_id: int = 777) -> Update:
    update_id = next(_ids)
    chat_id = chat_id if chat_id is not None else user_id
    message = Message(
        message_id=message_id,
        date=datetime.now(),
        chat=Chat(id=chat_id, type="private"),
        from_user=BOT_USER,
        text="сообщение бота",
    )
    callback = CallbackQuery(
        id=str(update_id), from_user=_user(user_id), chat_instance="ci", data=data, message=message
    )
    return Update(update_id=update_id, callback_query=callback)
