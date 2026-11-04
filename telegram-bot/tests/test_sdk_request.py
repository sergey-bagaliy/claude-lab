"""Проверка с настоящим SDK anthropic: подменяем только сеть (HTTP-транспорт).

Так видно, какой именно HTTP-запрос уйдёт в Claude API, и что SDK
правильно разбирает ответ (с поиском, цитатами и инструментами). В интернет запрос не уходит.
"""

import json

import anthropic
import httpx2

from family_bot.assistant import FamilyAssistant

from .conftest import RECIPE_INPUT, SERGEY


def fake_api(responses: list[dict], seen: list[dict]):
    def handler(request: httpx2.Request) -> httpx2.Response:
        seen.append(
            {"url": str(request.url), "headers": dict(request.headers), "body": json.loads(request.content)}
        )
        return httpx2.Response(200, json=responses.pop(0))

    return handler


def message(content: list[dict], stop_reason: str = "end_turn", searches: int = 0) -> dict:
    return {
        "id": "msg_1",
        "type": "message",
        "role": "assistant",
        "model": "claude-sonnet-5-5",
        "content": content,
        "stop_reason": stop_reason,
        "stop_sequence": None,
        "usage": {
            "input_tokens": 300,
            "output_tokens": 12,
            "server_tool_use": {"web_search_requests": searches},
        },
    }


def make_assistant(storage, clock, responses, seen):
    client = anthropic.AsyncAnthropic(
        api_key="sk-ant-test-key",
        max_retries=0,
        http_client=anthropic.DefaultAsyncHttpxClient(
            transport=httpx2.MockTransport(fake_api(responses, seen))
        ),
    )
    return client, FamilyAssistant(client, storage, "claude-sonnet-5-5", clock=clock)


async def test_real_sdk_request_shape(storage, clock):
    seen: list[dict] = []
    responses = [
        message(
            [
                {"type": "thinking", "thinking": "", "signature": "s"},
                {"type": "text", "text": "Здравствуйте!"},
            ]
        )
    ]
    client, assistant = make_assistant(storage, clock, responses, seen)

    reply = await assistant.ask(1, SERGEY, "Привет!")
    await client.close()

    assert reply.text == "Здравствуйте!"
    [request] = seen
    assert request["url"].startswith("https://api.anthropic.com/v1/messages")
    assert "server-side-fallback-2026-07-01" in request["headers"]["anthropic-beta"]
    assert any("sk-ant-test-key" in value for value in request["headers"].values())

    body = request["body"]
    assert body["model"] == "claude-sonnet-5-5"
    assert body["fallbacks"] == "default"
    assert body["output_config"] == {"effort": "low"}
    assert body["cache_control"] == {"type": "ephemeral"}
    assert body["tools"][0]["type"] == "web_search_20260318"
    assert not {"temperature", "top_p", "top_k", "thinking"} & body.keys()


async def test_real_sdk_tool_round_trip(storage, clock):
    """Claude ищет в интернете и вызывает show_recipe — SDK разбирает это правильно."""
    seen: list[dict] = []
    responses = [
        message(
            [
                {
                    "type": "server_tool_use",
                    "id": "srvtoolu_1",
                    "name": "web_search",
                    "input": {"query": "плов"},
                },
                {"type": "tool_use", "id": "toolu_1", "name": "show_recipe", "input": RECIPE_INPUT},
            ],
            stop_reason="tool_use",
            searches=1,
        )
    ]
    client, assistant = make_assistant(storage, clock, responses, seen)
    reply = await assistant.ask(1, SERGEY, "плов", kind="recipe")
    await client.close()

    assert reply.recipe.title == "Курица с рисом"
    assert reply.recipe.url == RECIPE_INPUT["source_url"]
    assert seen[0]["body"]["output_config"] == {"effort": "medium"}


async def test_real_sdk_shopping_tool_loop(storage, clock):
    seen: list[dict] = []
    responses = [
        message(
            [
                {
                    "type": "tool_use",
                    "id": "toolu_9",
                    "name": "add_shopping_items",
                    "input": {"items": ["молоко"]},
                }
            ],
            stop_reason="tool_use",
        ),
        message([{"type": "text", "text": "Добавил молоко."}]),
    ]
    client, assistant = make_assistant(storage, clock, responses, seen)
    reply = await assistant.ask(1, SERGEY, "купи молоко")
    await client.close()

    assert reply.text == "Добавил молоко."
    second = seen[1]["body"]["messages"]
    assert second[-2]["content"][0]["id"] == "toolu_9"  # ответ Claude вернули как есть
    assert second[-1]["content"][0]["tool_use_id"] == "toolu_9"
    assert [i.text for i in storage.shopping()] == ["молоко"]


async def test_real_sdk_search_results_validate_links(storage, clock):
    """Настоящий SDK разбирает блок результатов поиска, и бот сверяет по нему ссылки."""
    seen: list[dict] = []
    responses = [
        message(
            [
                {
                    "type": "server_tool_use",
                    "id": "srvtoolu_1",
                    "name": "web_search",
                    "input": {"query": "мультики"},
                },
                {
                    "type": "web_search_tool_result",
                    "tool_use_id": "srvtoolu_1",
                    "content": [
                        {
                            "type": "web_search_result",
                            "url": "https://www.youtube.com/watch?v=real1",
                            "title": "Ёжик в тумане",
                            "encrypted_content": "e",
                            "page_age": None,
                        }
                    ],
                },
                {
                    "type": "tool_use",
                    "id": "toolu_2",
                    "name": "show_media",
                    "input": {
                        "kind": "video",
                        "title": "Мультики",
                        "items": [
                            {"title": "Ёжик", "url": "https://youtu.be/real1"},
                            {"title": "Выдумка", "url": "https://youtu.be/fake9"},
                        ],
                    },
                },
            ],
            stop_reason="tool_use",
            searches=1,
        )
    ]
    client, assistant = make_assistant(storage, clock, responses, seen)
    reply = await assistant.ask(1, SERGEY, "мультики", kind="media")
    await client.close()
    assert [i.url for i in reply.media.items] == ["https://youtu.be/real1"]
