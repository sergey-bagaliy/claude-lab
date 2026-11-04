"""Кнопки: главное меню внизу экрана и кнопки под сообщениями."""

from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup

from . import texts
from .storage import Reminder, ShoppingItem


def _button(text: str, data: str) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=data)


def _short(text: str, limit: int = 28) -> str:
    return text if len(text) <= limit else text[: limit - 1] + "…"


def main_menu() -> ReplyKeyboardMarkup:
    """Постоянное меню внизу экрана."""
    rows = [
        [texts.BTN_RECIPE, texts.BTN_SHOPPING],
        [texts.BTN_REMINDERS, texts.BTN_WEEKEND],
        [texts.BTN_QUIZ, texts.BTN_STORY],
        [texts.BTN_NEW, texts.BTN_COSTS],
    ]
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=t) for t in row] for row in rows],
        resize_keyboard=True,
        is_persistent=True,
        input_field_placeholder="Спросите что угодно или нажмите кнопку",
    )


# ---------- рецепты ----------


def recipe_presets() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_button("🥣 Завтрак", "rq:breakfast"), _button("🍲 Обед", "rq:lunch")],
            [_button("🍝 Ужин за 30 минут", "rq:dinner"), _button("🧁 Десерт с детьми", "rq:dessert")],
        ]
    )


def recipe_actions(recipe_id: int, added: bool = False) -> InlineKeyboardMarkup:
    first = (
        _button("✅ Продукты в покупках", f"rcp:noop:{recipe_id}")
        if added
        else _button("🛒 Продукты в покупки", f"rcp:add:{recipe_id}")
    )
    return InlineKeyboardMarkup(
        inline_keyboard=[[first], [_button("🔄 Другой рецепт", f"rcp:more:{recipe_id}")]]
    )


# ---------- покупки ----------


def shopping(items: list[ShoppingItem]) -> InlineKeyboardMarkup:
    rows = [
        [_button(("✅ " if item.bought else "⬜ ") + _short(item.text), f"shop:t:{item.id}")]
        for item in items[:40]
    ]
    rows.append([_button("➕ Добавить", "shop:add"), _button("🧹 Убрать купленное", "shop:clear")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


# ---------- напоминания ----------


def reminders(items: list[Reminder], labels: list[str]) -> InlineKeyboardMarkup:
    rows = [
        [_button(f"❌ {_short(label, 40)}", f"rem:del:{item.id}")]
        for item, label in zip(items, labels, strict=True)
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def reminder_alert(reminder_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_button("✅ Сделано", f"rem:done:{reminder_id}")],
            [
                _button("⏰ +15 мин", f"rem:snz:{reminder_id}:15"),
                _button("⏰ +1 час", f"rem:snz:{reminder_id}:60"),
                _button("📅 Завтра", f"rem:snz:{reminder_id}:1440"),
            ],
        ]
    )


# ---------- тренажёр умножения ----------


def quiz_menu() -> InlineKeyboardMarkup:
    numbers = [_button(f"× {n}", f"quiz:new:{n}") for n in range(2, 10)]
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_button("🎲 Вся таблица", "quiz:new:0")],
            numbers[:4],
            numbers[4:],
            [_button("📝 Списком (ответы под спойлером)", "quiz:list:0")],
        ]
    )


def quiz_options(game_id: str, options: list[int]) -> InlineKeyboardMarkup:
    buttons = [_button(str(value), f"quiz:a:{game_id}:{value}") for value in options]
    return InlineKeyboardMarkup(inline_keyboard=[buttons[:2], buttons[2:]])


def quiz_finished(table: int | None) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_button("🔁 Ещё раз", f"quiz:new:{table or 0}"), _button("🎯 Другая таблица", "quiz:menu")]
        ]
    )


# ---------- сказки и выходные ----------


def story() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_button("🔄 Другая сказка", "story:any"), _button("🐰 Про зверят", "story:animals")],
            [_button("🚀 Про космос", "story:space"), _button("🧚 Про волшебство", "story:magic")],
        ]
    )


def weekend() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                _button("🏠 Дома", "wk:home"),
                _button("🏙 В городе", "wk:city"),
                _button("🚗 Поездка", "wk:trip"),
            ],
            [_button("🔄 Другие идеи", "wk:any")],
        ]
    )
