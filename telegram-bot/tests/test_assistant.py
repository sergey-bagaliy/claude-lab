"""Логика общения с Claude. API подменён заглушкой FakeClaude."""

import asyncio

import anthropic
import pytest

from family_bot.assistant import EFFORT, MAX_TOKENS, TRUNCATED_NOTE, AssistantError

from .conftest import api_connection_error, api_status_error, claude_response


async def test_request_parameters(assistant, fake_claude):
    await assistant.ask(1, "Привет!")

    [call] = fake_claude.messages.calls
    assert call["model"] == "claude-haiku-5-5"
    assert call["max_tokens"] == MAX_TOKENS
    assert call["output_config"] == {"effort": EFFORT}
    assert call["messages"] == [{"role": "user", "content": "Привет!"}]
    assert "Никита" in call["system"] and "Краснодар" in call["system"]
    # Эти параметры новые модели не принимают — их быть не должно.
    for forbidden in ("temperature", "top_p", "top_k"):
        assert forbidden not in call


async def test_returns_only_text_without_thinking(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_response("Добрый день!", with_thinking=True))
    assert await assistant.ask(1, "Привет") == "Добрый день!"


async def test_dialog_remembers_previous_messages(assistant, fake_claude):
    fake_claude.messages.queue += [
        claude_response("Приятно познакомиться, Сергей!"),
        claude_response("Сергей"),
    ]
    await assistant.ask(1, "Меня зовут Сергей")
    await assistant.ask(1, "Как меня зовут?")

    second_call = fake_claude.messages.calls[1]
    assert second_call["messages"] == [
        {"role": "user", "content": "Меня зовут Сергей"},
        {"role": "assistant", "content": "Приятно познакомиться, Сергей!"},
        {"role": "user", "content": "Как меня зовут?"},
    ]


async def test_memory_limit_is_applied(assistant, fake_claude):
    assistant.memory.max_messages = 4
    for i in range(5):
        await assistant.ask(1, f"вопрос {i}")

    last_call = fake_claude.messages.calls[-1]
    # 4 сообщения из памяти + новый вопрос
    assert len(last_call["messages"]) == 5
    assert last_call["messages"][0] == {"role": "user", "content": "вопрос 2"}


async def test_chats_do_not_mix(assistant, fake_claude):
    await assistant.ask(1, "секрет первого чата")
    await assistant.ask(2, "вопрос второго чата")
    assert fake_claude.messages.calls[1]["messages"] == [{"role": "user", "content": "вопрос второго чата"}]


async def test_reset_forgets_history(assistant, fake_claude):
    await assistant.ask(1, "запомни")
    assistant.reset(1)
    await assistant.ask(1, "что я просил?")
    assert len(fake_claude.messages.calls[1]["messages"]) == 1


async def test_parallel_messages_in_one_chat_are_processed_in_order(assistant, fake_claude):
    fake_claude.messages.queue += [claude_response("ответ 1"), claude_response("ответ 2")]
    await asyncio.gather(assistant.ask(1, "вопрос 1"), assistant.ask(1, "вопрос 2"))

    second_call = fake_claude.messages.calls[1]
    assert second_call["messages"] == [
        {"role": "user", "content": "вопрос 1"},
        {"role": "assistant", "content": "ответ 1"},
        {"role": "user", "content": "вопрос 2"},
    ]


async def test_weekend_ideas_go_through_claude_and_memory(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_response("1. Парк Галицкого…"))
    reply = await assistant.weekend_ideas(1)

    assert reply == "1. Парк Галицкого…"
    request = fake_claude.messages.calls[0]["messages"][-1]["content"]
    assert "выходные" in request and "8 и 3 года" in request and "осень" in request
    assert len(assistant.memory.get(1)) == 2  # можно задавать уточняющие вопросы


async def test_truncated_answer_gets_note(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_response("Длинный ответ", stop_reason="max_tokens"))
    assert await assistant.ask(1, "Расскажи всё") == "Длинный ответ" + TRUNCATED_NOTE


async def test_refusal(assistant, fake_claude):
    fake_claude.messages.queue.append(
        claude_response(
            None,
            stop_reason="refusal",
            stop_details={"type": "refusal", "category": "general_harms", "explanation": None},
        )
    )
    with pytest.raises(AssistantError, match="не могу"):
        await assistant.ask(1, "плохой вопрос")
    assert assistant.memory.get(1) == []


async def test_empty_answer(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_response(None))
    with pytest.raises(AssistantError, match="пустой"):
        await assistant.ask(1, "?")


@pytest.mark.parametrize(
    "error, expected",
    [
        (api_status_error(anthropic.AuthenticationError, 401), "ANTHROPIC_API_KEY"),
        (api_status_error(anthropic.PermissionDeniedError, 403), "доступа"),
        (api_status_error(anthropic.NotFoundError, 404), "CLAUDE_MODEL"),
        (api_status_error(anthropic.RateLimitError, 429), "Подождите"),
        (
            api_status_error(
                anthropic.BadRequestError, 400, "Your credit balance is too low to access the Anthropic API."
            ),
            "баланс",
        ),
        (api_status_error(anthropic.BadRequestError, 400, "invalid request"), "/sbros"),
        (api_status_error(anthropic.InternalServerError, 529, "Overloaded"), "перегружен"),
        (api_connection_error(), "интернет"),
    ],
)
async def test_api_errors_become_clear_messages(assistant, fake_claude, error, expected):
    await assistant.ask(1, "первый вопрос")
    fake_claude.messages.queue.append(error)

    with pytest.raises(AssistantError, match=expected):
        await assistant.ask(1, "второй вопрос")

    # Неудачный вопрос не попадает в историю — диалог не ломается.
    assert assistant.memory.get(1) == [
        {"role": "user", "content": "первый вопрос"},
        {"role": "assistant", "content": "Ответ Claude"},
    ]
