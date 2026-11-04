"""Общие заглушки для тестов: подменяем Claude API и Telegram API.

Ни один тест не ходит в интернет и не тратит деньги.
"""

from __future__ import annotations

import asyncio
import copy
from datetime import date, datetime
from typing import Any

import anthropic
import httpx2
import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import SendMessage
from aiogram.types import Chat, Message, Update, User
from anthropic.types import Message as ClaudeMessage

from family_bot.assistant import FamilyAssistant
from family_bot.memory import ChatMemory

TODAY = date(2026, 11, 4)  # среда, осень


def claude_response(
    text: str | None = "Ответ Claude",
    stop_reason: str = "end_turn",
    with_thinking: bool = True,
    stop_details: dict[str, Any] | None = None,
) -> ClaudeMessage:
    """Настоящий объект ответа SDK, как будто пришёл от API."""
    content: list[dict[str, Any]] = []
    if with_thinking:
        # Модель может прислать блок «размышлений» — его показывать не надо.
        content.append({"type": "thinking", "thinking": "", "signature": "sig"})
    if text is not None:
        content.append({"type": "text", "text": text, "citations": None})
    return ClaudeMessage.model_validate(
        {
            "id": "msg_test",
            "type": "message",
            "role": "assistant",
            "model": "claude-haiku-5-5",
            "content": content,
            "stop_reason": stop_reason,
            "stop_sequence": None,
            "stop_details": stop_details,
            "usage": {"input_tokens": 10, "output_tokens": 5},
        }
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
        self.queue: list[ClaudeMessage | Exception] = []
        self.delay = 0.0  # сколько секунд «думает» Claude

    async def create(self, **kwargs: Any) -> ClaudeMessage:
        self.calls.append(copy.deepcopy(kwargs))
        await asyncio.sleep(self.delay)  # как настоящий сетевой запрос — отдаём управление
        item = self.queue.pop(0) if self.queue else claude_response()
        if isinstance(item, Exception):
            raise item
        return item


class FakeClaude:
    """Подмена anthropic.AsyncAnthropic: запоминает запросы, отдаёт заготовленные ответы."""

    def __init__(self) -> None:
        self.messages = FakeMessages()


class FakeTelegramSession(BaseSession):
    """Подмена сетевой сессии aiogram: ничего не отправляет, всё запоминает."""

    def __init__(self) -> None:
        super().__init__()
        self.requests: list[Any] = []

    async def make_request(self, bot: Bot, method: Any, timeout: int | None = None) -> Any:
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

    def sent_messages(self) -> list[SendMessage]:
        return [r for r in self.requests if isinstance(r, SendMessage)]


@pytest.fixture
def fake_claude() -> FakeClaude:
    return FakeClaude()


@pytest.fixture
def assistant(fake_claude: FakeClaude) -> FamilyAssistant:
    return FamilyAssistant(
        client=fake_claude,  # type: ignore[arg-type]
        model="claude-haiku-5-5",
        memory=ChatMemory(20),
        today=lambda: TODAY,
    )


_update_id = 0


def make_update(text: str | None = None, user_id: int = 100, chat_id: int = 100, **extra: Any) -> Update:
    global _update_id
    _update_id += 1
    message = Message(
        message_id=_update_id,
        date=datetime.now(),
        chat=Chat(id=chat_id, type="private"),
        from_user=User(id=user_id, is_bot=False, first_name="Сергей"),
        text=text,
        **extra,
    )
    return Update(update_id=_update_id, message=message)
