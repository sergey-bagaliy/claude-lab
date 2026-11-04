"""Клавиатуры Telegram: главное меню и кнопки сценария записи."""

from __future__ import annotations

from datetime import date, datetime

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)

from .business import WEEKDAY_SHORT, Business
from .storage import Booking

MENU_BOOK = "📅 Записаться"
MENU_MY = "🗓 Мои записи"
MENU_CONTACTS = "📍 Контакты"
MENU_ADMIN = "🙋 Позвать администратора"
SHARE_PHONE = "📱 Отправить мой номер"


def main_menu() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=MENU_BOOK), KeyboardButton(text=MENU_MY)],
            [KeyboardButton(text=MENU_CONTACTS), KeyboardButton(text=MENU_ADMIN)],
        ],
        resize_keyboard=True,
        input_field_placeholder="Задайте вопрос или выберите действие",
    )


def phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=SHARE_PHONE, request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def consent_keyboard(business: Business) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📄 Политика обработки данных", url=business.privacy_policy_url)],
            [InlineKeyboardButton(text="✅ Даю согласие", callback_data="consent:yes")],
        ]
    )


def services_keyboard(business: Business) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=f"{s.name} · {s.duration_minutes} мин", callback_data=f"svc:{s.id}")]
        for s in business.services
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def days_keyboard(service_id: str, days: list[date]) -> InlineKeyboardMarkup:
    buttons = [
        InlineKeyboardButton(
            text=f"{WEEKDAY_SHORT[d.weekday()]} {d:%d.%m}", callback_data=f"day:{service_id}:{d.isoformat()}"
        )
        for d in days
    ]
    rows = [buttons[i : i + 3] for i in range(0, len(buttons), 3)]
    rows.append([InlineKeyboardButton(text="← Другая услуга", callback_data="book:restart")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def slots_keyboard(service_id: str, day: date, slots: list[datetime]) -> InlineKeyboardMarkup:
    buttons = [
        InlineKeyboardButton(text=f"{s:%H:%M}", callback_data=f"slot:{service_id}:{day.isoformat()}:{s:%H%M}")
        for s in slots
    ]
    rows = [buttons[i : i + 4] for i in range(0, len(buttons), 4)]
    rows.append([InlineKeyboardButton(text="← Другой день", callback_data=f"svc:{service_id}")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Подтвердить", callback_data="book:confirm"),
                InlineKeyboardButton(text="✖️ Отмена", callback_data="book:cancel"),
            ]
        ]
    )


def my_bookings_keyboard(bookings: list[Booking]) -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=f"Отменить № {b.id} ({b.start:%d.%m %H:%M})", callback_data=f"cancel:{b.id}")]
        for b in bookings
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def forget_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🗑 Да, удалить мои данные", callback_data="forget:yes"),
                InlineKeyboardButton(text="Нет", callback_data="forget:no"),
            ]
        ]
    )
