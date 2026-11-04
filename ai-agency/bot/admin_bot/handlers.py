"""Обработчики Telegram (aiogram 3): согласие, меню, запись кнопками, свободный диалог с ИИ."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta

from aiogram import F, Router
from aiogram.enums import ChatAction
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message, User

from . import keyboards as kb
from .ai import AIAssistant
from .booking import BookingError, BookingService, ClientInfo, format_dt, normalize_phone
from .business import Business
from .settings import Settings
from .storage import Storage

log = logging.getLogger(__name__)


class BookingForm(StatesGroup):
    name = State()
    phone = State()
    comment = State()
    confirm = State()


def client_of(user: User) -> ClientInfo:
    return ClientInfo(user_id=user.id, full_name=user.full_name or "", username=user.username)


def consent_text(business: Business) -> str:
    if business.consent_text:
        return business.consent_text
    return (
        "Чтобы отвечать на вопросы и записывать вас, нужно согласие на обработку персональных данных.\n\n"
        f"Оператор: {business.operator}.\n"
        "Какие данные: имя, телефон, Telegram-аккаунт, текст переписки.\n"
        "Зачем: запись на услуги и ответы на ваши вопросы.\n"
        "Ответы готовит ИИ-сервис Anthropic (США), поэтому текст переписки передаётся за рубеж.\n"
        "Отозвать согласие и удалить данные: команда /delete_my_data.\n\n"
        "Подробности — в политике обработки данных (кнопка ниже)."
    )


async def _ask_consent_if_needed(target: Message, user_id: int, db: Storage, business: Business) -> bool:
    """True — если согласия нет и мы его запросили (дальше не идём)."""
    if db.has_consent(user_id):
        return False
    await target.answer(consent_text(business), reply_markup=kb.consent_keyboard(business))
    return True


# ---------------------------------------------------------------- команды и меню


async def cmd_start(message: Message, state: FSMContext, db: Storage, business: Business) -> None:
    await state.clear()
    if await _ask_consent_if_needed(message, message.from_user.id, db, business):
        return
    await message.answer(business.greeting, reply_markup=kb.main_menu())


async def on_consent(callback: CallbackQuery, db: Storage, business: Business, booking: BookingService) -> None:
    db.give_consent(callback.from_user.id, business.privacy_policy_url, booking.now())
    await callback.message.edit_text("Спасибо, согласие сохранено ✅")
    await callback.message.answer(business.greeting, reply_markup=kb.main_menu())
    await callback.answer()


async def cmd_help(message: Message, business: Business) -> None:
    await message.answer(
        f"Я — {business.assistant_name}, виртуальный администратор «{business.name}».\n"
        "• Напишите вопрос обычным текстом — отвечу.\n"
        f"• {kb.MENU_BOOK} — запись на свободное время.\n"
        f"• {kb.MENU_MY} — посмотреть или отменить запись.\n"
        f"• {kb.MENU_ADMIN} — передать вопрос живому человеку.\n"
        "• /delete_my_data — отозвать согласие и удалить ваши данные.",
        reply_markup=kb.main_menu(),
    )


async def cmd_myid(message: Message) -> None:
    await message.answer(
        f"ID этого чата: {message.chat.id}\n"
        "Владельцу: впишите это число в переменную окружения OWNER_CHAT_ID и перезапустите бота — "
        "тогда заявки будут приходить сюда."
    )


async def cmd_delete(message: Message) -> None:
    await message.answer(
        "Удалить ваши данные из бота? Будут удалены история переписки и согласие, "
        "будущие записи — отменены.",
        reply_markup=kb.forget_keyboard(),
    )


async def on_forget(callback: CallbackQuery, state: FSMContext, booking: BookingService) -> None:
    await state.clear()
    if callback.data == "forget:yes":
        cancelled = await booking.forget(client_of(callback.from_user))
        text = "Готово: данные удалены, согласие отозвано."
        if cancelled:
            text += f" Отменено записей: {len(cancelled)}."
        await callback.message.edit_text(text)
    else:
        await callback.message.edit_text("Хорошо, ничего не удаляю.")
    await callback.answer()


async def show_contacts(message: Message, state: FSMContext, business: Business) -> None:
    await state.clear()
    await message.answer(business.contacts_text, reply_markup=kb.main_menu())


async def call_admin(message: Message, state: FSMContext, booking: BookingService) -> None:
    await state.clear()
    await booking.handoff(client_of(message.from_user), "клиент нажал «Позвать администратора»")
    await message.answer(
        f"Передал ваш запрос администратору — с вами свяжутся. Если срочно, звоните: {booking.business.phone}",
        reply_markup=kb.main_menu(),
    )


async def cmd_schedule(message: Message, settings: Settings, booking: BookingService, db: Storage) -> None:
    """Только для владельца: записи на ближайшие 7 дней."""
    if settings.owner_chat_id is None or message.chat.id != settings.owner_chat_id:
        await message.answer("Эта команда доступна только владельцу.")
        return
    now = booking.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    items = db.bookings_between(start, start + timedelta(days=7))
    if not items:
        await message.answer("На ближайшие 7 дней записей нет.")
        return
    lines = ["Записи на 7 дней:"]
    for b in items:
        lines.append(f"• {b.start:%d.%m %H:%M} — {booking.service_name(b.service_id)}, {b.client_name}, {b.phone}")
    await message.answer("\n".join(lines)[:4000])


# ---------------------------------------------------------------- запись кнопками


async def start_booking(message: Message, state: FSMContext, db: Storage, business: Business) -> None:
    await state.clear()
    if await _ask_consent_if_needed(message, message.from_user.id, db, business):
        return
    await message.answer("На какую услугу записать?", reply_markup=kb.services_keyboard(business))


async def on_restart(callback: CallbackQuery, state: FSMContext, business: Business) -> None:
    await state.clear()
    await callback.message.edit_text("На какую услугу записать?", reply_markup=kb.services_keyboard(business))
    await callback.answer()


async def on_service(
    callback: CallbackQuery, state: FSMContext, db: Storage, business: Business, booking: BookingService
) -> None:
    await state.clear()
    if await _ask_consent_if_needed(callback.message, callback.from_user.id, db, business):
        await callback.answer()
        return
    service_id = callback.data.split(":", 1)[1]
    service = business.service(service_id)
    if service is None:
        await callback.answer("Услуга не найдена", show_alert=True)
        return
    days = booking.days_with_slots(service_id, limit=12)
    if not days:
        await callback.message.edit_text(
            f"На «{service.name}» в ближайшие дни свободного времени нет. "
            f"Нажмите «{kb.MENU_ADMIN}» — администратор подберёт время."
        )
    else:
        await callback.message.edit_text(
            f"{service.name}\nДлительность: {service.duration_minutes} мин, цена: {service.price_text}.\nВыберите день:",
            reply_markup=kb.days_keyboard(service_id, days),
        )
    await callback.answer()


async def on_day(callback: CallbackQuery, booking: BookingService) -> None:
    _, service_id, day_text = callback.data.split(":", 2)
    day = date.fromisoformat(day_text)
    slots = booking.free_slots(service_id, day)
    if not slots:
        await callback.answer("На этот день мест уже нет", show_alert=True)
        return
    await callback.message.edit_text(
        f"{booking.service_name(service_id)}, {day:%d.%m.%Y}. Выберите время:",
        reply_markup=kb.slots_keyboard(service_id, day, slots),
    )
    await callback.answer()


async def on_slot(callback: CallbackQuery, state: FSMContext, booking: BookingService) -> None:
    _, service_id, day_text, hhmm = callback.data.split(":", 3)
    day = date.fromisoformat(day_text)
    start = datetime.combine(
        day, datetime.strptime(hhmm, "%H%M").time(), tzinfo=booking.business.schedule.tz
    )
    if start not in booking.free_slots(service_id, day):
        await callback.answer("Это время уже занято, выберите другое", show_alert=True)
        return
    await state.set_state(BookingForm.name)
    await state.update_data(service_id=service_id, start=start.isoformat())
    await callback.message.edit_text(
        f"Вы выбрали: {booking.service_name(service_id)}, {format_dt(start)}.\nКак вас зовут?"
    )
    await callback.answer()


async def on_name(message: Message, state: FSMContext) -> None:
    name = (message.text or "").strip()
    if not 2 <= len(name) <= 80:
        await message.answer("Напишите, пожалуйста, имя (от 2 до 80 символов).")
        return
    await state.update_data(client_name=name)
    await state.set_state(BookingForm.phone)
    await message.answer(
        "Ваш телефон для связи? Нажмите кнопку ниже или напишите номер.", reply_markup=kb.phone_keyboard()
    )


async def on_phone(message: Message, state: FSMContext, booking: BookingService) -> None:
    raw = message.contact.phone_number if message.contact else (message.text or "")
    phone = normalize_phone(raw)
    if not phone:
        await message.answer("Не получилось распознать номер. Напишите в формате +7 900 000-00-00.")
        return
    await state.update_data(phone=phone)
    prompt = booking.business.booking_comment_prompt
    if prompt:
        await state.set_state(BookingForm.comment)
        await message.answer(f"{prompt}\n(если нечего добавить — отправьте «-»)", reply_markup=kb.main_menu())
        return
    await _ask_confirm(message, state, booking)


async def on_comment(message: Message, state: FSMContext, booking: BookingService) -> None:
    comment = (message.text or "").strip()
    await state.update_data(comment="" if comment in ("-", "—") else comment[:300])
    await _ask_confirm(message, state, booking)


async def _ask_confirm(message: Message, state: FSMContext, booking: BookingService) -> None:
    data = await state.get_data()
    start = datetime.fromisoformat(data["start"])
    lines = [
        "Проверьте, пожалуйста:",
        f"Услуга: {booking.service_name(data['service_id'])}",
        f"Когда: {format_dt(start)}",
        f"Имя: {data['client_name']}",
        f"Телефон: {data['phone']}",
    ]
    if data.get("comment"):
        lines.append(f"Комментарий: {data['comment']}")
    await state.set_state(BookingForm.confirm)
    await message.answer("\n".join(lines), reply_markup=kb.confirm_keyboard())


async def on_confirm(callback: CallbackQuery, state: FSMContext, booking: BookingService) -> None:
    data = await state.get_data()
    if await state.get_state() != BookingForm.confirm.state or "start" not in data:
        await callback.answer("Эта заявка устарела — начните запись заново", show_alert=True)
        return
    await state.clear()
    start = datetime.fromisoformat(data["start"])
    try:
        result = await booking.book(
            client_of(callback.from_user),
            service_id=data["service_id"],
            start=start,
            client_name=data["client_name"],
            phone=data["phone"],
            comment=data.get("comment", ""),
            source="buttons",
        )
    except BookingError as exc:
        await callback.message.edit_text(f"Не получилось записать: {exc}")
        slots = booking.free_slots(data["service_id"], start.date())
        if slots:
            await callback.message.answer(
                "Свободное время в этот день:", reply_markup=kb.slots_keyboard(data["service_id"], start.date(), slots)
            )
        await callback.answer()
        return
    await callback.message.edit_text(
        f"✅ Готово! Вы записаны: {booking.client_booking_text(result)}.\n"
        f"Адрес: {booking.business.address}. Если планы изменятся — отмените запись в «{kb.MENU_MY}»."
    )
    await callback.message.answer("Чем ещё помочь?", reply_markup=kb.main_menu())
    await callback.answer()


async def on_book_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.message.edit_text("Запись не создана. Если передумаете — нажмите «📅 Записаться».")
    await callback.answer()


# ---------------------------------------------------------------- мои записи


async def show_my(message: Message, state: FSMContext, db: Storage, booking: BookingService) -> None:
    await state.clear()
    bookings = db.upcoming_for_user(message.from_user.id, booking.now())
    if not bookings:
        await message.answer("У вас нет предстоящих записей.", reply_markup=kb.main_menu())
        return
    lines = ["Ваши записи:"] + [f"№ {b.id}: {booking.client_booking_text(b)}" for b in bookings]
    await message.answer("\n".join(lines), reply_markup=kb.my_bookings_keyboard(bookings))


async def on_cancel_booking(callback: CallbackQuery, booking: BookingService) -> None:
    booking_id = int(callback.data.split(":", 1)[1])
    try:
        cancelled = await booking.cancel(client_of(callback.from_user), booking_id)
    except BookingError as exc:
        await callback.answer(str(exc), show_alert=True)
        return
    await callback.message.edit_text(f"Запись отменена: {booking.client_booking_text(cancelled)}")
    await callback.answer()


# ---------------------------------------------------------------- свободный диалог


async def on_text(
    message: Message, state: FSMContext, db: Storage, business: Business, assistant: AIAssistant
) -> None:
    if await _ask_consent_if_needed(message, message.from_user.id, db, business):
        return
    if message.bot is not None:
        try:
            await message.bot.send_chat_action(chat_id=message.chat.id, action=ChatAction.TYPING)
        except Exception:  # индикатор «печатает» не критичен
            log.debug("send_chat_action failed", exc_info=True)
    answer = await assistant.reply(client_of(message.from_user), message.text or "")
    await message.answer(answer)


async def on_other(message: Message, business: Business) -> None:
    await message.answer(
        f"Пока я понимаю только текстовые сообщения. Напишите вопрос или позвоните: {business.phone}"
    )


# ---------------------------------------------------------------- сборка роутера


def create_router() -> Router:
    """Порядок важен: команды и кнопки меню — раньше, чем шаги формы и свободный текст."""
    router = Router(name="admin_bot")
    m, c = router.message, router.callback_query

    m.register(cmd_start, CommandStart())
    m.register(cmd_help, Command("help"))
    m.register(cmd_myid, Command("myid"))
    m.register(cmd_delete, Command("delete_my_data"))
    m.register(cmd_schedule, Command("schedule"))
    m.register(start_booking, Command("book"))
    m.register(start_booking, F.text == kb.MENU_BOOK)
    m.register(show_my, F.text == kb.MENU_MY)
    m.register(show_contacts, F.text == kb.MENU_CONTACTS)
    m.register(call_admin, F.text == kb.MENU_ADMIN)
    m.register(on_name, BookingForm.name, F.text)
    m.register(on_phone, BookingForm.phone, F.contact | F.text)
    m.register(on_comment, BookingForm.comment, F.text)
    m.register(on_text, F.text)
    m.register(on_other)

    c.register(on_consent, F.data == "consent:yes")
    c.register(on_forget, F.data.startswith("forget:"))
    c.register(on_restart, F.data == "book:restart")
    c.register(on_service, F.data.startswith("svc:"))
    c.register(on_day, F.data.startswith("day:"))
    c.register(on_slot, F.data.startswith("slot:"))
    c.register(on_confirm, F.data == "book:confirm")
    c.register(on_book_cancel, F.data == "book:cancel")
    c.register(on_cancel_booking, F.data.startswith("cancel:"))
    return router
