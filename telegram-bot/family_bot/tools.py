"""Инструменты, которыми Claude может пользоваться в разговоре.

Claude сам решает, когда вызвать инструмент: «добавь молоко» → add_shopping_items,
«напомни Вике в 17:00 забрать Катю» → create_reminder и т.д.
Бот выполняет вызов и возвращает Claude результат.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from .storage import Storage
from .timeutil import TZ, format_when, parse_local

# Поиск в интернете выполняют серверы Anthropic (это «серверный» инструмент).
WEB_SEARCH_TOOL: dict[str, Any] = {
    "type": "web_search_20260318",
    "name": "web_search",
    "max_uses": 3,  # не больше 3 поисков на один ответ — бережём деньги
    # Промежуточные результаты фильтрации не нужны в ответе — так он короче и дешевле.
    "response_inclusion": "excluded",
    "user_location": {
        "type": "approximate",
        "city": "Krasnodar",
        "region": "Krasnodar Krai",
        "timezone": "Europe/Moscow",
    },
}

CLIENT_TOOLS: list[dict[str, Any]] = [
    {
        "name": "add_shopping_items",
        "description": (
            "Добавить товары в общий семейный список покупок. Вызывай, когда просят что-то купить, "
            "добавить в список покупок, или когда пользователь просит добавить продукты для рецепта."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Товары, каждый отдельно и коротко, например ['молоко 2 л', 'хлеб'].",
                }
            },
            "required": ["items"],
        },
    },
    {
        "name": "get_shopping_list",
        "description": "Посмотреть, что сейчас есть в списке покупок (не купленное). Вызывай, когда спрашивают, что нужно купить.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "create_reminder",
        "description": (
            "Создать напоминание: в нужное время бот пришлёт сообщение. Вызывай, когда просят напомнить. "
            "Если время не указано или неясно — сначала уточни у пользователя."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "О чём напомнить, коротко: «забрать Катю из садика».",
                },
                "when": {
                    "type": "string",
                    "description": "Когда, по времени Краснодара, строго в формате ГГГГ-ММ-ДД ЧЧ:ММ, например 2026-11-05 17:30.",
                },
                "for_whom": {
                    "type": "string",
                    "description": "Имя члена семьи в именительном падеже, если напоминание для другого человека (например «Вика»). Пустая строка — для того, кто пишет.",
                },
            },
            "required": ["text", "when", "for_whom"],
        },
    },
    {
        "name": "list_reminders",
        "description": "Посмотреть запланированные напоминания этого пользователя. Вызывай, когда спрашивают о напоминаниях.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "show_recipe",
        "description": (
            "Показать пользователю рецепт красивой карточкой с фото блюда. Вызывай всегда, когда предлагаешь "
            "конкретный рецепт. Перед этим найди рецепт через web_search. source_url — адрес страницы рецепта "
            "из результатов поиска (с неё берётся фото блюда)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Название блюда."},
                "source_url": {
                    "type": "string",
                    "description": "Ссылка на страницу рецепта из результатов поиска.",
                },
                "cook_time_minutes": {"type": "integer", "description": "Сколько минут готовить всего."},
                "servings": {"type": "integer", "description": "На сколько порций."},
                "ingredients": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Продукты с количеством: «курица — 600 г».",
                },
                "steps": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Шаги приготовления, коротко, 3–10 шагов.",
                },
                "kids_tip": {
                    "type": "string",
                    "description": "Совет для детей: как подать Кате (3 года) или чем Никита (8 лет) может помочь.",
                },
            },
            "required": ["title", "source_url", "ingredients", "steps", "kids_tip"],
        },
    },
]

SHOW_RECIPE = "show_recipe"


@dataclass(frozen=True)
class ToolContext:
    chat_id: int
    person_name: str


@dataclass(frozen=True)
class ToolResult:
    content: str
    is_error: bool = False


class ToolExecutor:
    def __init__(self, storage: Storage, clock: Callable[[], datetime]) -> None:
        self.storage = storage
        self.clock = clock

    def run(self, name: str, data: Any, ctx: ToolContext) -> ToolResult:
        if not isinstance(data, dict):
            return ToolResult("Входные данные должны быть объектом JSON.", is_error=True)
        handler = {
            "add_shopping_items": self._add_shopping_items,
            "get_shopping_list": self._get_shopping_list,
            "create_reminder": self._create_reminder,
            "list_reminders": self._list_reminders,
        }.get(name)
        if handler is None:
            return ToolResult(f"Неизвестный инструмент: {name}", is_error=True)
        return handler(data, ctx)

    def _add_shopping_items(self, data: dict[str, Any], ctx: ToolContext) -> ToolResult:
        items = data.get("items")
        if not isinstance(items, list) or not items:
            return ToolResult("Передай непустой список items.", is_error=True)
        added = self.storage.add_shopping([str(i) for i in items[:30]], added_by=ctx.person_name)
        if not added:
            return ToolResult("Всё это уже есть в списке покупок.")
        return ToolResult("Добавлено в список покупок: " + ", ".join(added))

    def _get_shopping_list(self, data: dict[str, Any], ctx: ToolContext) -> ToolResult:
        items = [i.text for i in self.storage.shopping() if not i.bought]
        if not items:
            return ToolResult("Список покупок пуст.")
        return ToolResult(json.dumps({"не куплено": items}, ensure_ascii=False))

    def _create_reminder(self, data: dict[str, Any], ctx: ToolContext) -> ToolResult:
        text = " ".join(str(data.get("text", "")).split())[:300]
        if not text:
            return ToolResult("Не указано, о чём напомнить.", is_error=True)
        try:
            due = parse_local(str(data.get("when", "")))
        except ValueError:
            return ToolResult(
                "Время должно быть в формате ГГГГ-ММ-ДД ЧЧ:ММ, например 2026-11-05 17:30.", is_error=True
            )

        now = self.clock()
        if due <= now:
            return ToolResult(
                f"Это время уже прошло (сейчас {now:%Y-%m-%d %H:%M}). Уточни у пользователя.", is_error=True
            )
        if due - now > timedelta(days=366):
            return ToolResult("Напоминания можно ставить не дальше чем на год вперёд.", is_error=True)

        target_chat, target_name = ctx.chat_id, ""
        for_whom = str(data.get("for_whom") or "").strip()
        if for_whom and for_whom.lower() != ctx.person_name.lower():
            member = self.storage.find_member(for_whom)
            if member is None:
                known = ", ".join(m.first_name for m in self.storage.members()) or "никого"
                return ToolResult(
                    f"Не знаю, кому отправить: «{for_whom}». Бот может писать только тем, кто хоть раз ему писал. "
                    f"Сейчас это: {known}. Скажи об этом пользователю.",
                    is_error=True,
                )
            target_chat, target_name = member.chat_id, member.first_name

        self.storage.add_reminder(
            chat_id=target_chat,
            text=text,
            due_at=int(due.timestamp()),
            created_by=ctx.person_name,
            created_by_chat=ctx.chat_id,
        )
        whom = f". Получит: {target_name}" if target_name else ""
        return ToolResult(f"Напоминание создано: {format_when(due, now)} — {text}{whom}")

    def _list_reminders(self, data: dict[str, Any], ctx: ToolContext) -> ToolResult:
        now = self.clock()
        reminders = self.storage.pending_reminders_for(ctx.chat_id)
        if not reminders:
            return ToolResult("Запланированных напоминаний нет.")
        lines = [
            f"{format_when(datetime.fromtimestamp(r.due_at, TZ), now)} — {r.text}" for r in reminders[:20]
        ]
        return ToolResult("\n".join(lines))
