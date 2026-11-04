"""Бот целиком: апдейт Telegram → aiogram → обработчик → ответ.

Telegram подменён FakeTelegramSession, Claude — FakeClaude.
"""

import pytest
from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.methods import AnswerCallbackQuery, EditMessageReplyMarkup, EditMessageText, SendChatAction
from aiogram.types import PhotoSize, ReplyKeyboardMarkup

from family_bot import texts
from family_bot.app import build_dispatcher
from family_bot.config import Settings
from family_bot.handlers import Deps

from .conftest import (
    FakeTelegramSession,
    api_connection_error,
    claude_message,
    claude_text,
    make_callback,
    make_update,
    recipe_turn,
    text,
    tool_use,
)


class BotEnv:
    def __init__(self, assistant, storage, clock, allowed=frozenset(), budget=0.0):
        self.session = FakeTelegramSession()
        self.bot = Bot(token="123456:TEST-TOKEN", session=self.session)
        self.deps = Deps(assistant=assistant, storage=storage, clock=clock, daily_budget_usd=budget)
        settings = Settings(telegram_token="x", anthropic_api_key="y", allowed_user_ids=frozenset(allowed))
        self.dp = build_dispatcher(self.deps, settings)

    async def send(self, value=None, **kwargs):
        await self.dp.feed_update(self.bot, make_update(value, **kwargs))

    async def press(self, data, **kwargs):
        await self.dp.feed_update(self.bot, make_callback(data, **kwargs))

    def texts(self):
        return [m.text for m in self.session.sent()]

    def last(self):
        return self.session.sent()[-1]

    def edits(self):
        return self.session.of_type(EditMessageText)

    def alerts(self):
        return [a.text for a in self.session.of_type(AnswerCallbackQuery) if a.text]


@pytest.fixture
def env(assistant, storage, clock):
    return BotEnv(assistant, storage, clock)


def buttons(markup):
    return [b.text for row in markup.inline_keyboard for b in row]


# ---------- старт и меню ----------


async def test_start_shows_menu(env, fake_claude):
    await env.send("/start")
    sent = env.last()
    assert "Семейный помощник" in sent.text
    assert isinstance(sent.reply_markup, ReplyKeyboardMarkup)
    menu = [b.text for row in sent.reply_markup.keyboard for b in row]
    assert menu == [
        texts.BTN_RECIPE,
        texts.BTN_SHOPPING,
        texts.BTN_REMINDERS,
        texts.BTN_WEEKEND,
        texts.BTN_QUIZ,
        texts.BTN_STORY,
        texts.BTN_NEW,
        texts.BTN_COSTS,
    ]
    assert fake_claude.messages.calls == []


async def test_help(env):
    await env.send("/help")
    assert env.last().parse_mode == ParseMode.HTML
    assert "/recept" in env.last().text


# ---------- рецепты ----------


async def test_recipe_flow_with_photo_and_shopping(env, fake_claude, storage):
    await env.send(texts.BTN_RECIPE)
    assert buttons(env.last().reply_markup) == [
        "🥣 Завтрак",
        "🍲 Обед",
        "🍝 Ужин за 30 минут",
        "🧁 Десерт с детьми",
    ]

    fake_claude.messages.queue.append(recipe_turn())
    await env.send("курица, рис, морковь")  # бот ждал ответ на «что приготовим?»

    assert fake_claude.messages.calls[0]["output_config"] == {"effort": "medium"}
    assert "Нужен рецепт: курица, рис, морковь" in fake_claude.messages.calls[0]["messages"][-1]["content"]
    card = env.last()
    assert card.parse_mode == ParseMode.HTML
    assert "🍲 <b>Курица с рисом</b>" in card.text
    # фото — крупное превью страницы рецепта над текстом
    assert card.link_preview_options.url == "https://example.ru/recipe/kurica-s-risom"
    assert card.link_preview_options.prefer_large_media and card.link_preview_options.show_above_text
    assert buttons(card.reply_markup) == ["🛒 Продукты в покупки", "🔄 Другой рецепт"]

    await env.press(card.reply_markup.inline_keyboard[0][0].callback_data)
    assert [i.text for i in storage.shopping()] == ["курица — 600 г", "рис — 1 стакан", "морковь — 1 шт."]
    assert "Добавлено в покупки: 3" in env.alerts()
    [edit] = env.session.of_type(EditMessageReplyMarkup)
    assert buttons(edit.reply_markup)[0] == "✅ Продукты в покупках"


async def test_recipe_preset_and_another_recipe(env, fake_claude):
    fake_claude.messages.queue += [recipe_turn(), recipe_turn()]
    await env.press("rq:dinner")
    assert "30 минут" in fake_claude.messages.calls[0]["messages"][-1]["content"]

    await env.press(env.last().reply_markup.inline_keyboard[1][0].callback_data)  # «Другой рецепт»
    request = fake_claude.messages.calls[1]["messages"][-1]["content"]
    assert "Только не «Курица с рисом»" in request


