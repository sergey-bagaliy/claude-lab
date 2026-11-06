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

from .schedule import describe_schedule, next_occurrence, repeat_days_for
from .storage import Reminder, Storage
from .timeutil import TZ, format_when, parse_local

MAX_RECURRING = 10  # не больше 10 повторяющихся напоминаний на человека — бережём деньги и нервы

# Поиск в интернете выполняют серверы Anthropic (это «серверный» инструмент).
WEB_SEARCH_TOOL: dict[str, Any] = {
    "type": "web_search_20260318",
    "name": "web_search",
    "max_uses": 3,  # не больше 3 поисков на один ответ — бережём деньги
    # Результаты поиска приходят в ответе целиком: по ним бот проверяет,
    # что ссылки на рецепты, видео и аудио настоящие, а не придуманные.
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
            "Может быть разовым или повторяться (каждый день, по будням, по выходным, раз в неделю). "
            "Для рассылок вроде «каждое утро присылай интересный факт / мотивацию / погоду» ставь generate=true — "
            "тогда каждый раз будет новый текст. Если время разового напоминания не указано или неясно — "
            "уточни у пользователя; для повторяющихся «утро» — 08:00, «вечер» — 20:00, и скажи об этом."
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
                "repeat": {
                    "type": "string",
                    "enum": ["none", "daily", "weekdays", "weekends", "weekly"],
                    "description": "Повтор: none — один раз (по умолчанию), daily — каждый день, weekdays — пн–пт, "
                    "weekends — сб–вс, weekly — раз в неделю в день недели из when. Для повторяющихся when — "
                    "время первого раза (если оно сегодня уже прошло, бот сам начнёт со следующего подходящего дня).",
                },
                "generate": {
                    "type": "boolean",
                    "description": "true — каждый раз Claude готовит новый текст по просьбе из text "
                    "(text — это задание: «интересный факт», «мотивирующая мысль на день», «погода в Краснодаре»). "
                    "false — бот присылает text как есть.",
                },
            },
            "required": ["text", "when", "for_whom"],
        },
    },
    {
        "name": "list_reminders",
        "description": "Посмотреть запланированные напоминания этого пользователя (с номерами). Вызывай, когда спрашивают о напоминаниях или перед удалением.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "delete_reminder",
        "description": "Отменить напоминание или рассылку по номеру из list_reminders. Вызывай, когда просят перестать напоминать или присылать что-то.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reminder_id": {"type": "integer", "description": "Номер напоминания из list_reminders."}
            },
            "required": ["reminder_id"],
        },
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

CLIENT_TOOLS += [
    {
        "name": "show_media",
        "description": (
            "Показать подборку ссылок с превью: видео (мультфильмы, ролики), аудио (аудиосказки, песни, "
            "подкасты) или полезные страницы. Вызывай, когда просят найти мультфильм, видео, аудиосказку, "
            "песню или ссылки. Перед этим найди их через web_search; url — только точные адреса из результатов "
            "поиска, ничего не придумывай. Предпочитай официальные каналы и легальные сайты."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["video", "audio", "links"],
                    "description": "Что в подборке.",
                },
                "title": {"type": "string", "description": "Заголовок подборки: «Мультфильмы для Кати»."},
                "items": {
                    "type": "array",
                    "description": "От 1 до 5 ссылок.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string", "description": "Название."},
                            "url": {"type": "string", "description": "Точный адрес из результатов поиска."},
                            "note": {
                                "type": "string",
                                "description": "Коротко: длительность, для какого возраста, чем хорошо.",
                            },
                        },
                        "required": ["title", "url"],
                    },
                },
            },
            "required": ["kind", "title", "items"],
        },
    },
    {
        "name": "show_photos",
        "description": (
            "Прислать настоящие фотографии (бот берёт их из Wikimedia Commons): места — курорта, города, пляжа, "
            "достопримечательности; животного, растения, природы, предмета. Вызывай, когда просят показать, "
            "как что-то выглядит, прислать фото, и когда пишешь сказку — чтобы показать её героев. "
            "Каждый вызов — отдельный альбом, не больше 3 за ответ. Сами фото потом не описывай."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Подпись по-русски: «Геленджик», «Герой сказки — ёжик».",
                },
                "search_query": {
                    "type": "string",
                    "description": "Запрос на английском, как в Википедии, можно с уточнением: "
                    "«Gelendzhik embankment», «Abrau-Dyurso lake», «hedgehog», «squirrel in forest».",
                },
                "count": {"type": "integer", "description": "Сколько фото: от 1 до 6, обычно 4."},
            },
            "required": ["title", "search_query"],
        },
    },
]

