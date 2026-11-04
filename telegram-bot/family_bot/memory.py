"""Память диалога: последние сообщения каждого чата.

Хранится в оперативной памяти — после перезапуска бота история пропадает.
Для семейного бота этого достаточно.
"""

from __future__ import annotations


class ChatMemory:
    def __init__(self, max_messages: int) -> None:
        if max_messages < 2:
            raise ValueError("max_messages должно быть не меньше 2")
        self.max_messages = max_messages
        self._chats: dict[int, list[dict[str, str]]] = {}

    def get(self, chat_id: int) -> list[dict[str, str]]:
        """Копия истории чата в формате Claude API: [{"role": ..., "content": ...}]."""
        return [dict(message) for message in self._chats.get(chat_id, [])]

    def add_exchange(self, chat_id: int, user_text: str, assistant_text: str) -> None:
        """Запоминает пару «вопрос — ответ» и обрезает старые сообщения."""
        history = self._chats.setdefault(chat_id, [])
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": assistant_text})

        del history[: max(0, len(history) - self.max_messages)]
        # Claude API требует, чтобы диалог начинался с сообщения пользователя.
        while history and history[0]["role"] != "user":
            history.pop(0)

    def clear(self, chat_id: int) -> None:
        self._chats.pop(chat_id, None)