async def test_recipe_command_with_text(env, fake_claude):
    fake_claude.messages.queue.append(recipe_turn())
    await env.send("/recept сырники")
    assert "Нужен рецепт: сырники" in fake_claude.messages.calls[0]["messages"][-1]["content"]


async def test_menu_button_cancels_waiting(env, fake_claude):
    await env.send(texts.BTN_RECIPE)
    await env.send(texts.BTN_SHOPPING)  # передумали — открыли покупки
    await env.send("Как дела?")  # это уже обычный вопрос, не рецепт
    assert "Нужен рецепт" not in fake_claude.messages.calls[0]["messages"][-1]["content"]


# ---------- покупки ----------


async def test_shopping_list_buttons(env, storage):
    await env.send(texts.BTN_SHOPPING)
    assert "пуст" in env.last().text

    await env.press("shop:add")
    await env.send("молоко, хлеб\nяйца")
    assert env.last().text.startswith("Добавил: молоко, хлеб, яйца")
    assert buttons(env.last().reply_markup)[:3] == ["⬜ молоко", "⬜ хлеб", "⬜ яйца"]

    milk = storage.shopping()[0]
    await env.press(f"shop:t:{milk.id}")
    assert "✅ Куплено: молоко" in env.alerts()
    assert buttons(env.edits()[-1].reply_markup)[:3] == ["⬜ хлеб", "⬜ яйца", "✅ молоко"]

    await env.press("shop:clear")
    assert [i.text for i in storage.shopping()] == ["хлеб", "яйца"]


async def test_shopping_through_claude(env, fake_claude, storage):
    fake_claude.messages.queue += [
        claude_message(
            tool_use("add_shopping_items", {"items": ["свечи для торта"]}), stop_reason="tool_use"
        ),
        claude_text("Добавил свечи для торта в список."),
    ]
    await env.send("Добавь в покупки свечи для торта")
    assert env.last().text == "Добавил свечи для торта в список."
    assert storage.shopping()[0].added_by == "Сергей"


# ---------- напоминания ----------


async def test_reminders_view_and_delete(env, storage, clock):
    await env.send(texts.BTN_REMINDERS)
    assert "Напоминаний пока нет" in env.last().text

    due = int(clock().timestamp()) + 3600
    storage.touch_user(200, "Вика", 200, 0)
    reminder_id = storage.add_reminder(200, "забрать Катю", due, "Сергей", 100)
    await env.send("/napomni")
    assert "сегодня в 16:00 — забрать Катю → Вика" in env.last().text

    await env.press(f"rem:del:{reminder_id}")
    assert storage.reminder(reminder_id).status == "cancelled"


async def test_reminder_snooze_and_done(env, storage, clock):
    reminder_id = storage.add_reminder(100, "позвонить маме", int(clock().timestamp()), "Сергей", 100)
    await env.press(f"rem:snz:{reminder_id}:60")
    assert storage.reminder(reminder_id).due_at == int(clock().timestamp()) + 3600
    assert env.edits()[-1].text == "⏰ Напомню сегодня в 16:00: позвонить маме"

    await env.press(f"rem:done:{reminder_id}")
    assert storage.reminder(reminder_id).status == "done"


async def test_cannot_touch_other_peoples_reminders(env, storage, clock):
    reminder_id = storage.add_reminder(300, "чужое", int(clock().timestamp()), "Гость", 300)
    await env.press(f"rem:del:{reminder_id}")
    assert storage.reminder(reminder_id).status == "pending"
    assert "Напоминание не найдено." in env.alerts()


async def test_napomni_with_text_goes_to_claude(env, fake_claude):
    await env.send("/napomni завтра в 9 позвонить маме")
    assert fake_claude.messages.calls[0]["messages"][-1]["content"].endswith(
        "Поставь напоминание: завтра в 9 позвонить маме"
    )


# ---------- тренажёр для Никиты ----------


async def test_quiz_game(env, fake_claude):
    await env.send(texts.BTN_QUIZ)
    assert buttons(env.last().reply_markup)[0] == "🎲 Вся таблица"

    await env.press("quiz:new:7")
    game = env.deps.quiz_games[100]
    assert "7 × " in env.edits()[-1].text

    for number in range(10):
        right = game.current.answer
        await env.press(f"quiz:a:{game.id}:{right if number else right + 1}")

    final = env.edits()[-1]
    assert "9 из 10" in final.text and "Запомним:" in final.text
    assert buttons(final.reply_markup) == ["🔁 Ещё раз", "🎯 Другая таблица"]
    assert 100 not in env.deps.quiz_games
    assert fake_claude.messages.calls == []  # бесплатно

    await env.press(f"quiz:a:{game.id}:56")  # нажали на кнопку старой игры
    assert texts.QUIZ_EXPIRED in env.alerts()


async def test_primery_command(env):
    await env.send("/primery 7")
    assert "7 × " in env.last().text and len(buttons(env.last().reply_markup)) == 4
    await env.send("/primery 12")
    assert "от 2 до 9" in env.last().text


