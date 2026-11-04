"""Тексты бота и вспомогательные функции для сообщений."""

from __future__ import annotations

# Telegram не принимает сообщения длиннее 4096 символов.
TELEGRAM_LIMIT = 4096

START_TEXT = """Здравствуйте! Я «Семейный помощник» 🏠

Пишите мне любой вопрос обычным сообщением — я отвечу и запомню последние сообщения, так что можно уточнять: «а подробнее про второй пункт?».

Команды:
/primery — 10 примеров на умножение для Никиты
/primery 7 — примеры только на 7 (можно любое число от 2 до 9)
/vyhodnye — идеи, как провести выходные всей семьёй
/sbros — забыть историю разговора
/start — эта подсказка"""

RESET_TEXT = "Готово, историю разговора забыл. Начнём с чистого листа 🙂"
UNKNOWN_COMMAND_TEXT = "Такой команды я не знаю. Список команд — /start"
ONLY_TEXT = "Пока я понимаю только текстовые сообщения ✍️"
PRIMERY_USAGE = "Напишите /primery или, например, /primery 7 — число от 2 до 9."


def access_denied_text(user_id: int) -> str:
    return (
        "Это семейный бот, он отвечает только своим 🙂\n"
        f"Ваш Telegram ID: {user_id}\n"
        "Если вы из семьи — попросите добавить этот номер в ALLOWED_USER_IDS."
    )


def split_message(text: str, limit: int = TELEGRAM_LIMIT) -> list[str]:
    """Режет длинный текст на части не длиннее limit, по возможности по абзацам."""
    text = text.strip()
    parts: list[str] = []
    while len(text) > limit:
        cut = text.rfind("\n", 0, limit + 1)
        if cut <= 0:
            cut = text.rfind(" ", 0, limit + 1)
        if cut <= 0:
            cut = limit
        parts.append(text[:cut].rstrip())
        text = text[cut:].lstrip()
    if text:
        parts.append(text)
    return parts
