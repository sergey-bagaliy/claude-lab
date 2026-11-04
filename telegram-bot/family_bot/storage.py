"""Хранилище бота: файл SQLite (по умолчанию family_bot.db рядом с ботом).

Здесь лежит то, что должно переживать перезапуск: история разговоров,
список покупок, напоминания, расходы. Файл содержит семейные данные —
в репозиторий он не попадает (.gitignore).
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from .pricing import UsageCounts

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    chat_id INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_by_chat ON messages(chat_id, id);
CREATE TABLE IF NOT EXISTS shopping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    added_by TEXT NOT NULL DEFAULT '',
    bought INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    due_at INTEGER NOT NULL,
    created_by TEXT NOT NULL DEFAULT '',
    created_by_chat INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS reminders_by_due ON reminders(status, due_at);
CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cache_read_tokens INTEGER NOT NULL,
    cache_write_tokens INTEGER NOT NULL,
    web_searches INTEGER NOT NULL,
    cost_usd REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    query TEXT NOT NULL
);
"""


@dataclass(frozen=True)
class Member:
    user_id: int
    first_name: str
    chat_id: int


@dataclass(frozen=True)
class ShoppingItem:
    id: int
    text: str
    added_by: str
    bought: bool


@dataclass(frozen=True)
class Reminder:
    id: int
    chat_id: int
    text: str
    due_at: int
    created_by: str
    created_by_chat: int
    status: str  # pending — ждёт, sent — отправлено, done — сделано, cancelled — удалено


@dataclass(frozen=True)
class SavedRecipe:
    id: int
    chat_id: int
    title: str
    ingredients: list[str]
    query: str


@dataclass(frozen=True)
class Spending:
    cost_usd: float
    requests: int