async def test_quiz_list_mode(env):
    await env.press("quiz:list:0")
    assert env.last().text.count("<tg-spoiler>") == 10


# ---------- сказки, выходные, расходы ----------


async def test_story(env, fake_claude):
    fake_claude.messages.queue.append(claude_text("Жила-была Катя…"))
    fake_claude.messages.delay = 0.05
    await env.send(texts.BTN_STORY)
    assert env.texts()[0] == texts.STORY_WRITING
    assert env.last().text == "Жила-была Катя…"
    assert buttons(env.last().reply_markup)[0] == "🔄 Другая сказка"
    assert env.session.of_type(SendChatAction)  # «печатает…»

    await env.press("story:space")
    assert "про космос" in fake_claude.messages.calls[1]["messages"][-1]["content"]


async def test_weekend_with_variants(env, fake_claude):
    await env.send(texts.BTN_WEEKEND)
    first = fake_claude.messages.calls[0]
    assert (
        "прогноз погоды" in first["messages"][-1]["content"] and first["output_config"]["effort"] == "medium"
    )
    assert buttons(env.last().reply_markup) == ["🏠 Дома", "🏙 В городе", "🚗 Поездка", "🔄 Другие идеи"]

    await env.press("wk:trip")
    assert "Только поездки" in fake_claude.messages.calls[1]["messages"][-1]["content"]


async def test_costs(env, fake_claude):
    fake_claude.messages.queue.append(claude_message(text("ok"), searches=1))
    await env.send("Привет")
    await env.send(texts.BTN_COSTS)
    report = env.last().text
    assert "Сегодня: $0.01 — запросов: 1" in report
    assert "Разговор" in report


async def test_budget_message(assistant, storage, clock, fake_claude):
    assistant.daily_budget_usd = 0.001
    env = BotEnv(assistant, storage, clock, budget=0.001)
    await env.send("Привет")
    await env.send("Ещё")
    assert "лимит" in env.last().text
    assert len(fake_claude.messages.calls) == 1


# ---------- диалог и прочее ----------


async def test_dialog_with_memory(env, fake_claude):
    fake_claude.messages.queue += [claude_text("Запомнил!"), claude_text("Вас зовут Сергей.")]
    await env.send("Меня зовут Сергей")
    await env.send("Как меня зовут?")
    assert env.texts() == ["Запомнил!", "Вас зовут Сергей."]
    assert len(fake_claude.messages.calls[1]["messages"]) == 3
    assert env.last().parse_mode is None and env.last().link_preview_options.is_disabled


async def test_new_conversation(env, fake_claude, storage):
    await env.send("Привет")
    await env.send(texts.BTN_NEW)
    assert storage.history(100, 20) == []
    assert "забыл" in env.last().text


async def test_long_answer_is_split(env, fake_claude):
    fake_claude.messages.queue.append(claude_text("абзац\n" * 1500))
    await env.send("Расскажи подробно")
    assert len(env.texts()) == 3 and all(len(t) <= 4096 for t in env.texts())


async def test_claude_error_is_shown_politely(env, fake_claude):
    fake_claude.messages.queue.append(api_connection_error())
    await env.send("Привет")
    assert env.last().text.startswith("⚠️") and "интернет" in env.last().text


async def test_unknown_command(env, fake_claude):
    await env.send("/kakaya-to")
    assert "не знаю" in env.last().text
    assert fake_claude.messages.calls == []


async def test_other_bots_command_in_group_is_ignored(env):
    await env.send("/start@other_shop_bot", user_id=100, chat_id=-500)
    await env.send("/foo@other_shop_bot", user_id=100, chat_id=-500)
    assert env.texts() == []
    await env.send("/foo@family_helper_krd_bot", user_id=100, chat_id=-500)
    assert "не знаю" in env.last().text


async def test_photo_is_not_supported(env, fake_claude):
    photo = [PhotoSize(file_id="f", file_unique_id="u", width=10, height=10)]
    await env.send(None, photo=photo)
    assert "только текстовые" in env.last().text


# ---------- доступ ----------


async def test_stranger_is_blocked(assistant, storage, clock, fake_claude):
    env = BotEnv(assistant, storage, clock, allowed={100})
    await env.send("Привет", user_id=999)
    assert "999" in env.last().text and "ALLOWED_USER_IDS" in env.last().text
    await env.press("shop:clear", user_id=999)
    assert any("999" in a for a in env.alerts())
    assert fake_claude.messages.calls == []
    assert [m.user_id for m in storage.members()] == [100]  # чужой не запомнен


async def test_family_member_passes_and_is_remembered(assistant, storage, clock, fake_claude):
    env = BotEnv(assistant, storage, clock, allowed={100, 200})
    await env.send("Привет", user_id=200)
    assert env.last().text == "Ответ Claude"
    assert "Пишет: Вика" in fake_claude.messages.calls[0]["messages"][-1]["content"]
    assert storage.find_member("Вика").chat_id == 200
