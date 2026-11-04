"""Тесты ИИ-ассистента. API Anthropic подменён FakeAnthropic — сеть и ключи не нужны."""

import json

import anthropic
import httpx2
import pytest

from admin_bot.ai import (
    FALLBACK_BETA,
    MAX_TOOL_ROUNDS,
    REFUSAL_TEXT,
    TOOLS,
    AIAssistant,
    build_system_prompt,
)

from .conftest import NOW, FakeAnthropic, response, text_block, thinking_block, tool_use


def tool_results(call) -> list[dict]:
    """tool_result-блоки из последнего сообщения запроса."""
    return call[1]["messages"][-1]["content"]


async def test_simple_answer_and_request_shape(assistant, fake_api, client, env):
    fake_api.responses = [response("end_turn", thinking_block(), text_block("Мы работаем с 9 до 20."))]
    answer = await assistant.reply(client, "Во сколько открываетесь?")
    assert answer == "Мы работаем с 9 до 20."

    [(kind, kwargs)] = fake_api.calls
    # Модель по умолчанию — с серверным запасным вариантом на случай отказа.
    assert kind == "beta"
    assert kwargs["model"] == "claude-opus-5-5"
    assert kwargs["betas"] == [FALLBACK_BETA] and kwargs["fallbacks"] == "default"
    assert kwargs["output_config"] == {"effort": "low"}
    # Системный промпт кэшируется, инструменты строгие.
    assert kwargs["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert all(t["strict"] and t["input_schema"]["additionalProperties"] is False for t in kwargs["tools"])
    # Текущее время — в сообщении клиента, а не в системном промпте (иначе кэш не работает).
    assert kwargs["messages"][-1]["content"].startswith("[Сейчас среда, 04.11.2026 10:00]")
    assert "04.11.2026" not in kwargs["system"][0]["text"]

    history = env.db.get_history(client.user_id, 10)
    assert [m["role"] for m in history] == ["user", "assistant"]
    assert history[1]["content"] == "Мы работаем с 9 до 20."


async def test_model_without_fallback_uses_plain_messages_api(env, client):
    api = FakeAnthropic([response("end_turn", text_block("ok"))])
    bot = AIAssistant(api, env.business, env.booking, env.db, model="claude-haiku-5-5", effort=None)
    await bot.reply(client, "привет")
    [(kind, kwargs)] = api.calls
    assert kind == "messages"
    assert "fallbacks" not in kwargs and "output_config" not in kwargs


def test_system_prompt_contains_knowledge_base(business):
    prompt = build_system_prompt(business)
    assert business.name in prompt and business.address in prompt
    for service in business.services:
        assert f"- {service.id}: {service.name}" in prompt
    for item in business.faq:
        assert item.question in prompt
    for rule in business.rules:
        assert rule in prompt
    assert "стоимость уточняет администратор" in prompt  # цены не указаны → не выдумываем
    assert build_system_prompt(business) == prompt  # стабилен между запросами


async def test_full_booking_through_tools(assistant, fake_api, client, env):
    env.db.give_consent(client.user_id, env.business.privacy_policy_url, NOW)
    fake_api.responses = [
        response("tool_use", thinking_block(), tool_use("get_free_slots", service_id="consultation", date="2026-11-05")),
        response(
            "tool_use",
            tool_use(
                "book_appointment",
                service_id="consultation", date="2026-11-05", time="10:00",
                client_name="Иван", phone="+7 918 123-45-67", comment="",
            ),
        ),
        response("end_turn", text_block("Готово! Вы записаны на консультацию 5 ноября в 10:00.")),
    ]
    answer = await assistant.reply(client, "Запишите на консультацию завтра в 10, Иван, +7 918 123-45-67, да")
    assert "Вы записаны" in answer

    # 1-й результат инструмента: свободное время на четверг.
    slots = json.loads(tool_results(fake_api.calls[1])[0]["content"])
    assert slots["weekday"] == "четверг" and "10:00" in slots["free_times"]
    # Ответ модели с блоком размышлений возвращается в API без изменений.
    assistant_turn = fake_api.calls[1][1]["messages"][-2]
    assert assistant_turn["role"] == "assistant" and assistant_turn["content"][0].type == "thinking"
    # 2-й результат: запись создана.
    booked = json.loads(tool_results(fake_api.calls[2])[0]["content"])
    assert booked["ok"] is True

    [booking] = env.db.upcoming_for_user(client.user_id, NOW)
    assert booking.source == "ai" and booking.phone == "+79181234567"
    assert "Новая запись" in env.notifier.messages[0] and "ИИ-диалог" in env.notifier.messages[0]
    # В историю попадает только текст, без служебных блоков.
    assert all(isinstance(m["content"], str) for m in env.db.get_history(client.user_id, 10))


async def test_tool_errors_are_reported_to_model(assistant, fake_api, client, env):
    fake_api.responses = [
        response(
            "tool_use",
            tool_use(
                "book_appointment",
                service_id="consultation", date="2026-11-05", time="10:00",
                client_name="Иван", phone="+79181234567", comment="",
            ),
            tool_use("get_free_slots", service_id="consultation", date="завтра"),
            tool_use("delete_database"),
        ),
        response("end_turn", text_block("Сначала нужно согласие на обработку данных.")),
    ]
    await assistant.reply(client, "запишите")
    results = tool_results(fake_api.calls[1])
    assert len(results) == 3  # все результаты — одним сообщением
    assert all(r["is_error"] for r in results)
    assert "согласие" in results[0]["content"]
    assert "ГГГГ-ММ-ДД" in results[1]["content"]
    assert "Неизвестный инструмент" in results[2]["content"]
    assert env.db.upcoming_for_user(client.user_id, NOW) == []


async def test_free_slots_suggests_other_days(assistant, fake_api, client):
    fake_api.responses = [
        response("tool_use", tool_use("get_free_slots", service_id="hygiene", date="2026-11-08")),
        response("end_turn", text_block("В воскресенье выходной.")),
    ]
    await assistant.reply(client, "можно в воскресенье?")
    result = json.loads(tool_results(fake_api.calls[1])[0]["content"])
    assert result["free_times"] == []
    assert result["nearest_days_with_free_time"][0].startswith("2026-11-04")


async def test_handoff_and_my_bookings(assistant, fake_api, client, env):
    fake_api.responses = [
        response("tool_use", tool_use("handoff_to_admin", reason="хочет рассрочку"), tool_use("my_bookings")),
        response("end_turn", text_block("Передала администратору.")),
    ]
    await assistant.reply(client, "есть рассрочка?")
    assert "хочет рассрочку" in env.notifier.messages[0]
    assert "есть рассрочка?" in env.notifier.messages[0]
    assert json.loads(tool_results(fake_api.calls[1])[1]["content"]) == {"bookings": []}


async def test_refusal_is_handled_and_not_saved(assistant, fake_api, client, env):
    fake_api.responses = [response("refusal")]
    assert await assistant.reply(client, "...") == REFUSAL_TEXT
    assert env.db.get_history(client.user_id, 10) == []


@pytest.mark.parametrize(
    "error",
    [
        anthropic.APIConnectionError(request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages")),
        anthropic.RateLimitError(
            "rate limited",
            response=httpx2.Response(429, request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages")),
            body=None,
        ),
    ],
)
async def test_api_errors_give_phone_hint(assistant, fake_api, client, env, error):
    fake_api.responses = [error]
    answer = await assistant.reply(client, "привет")
    assert env.business.phone in answer
    assert env.db.get_history(client.user_id, 10) == []


async def test_tool_loop_is_limited(assistant, fake_api, client, env):
    fake_api.responses = [response("tool_use", tool_use("my_bookings")) for _ in range(MAX_TOOL_ROUNDS)]
    answer = await assistant.reply(client, "покажи записи")
    assert len(fake_api.calls) == MAX_TOOL_ROUNDS
    assert env.business.phone in answer


async def test_history_is_sent_on_next_turn(assistant, fake_api, client):
    fake_api.responses = [
        response("end_turn", text_block("Здравствуйте!")),
        response("end_turn", text_block("Консультация длится 30 минут.")),
    ]
    await assistant.reply(client, "Привет")
    await assistant.reply(client, "Сколько длится консультация?")
    messages = fake_api.calls[1][1]["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant", "user"]
    assert messages[1]["content"] == "Здравствуйте!"


def test_tool_names_are_unique():
    names = [t["name"] for t in TOOLS]
    assert len(names) == len(set(names)) == 4
