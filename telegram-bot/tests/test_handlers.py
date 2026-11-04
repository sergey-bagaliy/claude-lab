"""Бот целиком: апдейт Telegram → aiogram → обработчик → ответ.

Telegram подменён FakeTelegramSession, Claude — FakeClaude.
"""

import pytest
from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.methods import SendChatAction
from aiogram.types import PhotoSize

from family_bot.app import build_dispatcher
from family_bot.config import Settings

from .conftest import FakeTelegramSession, api_connection_error, claude_response, make_update


def make_bot(assistant, allowed_user_ids=frozenset()):
    session = FakeTelegramSession()
    bot = Bot(token="123456:TEST-TOKEN", session=session)
    settings = Settings(
        telegram_token="123456:TEST-TOKEN",
        anthropic_api_key="sk-ant-test",
        allowed_user_ids=frozenset(allowed_user_ids),
    )
    return bot, session, build_dispatcher(assistant, settings)


@pytest.fixture
def env(assistant):
    return make_bot(assistant)


async def test_start(env, fake_claude):
    bot, session, dp = env
    await dp.feed_update(bot, make_update("/start"))

    [sent] = session.sent_messages()
    assert "Семейный помощник" in sent.text
    for command in ("/primery", "/vyhodnye", "/sbros"):
        assert command in sent.text
    assert fake_claude.messages.calls == []


async def test_primery(env, fake_claude):
    bot, session, dp = env
    await dp.feed_update(bot, make_update("/primery"))

    [sent] = session.sent_messages()
    assert sent.parse_mode == ParseMode.HTML
    assert sent.text.count("<tg-spoiler>") == 10
    assert "Никита" in sent.text
    assert fake_claude.messages.calls == []  # примеры без Claude — бесплатно


async def test_primery_for_one_number(env):
    bot, session, dp = env
    await dp.feed_update(bot, make_update("/primery 7"))
    [sent] = session.sent_messages()
    assert sent.text.count("7 × ") == 10


@pytest.mark.parametrize("arg", ["12", "1", "abc", "-3"])
async def test_primery_bad_argument(env, arg):
    bot, session, dp = env
    await dp.feed_update(bot, make_update(f"/primery {arg}"))
    [sent] = session.sent_messages()
    assert "от 2 до 9" in sent.text


async def test_vyhodnye(env, fake_claude):
    bot, session, dp = env
    fake_claude.messages.queue.append(claude_response("Идея 1: пикник"))
    fake_claude.messages.delay = 0.05
    await dp.feed_update(bot, make_update("/vyhodnye"))

    texts = [m.text for m in session.sent_messages()]
    assert texts[0].startswith("Подбираю идеи")
    assert texts[-1] == "Идея 1: пикник"
    assert "выходные" in fake_claude.messages.calls[0]["messages"][-1]["content"]
    assert any(isinstance(r, SendChatAction) for r in session.requests)  # «печатает…»


async def test_dialog_with_memory(env, fake_claude):
    bot, session, dp = env
    fake_claude.messages.queue += [claude_response("Запомнил!"), claude_response("Вас зовут Сергей.")]

    await dp.feed_update(bot, make_update("Меня зовут Сергей"))
    await dp.feed_update(bot, make_update("Как меня зовут?"))

    assert [m.text for m in session.sent_messages()] == ["Запомнил!", "Вас зовут Сергей."]
    assert len(fake_claude.messages.calls[1]["messages"]) == 3
    assert session.sent_messages()[0].parse_mode is None  # ответ Claude — простой текст


async def test_sbros(env, fake_claude):
    bot, session, dp = env
    await dp.feed_update(bot, make_update("Привет"))
    await dp.feed_update(bot, make_update("/sbros"))
    await dp.feed_update(bot, make_update("Ещё вопрос"))

    assert "забыл" in session.sent_messages()[1].text
    assert fake_claude.messages.calls[1]["messages"] == [{"role": "user", "content": "Ещё вопрос"}]


async def test_long_answer_is_split(env, fake_claude):
    bot, session, dp = env
    fake_claude.messages.queue.append(claude_response("абзац\n" * 1500))  # 9000 символов
    await dp.feed_update(bot, make_update("Расскажи подробно"))

    sent = session.sent_messages()
    assert len(sent) == 3
    assert all(len(m.text) <= 4096 for m in sent)


async def test_claude_error_is_shown_politely(env, fake_claude):
    bot, session, dp = env
    fake_claude.messages.queue.append(api_connection_error())
    await dp.feed_update(bot, make_update("Привет"))

    [sent] = session.sent_messages()
    assert sent.text.startswith("⚠️")
    assert "интернет" in sent.text


async def test_unknown_command_does_not_go_to_claude(env, fake_claude):
    bot, session, dp = env
    await dp.feed_update(bot, make_update("/kakaya-to"))
    assert "не знаю" in session.sent_messages()[0].text
    assert fake_claude.messages.calls == []


async def test_photo_is_not_supported(env, fake_claude):
    bot, session, dp = env
    photo = [PhotoSize(file_id="f", file_unique_id="u", width=10, height=10)]
    await dp.feed_update(bot, make_update(None, photo=photo))
    assert "только текстовые" in session.sent_messages()[0].text
    assert fake_claude.messages.calls == []


async def test_stranger_is_blocked_when_list_is_set(assistant, fake_claude):
    bot, session, dp = make_bot(assistant, allowed_user_ids={111})
    await dp.feed_update(bot, make_update("Привет", user_id=999, chat_id=999))

    [sent] = session.sent_messages()
    assert "999" in sent.text and "ALLOWED_USER_IDS" in sent.text
    assert fake_claude.messages.calls == []


async def test_family_member_passes_when_list_is_set(assistant, fake_claude):
    bot, session, dp = make_bot(assistant, allowed_user_ids={111})
    await dp.feed_update(bot, make_update("Привет", user_id=111, chat_id=111))

    assert session.sent_messages()[0].text == "Ответ Claude"
    assert len(fake_claude.messages.calls) == 1