SHOW_RECIPE = "show_recipe"
SHOW_MEDIA = "show_media"
SHOW_PHOTOS = "show_photos"


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
            "delete_reminder": self._delete_reminder,
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
        repeat = str(data.get("repeat") or "none")
        generate = data.get("generate") is True
        repeat_days = ""
        if repeat != "none":
            try:
                repeat_days = repeat_days_for(repeat, due)
            except ValueError:
                return ToolResult(
                    "repeat должен быть одним из: none, daily, weekdays, weekends, weekly.", is_error=True
                )
            if self.storage.count_recurring_for(ctx.chat_id) >= MAX_RECURRING:
                return ToolResult(
                    f"Уже {MAX_RECURRING} повторяющихся напоминаний — это предел. "
                    "Предложи пользователю сначала удалить ненужные.",
                    is_error=True,
                )
            at_time = due.timetz().replace(tzinfo=None)
            if due <= now:
                # «каждое утро в 8», а сейчас уже день — начинаем со следующего подходящего дня.
                due = next_occurrence(now, at_time, repeat_days)
            elif str(due.weekday()) not in repeat_days:
                # первая дата не подходит (например, суббота для «по будням») — ближайший подходящий день после неё
                due = next_occurrence(due, at_time, repeat_days)
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

        reminder_id = self.storage.add_reminder(
            chat_id=target_chat,
            text=text,
            due_at=int(due.timestamp()),
            created_by=ctx.person_name,
            created_by_chat=ctx.chat_id,
            repeat_days=repeat_days,
            generate=generate,
        )
        whom = f". Получит: {target_name}" if target_name else ""
        if not repeat_days:
            return ToolResult(f"Напоминание №{reminder_id} создано: {format_when(due, now)} — {text}{whom}")
        kind = "каждый раз новый текст готовит Claude" if generate else "текст каждый раз один и тот же"
        return ToolResult(
            f"Повторяющееся напоминание №{reminder_id} создано: {describe_schedule(repeat_days, due)} — {text} "
            f"({kind}). Первое — {format_when(due, now)}{whom}. Отключить можно кнопкой «🔕» в самом напоминании "
            "или в разделе «⏰ Напоминания»."
        )

    def _list_reminders(self, data: dict[str, Any], ctx: ToolContext) -> ToolResult:
        now = self.clock()
        reminders = self.storage.pending_reminders_for(ctx.chat_id)
        if not reminders:
            return ToolResult("Запланированных напоминаний нет.")
        return ToolResult("\n".join(f"№{r.id}: {describe_reminder(r, now)}" for r in reminders[:20]))

    def _delete_reminder(self, data: dict[str, Any], ctx: ToolContext) -> ToolResult:
        try:
            reminder = self.storage.reminder(int(data.get("reminder_id")))
        except (TypeError, ValueError):
            reminder = None
        if (
            reminder is None
            or reminder.status != "pending"
            or ctx.chat_id not in (reminder.chat_id, reminder.created_by_chat)
        ):
            return ToolResult(
                "Нет такого активного напоминания. Посмотри номера через list_reminders.", is_error=True
            )
        self.storage.set_reminder_status(reminder.id, "cancelled")
        return ToolResult(f"Напоминание №{reminder.id} отменено: {reminder.text}")


def describe_reminder(reminder: Reminder, now: datetime) -> str:
    """«каждый день в 08:00 — 🤖 интересный факт» или «завтра в 09:00 — позвонить маме»."""
    moment = datetime.fromtimestamp(reminder.due_at, TZ)
    when = (
        describe_schedule(reminder.repeat_days, moment) if reminder.is_recurring else format_when(moment, now)
    )
    return f"{when} — {'🤖 ' if reminder.generate else ''}{reminder.text}"