class Storage:
    def __init__(self, path: str = ":memory:") -> None:
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self.db.commit()

    def close(self) -> None:
        self.db.close()

    def backup_to(self, path: str | Path) -> None:
        """Целостная копия базы (можно делать, пока бот работает)."""
        target = sqlite3.connect(str(path))
        try:
            self.db.backup(target)
        finally:
            target.close()

    # ---------- сохранённые тексты (для кнопки «🔊 Прочитать вслух») ----------

    def save_text(self, chat_id: int, text: str) -> int:
        cursor = self.db.execute("INSERT INTO texts(chat_id, text) VALUES (?, ?)", (chat_id, text))
        self.db.commit()
        return int(cursor.lastrowid)

    def text(self, text_id: int) -> tuple[int, str] | None:
        row = self.db.execute("SELECT chat_id, text FROM texts WHERE id=?", (text_id,)).fetchone()
        return (row["chat_id"], row["text"]) if row else None

    # ---------- члены семьи ----------

    def touch_user(
        self, user_id: int, first_name: str, chat_id: int, now_ts: int, private_chat: bool = True
    ) -> None:
        """Запоминает члена семьи. Адрес для напоминаний берём из личной переписки с ботом:
        сообщение в общей группе не должно «перенаправить» личные напоминания в группу."""
        self.db.execute(
            "INSERT INTO users(user_id, first_name, chat_id, last_seen) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET first_name=excluded.first_name, last_seen=excluded.last_seen, "
            "chat_id=CASE WHEN ? THEN excluded.chat_id ELSE users.chat_id END",
            (user_id, first_name, chat_id, now_ts, private_chat),
        )
        self.db.commit()

    def members(self) -> list[Member]:
        rows = self.db.execute("SELECT user_id, first_name, chat_id FROM users ORDER BY user_id").fetchall()
        return [Member(r["user_id"], r["first_name"], r["chat_id"]) for r in rows]

    def find_member(self, name: str) -> Member | None:
        """Ищет по имени. Понимает падежи: «Вике», «Вику» → Вика."""
        wanted = name.strip().lower()
        if not wanted:
            return None
        members = self.members()
        for member in members:
            if member.first_name.lower() == wanted:
                return member
        stem = wanted[: max(3, len(wanted) - 2)]
        matches = [m for m in members if m.first_name.lower().startswith(stem)]
        return matches[0] if len(matches) == 1 else None

    # ---------- память диалога ----------

    def history(self, chat_id: int, limit: int) -> list[dict[str, str]]:
        rows = self.db.execute(
            "SELECT role, content FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT ?",
            (chat_id, limit),
        ).fetchall()
        history = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
        # Claude API требует, чтобы диалог начинался с сообщения пользователя.
        while history and history[0]["role"] != "user":
            history.pop(0)
        return history

    def add_exchange(self, chat_id: int, user_text: str, assistant_text: str, keep: int) -> None:
        self.db.executemany(
            "INSERT INTO messages(chat_id, role, content) VALUES (?, ?, ?)",
            [(chat_id, "user", user_text), (chat_id, "assistant", assistant_text)],
        )
        # Удаляем всё, что старше последних `keep` сообщений.
        self.db.execute(
            "DELETE FROM messages WHERE chat_id=? AND id NOT IN "
            "(SELECT id FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT ?)",
            (chat_id, chat_id, keep),
        )
        self.db.commit()

    def clear_history(self, chat_id: int) -> None:
        self.db.execute("DELETE FROM messages WHERE chat_id=?", (chat_id,))
        self.db.commit()

    # ---------- список покупок (общий на всю семью) ----------

    def add_shopping(self, items: list[str], added_by: str) -> list[str]:
        """Добавляет товары, пропуская пустые и те, что уже есть в списке. Возвращает добавленное."""
        existing = {item.text.lower() for item in self.shopping() if not item.bought}
        added: list[str] = []
        for raw in items:
            text = " ".join(str(raw).split())[:100]
            if not text or text.lower() in existing:
                continue
            existing.add(text.lower())
            added.append(text)
            self.db.execute("INSERT INTO shopping(text, added_by) VALUES (?, ?)", (text, added_by))
        self.db.commit()
        return added

    def shopping(self) -> list[ShoppingItem]:
        rows = self.db.execute("SELECT * FROM shopping ORDER BY bought, id").fetchall()
        return [ShoppingItem(r["id"], r["text"], r["added_by"], bool(r["bought"])) for r in rows]

    def toggle_bought(self, item_id: int) -> ShoppingItem | None:
        self.db.execute("UPDATE shopping SET bought = 1 - bought WHERE id=?", (item_id,))
        self.db.commit()
        row = self.db.execute("SELECT * FROM shopping WHERE id=?", (item_id,)).fetchone()
        return ShoppingItem(row["id"], row["text"], row["added_by"], bool(row["bought"])) if row else None

    def clear_bought(self) -> int:
        removed = self.db.execute("DELETE FROM shopping WHERE bought=1").rowcount
        self.db.commit()
        return removed

    # ---------- напоминания ----------

    def add_reminder(
        self, chat_id: int, text: str, due_at: int, created_by: str, created_by_chat: int
    ) -> int:
        cursor = self.db.execute(
            "INSERT INTO reminders(chat_id, text, due_at, created_by, created_by_chat) VALUES (?, ?, ?, ?, ?)",
            (chat_id, text, due_at, created_by, created_by_chat),
        )
        self.db.commit()
        return int(cursor.lastrowid)

    def reminder(self, reminder_id: int) -> Reminder | None:
        row = self.db.execute("SELECT * FROM reminders WHERE id=?", (reminder_id,)).fetchone()
        return self._reminder(row) if row else None

    def pending_reminders_for(self, chat_id: int) -> list[Reminder]:
        """Напоминания для этого чата и те, что этот чат создал для других."""
        rows = self.db.execute(
            "SELECT * FROM reminders WHERE status='pending' AND (chat_id=? OR created_by_chat=?) "
            "ORDER BY due_at",
            (chat_id, chat_id),
        ).fetchall()
        return [self._reminder(r) for r in rows]

    def due_reminders(self, now_ts: int) -> list[Reminder]:
        rows = self.db.execute(
            "SELECT * FROM reminders WHERE status='pending' AND due_at<=? ORDER BY due_at", (now_ts,)
        ).fetchall()
        return [self._reminder(r) for r in rows]

    def set_reminder_status(self, reminder_id: int, status: str) -> None:
        self.db.execute("UPDATE reminders SET status=? WHERE id=?", (status, reminder_id))
        self.db.commit()

    def reschedule(self, reminder_id: int, due_at: int) -> None:
        self.db.execute("UPDATE reminders SET due_at=?, status='pending' WHERE id=?", (due_at, reminder_id))
        self.db.commit()

    @staticmethod
    def _reminder(row: sqlite3.Row) -> Reminder:
        return Reminder(
            row["id"],
            row["chat_id"],
            row["text"],
            row["due_at"],
            row["created_by"],
            row["created_by_chat"],
            row["status"],
        )

    # ---------- расходы ----------

    def add_usage(self, day: str, kind: str, model: str, counts: UsageCounts, cost_usd: float) -> None:
        self.db.execute(
            "INSERT INTO usage(day, kind, model, input_tokens, output_tokens, cache_read_tokens, "
            "cache_write_tokens, web_searches, cost_usd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                day,
                kind,
                model,
                counts.input_tokens,
                counts.output_tokens,
                counts.cache_read_tokens,
                counts.cache_write_tokens,
                counts.web_searches,
                cost_usd,
            ),
        )
        self.db.commit()

    def spent(self, day_prefix: str) -> Spending:
        """day_prefix: '2026-11-04' — за день, '2026-11' — за месяц."""
        row = self.db.execute(
            "SELECT COALESCE(SUM(cost_usd), 0) AS cost, COUNT(*) AS n FROM usage WHERE day LIKE ?",
            (day_prefix + "%",),
        ).fetchone()
        return Spending(float(row["cost"]), int(row["n"]))

    def spent_by_kind(self, day_prefix: str) -> dict[str, Spending]:
        rows = self.db.execute(
            "SELECT kind, SUM(cost_usd) AS cost, COUNT(*) AS n FROM usage WHERE day LIKE ? "
            "GROUP BY kind ORDER BY cost DESC",
            (day_prefix + "%",),
        ).fetchall()
        return {r["kind"]: Spending(float(r["cost"]), int(r["n"])) for r in rows}

    # ---------- настройки (например, выбранная модель Claude) ----------

    def get_setting(self, key: str) -> str | None:
        row = self.db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return row["value"] if row else None

    def set_setting(self, key: str, value: str) -> None:
        self.db.execute(
            "INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        self.db.commit()

    # ---------- рецепты (для кнопок «в покупки» и «другой рецепт») ----------

    def save_recipe(self, chat_id: int, title: str, ingredients: list[str], query: str) -> int:
        cursor = self.db.execute(
            "INSERT INTO recipes(chat_id, title, ingredients, query) VALUES (?, ?, ?, ?)",
            (chat_id, title, json.dumps(ingredients, ensure_ascii=False), query),
        )
        self.db.commit()
        return int(cursor.lastrowid)

    def recipe(self, recipe_id: int) -> SavedRecipe | None:
        row = self.db.execute("SELECT * FROM recipes WHERE id=?", (recipe_id,)).fetchone()
        if not row:
            return None
        return SavedRecipe(
            row["id"], row["chat_id"], row["title"], json.loads(row["ingredients"]), row["query"]
        )
