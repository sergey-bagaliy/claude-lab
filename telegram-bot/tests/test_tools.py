"""Инструменты, которые вызывает Claude: покупки и напоминания."""

import pytest

from family_bot.tools import CLIENT_TOOLS, ToolContext, ToolExecutor

CTX = ToolContext(chat_id=100, person_name="Сергей")


@pytest.fixture
def tools(storage, clock):
    storage.touch_user(100, "Сергей", 100, 0)
    storage.touch_user(200, "Вика", 200, 0)
    return ToolExecutor(storage, clock)


def test_tool_definitions_are_valid():
    for tool in CLIENT_TOOLS:
        assert tool["name"] and tool["description"]
        schema = tool["input_schema"]
        assert schema["type"] == "object"
        assert set(schema.get("required", [])) <= set(schema["properties"])


def test_add_and_get_shopping(tools, storage):
    result = tools.run("add_shopping_items", {"items": ["молоко", "хлеб"]}, CTX)
    assert not result.is_error and "молоко, хлеб" in result.content
    assert storage.shopping()[0].added_by == "Сергей"
    assert "уже есть" in tools.run("add_shopping_items", {"items": ["молоко"]}, CTX).content
    assert "молоко" in tools.run("get_shopping_list", {}, CTX).content
    assert tools.run("add_shopping_items", {"items": []}, CTX).is_error


def test_empty_shopping_list(tools):
    assert tools.run("get_shopping_list", {}, CTX).content == "Список покупок пуст."


def test_create_reminder_for_myself(tools, storage):
    result = tools.run(
        "create_reminder", {"text": "позвонить маме", "when": "2026-11-05 09:00", "for_whom": ""}, CTX
    )
    assert not result.is_error
    assert "завтра в 09:00" in result.content
    [reminder] = storage.pending_reminders_for(100)
    assert reminder.chat_id == 100 and reminder.text == "позвонить маме"


def test_create_reminder_for_vika(tools, storage):
    result = tools.run(
        "create_reminder", {"text": "забрать Катю", "when": "2026-11-04 17:30", "for_whom": "Вика"}, CTX
    )
    assert "Получит: Вика" in result.content and "сегодня в 17:30" in result.content
    [reminder] = storage.pending_reminders_for(200)
    assert reminder.created_by == "Сергей" and reminder.created_by_chat == 100


@pytest.mark.parametrize(
    "data, expected",
    [
        ({"text": "x", "when": "2026-11-04 14:00", "for_whom": ""}, "уже прошло"),
        ({"text": "x", "when": "завтра вечером", "for_whom": ""}, "ГГГГ-ММ-ДД"),
        ({"text": "x", "when": "2028-01-01 10:00", "for_whom": ""}, "на год"),
        ({"text": "", "when": "2026-11-05 10:00", "for_whom": ""}, "о чём напомнить"),
        ({"text": "x", "when": "2026-11-05 10:00", "for_whom": "Никита"}, "Сергей, Вика"),
    ],
)
def test_reminder_errors_are_explained_to_claude(tools, data, expected):
    result = tools.run("create_reminder", data, CTX)
    assert result.is_error
    assert expected in result.content


def test_list_reminders(tools):
    assert "нет" in tools.run("list_reminders", {}, CTX).content
    tools.run("create_reminder", {"text": "собрание", "when": "2026-11-06 18:00", "for_whom": ""}, CTX)
    assert "послезавтра в 18:00 — собрание" in tools.run("list_reminders", {}, CTX).content


def test_unknown_tool_and_bad_input(tools):
    assert tools.run("delete_everything", {}, CTX).is_error
    assert tools.run("add_shopping_items", "молоко", CTX).is_error
