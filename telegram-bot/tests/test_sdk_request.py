"""Проверка с настоящим SDK anthropic: подменяем только сеть (HTTP-транспорт).

Так видно, какой именно HTTP-запрос уйдёт в Claude API, и что SDK
правильно разбирает ответ. В интернет запрос не уходит.
"""

import json

import anthropic
import httpx2

from family_bot.assistant import FamilyAssistant
from family_bot.memory import ChatMemory

from .conftest import TODAY


async def test_real_sdk_builds_correct_request():
    seen: dict = {}

    def fake_api(request: httpx2.Request) -> httpx2.Response:
        seen["url"] = str(request.url)
        seen["headers"] = dict(request.headers)
        seen["body"] = json.loads(request.content)
        return httpx2.Response(
            200,
            json={
                "id": "msg_1",
                "type": "message",
                "role": "assistant",
                "model": "claude-haiku-5-5",
                "content": [
                    {"type": "thinking", "thinking": "", "signature": "sig"},
                    {"type": "text", "text": "Здравствуйте, Сергей!"},
                ],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": 300, "output_tokens": 12},
            },
        )

    client = anthropic.AsyncAnthropic(
        api_key="sk-ant-test-key",
        max_retries=0,
        http_client=anthropic.DefaultAsyncHttpxClient(transport=httpx2.MockTransport(fake_api)),
    )
    assistant = FamilyAssistant(client, "claude-haiku-5-5", ChatMemory(20), today=lambda: TODAY)

    reply = await assistant.ask(1, "Привет!")
    await client.close()

    assert reply == "Здравствуйте, Сергей!"
    assert seen["url"] == "https://api.anthropic.com/v1/messages"
    # Ключ уходит только в заголовке запроса, из переменной/параметра — не из кода.
    assert any("sk-ant-test-key" in value for value in seen["headers"].values())

    body = seen["body"]
    assert body["model"] == "claude-haiku-5-5"
    assert body["output_config"] == {"effort": "low"}
    assert body["messages"] == [{"role": "user", "content": "Привет!"}]
    assert "Катя" in body["system"]
    assert not {"temperature", "top_p", "top_k"} & body.keys()
