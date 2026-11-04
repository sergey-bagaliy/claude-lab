"""Хранилище на SQLite: записи клиентов, согласия на обработку ПДн, история диалога.

Файл базы лежит на вашем сервере (по умолчанию data/bot.db).
Время хранится в UTC, наружу отдаётся в часовом поясе бизнеса.
"""

from __future__ import annotations

import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .scheduling import fits_capacity

SCHEMA = """
CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    client_name  TEXT NOT NULL,
    phone        TEXT NOT NULL,
    service_id   TEXT NOT NULL,
    start_utc    TEXT NOT NULL,
    end_utc      TEXT NOT NULL,
    comment      TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'active',
    source       TEXT NOT NULL DEFAULT 'buttons',
    created_utc  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(status, start_utc);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, status);

CREATE TABLE IF NOT EXISTS consents (
    user_id      INTEGER PRIMARY KEY,
    given_utc    TEXT NOT NULL,
    policy_url   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    role         TEXT NOT NULL,
    content      TEXT NOT NULL,
    created_utc  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id, id);
"""

DELETED = "удалено по запросу клиента"


def _utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        raise ValueError("Нужна дата с часовым поясом")
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


@dataclass(frozen=True)
class Booking:
    id: int
    user_id: int
    client_name: str
    phone: str
    service_id: str
    start: datetime
    end: datetime
    comment: str
    status: str
    source: str


class Storage:
    def __init__(self, path: str, tz: ZoneInfo):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._tz = tz
        self._lock = threading.Lock()
        # isolation_level=None — транзакции открываем сами (BEGIN IMMEDIATE),
        # чтобы два клиента не заняли одно и то же время.
        self._conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)

    def close(self) -> None:
        self._conn.close()

    # ------------------------------------------------------------ согласия

    def has_consent(self, user_id: int) -> bool:
        with self._lock:
            row = self._conn.execute("SELECT 1 FROM consents WHERE user_id = ?", (user_id,)).fetchone()
        return row is not None

    def give_consent(self, user_id: int, policy_url: str, now: datetime) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO consents(user_id, given_utc, policy_url) VALUES (?, ?, ?)",
                (user_id, _utc(now), policy_url),
            )

    # ------------------------------------------------------------ история диалога

    def add_history(self, user_id: int, role: str, content: str, now: datetime) -> None:
        if role not in ("user", "assistant"):
            raise ValueError(role)
        with self._lock:
            self._conn.execute(
                "INSERT INTO history(user_id, role, content, created_utc) VALUES (?, ?, ?, ?)",
                (user_id, role, content, _utc(now)),
            )

    def get_history(self, user_id: int, limit: int) -> list[dict[str, str]]:
        """Последние сообщения диалога в формате Messages API (первое — всегда от клиента)."""
        with self._lock:
            rows = self._conn.execute(
                "SELECT role, content FROM history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
        messages = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
        while messages and messages[0]["role"] != "user":
            messages.pop(0)
        return messages

    # ------------------------------------------------------------ записи

    def _row_to_booking(self, row: sqlite3.Row) -> Booking:
        return Booking(
            id=row["id"],
            user_id=row["user_id"],
            client_name=row["client_name"],
            phone=row["phone"],
            service_id=row["service_id"],
            start=datetime.fromisoformat(row["start_utc"]).astimezone(self._tz),
            end=datetime.fromisoformat(row["end_utc"]).astimezone(self._tz),
            comment=row["comment"],
            status=row["status"],
            source=row["source"],
        )

    def _busy(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        rows = self._conn.execute(
            "SELECT start_utc, end_utc FROM bookings WHERE status = 'active' AND start_utc < ? AND end_utc > ?",
            (_utc(end), _utc(start)),
        ).fetchall()
        return [(datetime.fromisoformat(r["start_utc"]), datetime.fromisoformat(r["end_utc"])) for r in rows]

    def busy_intervals(self, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
        with self._lock:
            return self._busy(start, end)

    def create_booking_if_free(
        self,
        *,
        user_id: int,
        client_name: str,
        phone: str,
        service_id: str,
        start: datetime,
        end: datetime,
        comment: str,
        source: str,
        capacity: int,
        now: datetime,
    ) -> Booking | None:
        """Атомарно проверяет, что время свободно, и создаёт запись. None — если время заняли."""
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            try:
                if not fits_capacity(start, end, self._busy(start, end), capacity):
                    self._conn.execute("ROLLBACK")
                    return None
                cur = self._conn.execute(
                    """INSERT INTO bookings(user_id, client_name, phone, service_id, start_utc, end_utc,
                                            comment, source, created_utc)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (user_id, client_name, phone, service_id, _utc(start), _utc(end), comment, source, _utc(now)),
                )
                row = self._conn.execute("SELECT * FROM bookings WHERE id = ?", (cur.lastrowid,)).fetchone()
                self._conn.execute("COMMIT")
            except Exception:
                self._conn.execute("ROLLBACK")
                raise
        return self._row_to_booking(row)

    def upcoming_for_user(self, user_id: int, now: datetime) -> list[Booking]:
        with self._lock:
            rows = self._conn.execute(
                """SELECT * FROM bookings WHERE user_id = ? AND status = 'active' AND start_utc >= ?
                   ORDER BY start_utc""",
                (user_id, _utc(now)),
            ).fetchall()
        return [self._row_to_booking(r) for r in rows]

    def bookings_between(self, start: datetime, end: datetime) -> list[Booking]:
        with self._lock:
            rows = self._conn.execute(
                """SELECT * FROM bookings WHERE status = 'active' AND start_utc >= ? AND start_utc < ?
                   ORDER BY start_utc""",
                (_utc(start), _utc(end)),
            ).fetchall()
        return [self._row_to_booking(r) for r in rows]

    def cancel_booking(self, user_id: int, booking_id: int) -> Booking | None:
        """Отменяет запись клиента. None — если записи нет или она чужая/уже отменена."""
        with self._lock:
            cur = self._conn.execute(
                "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'active'",
                (booking_id, user_id),
            )
            if cur.rowcount == 0:
                return None
            row = self._conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        return self._row_to_booking(row)

    def forget_user(self, user_id: int, now: datetime) -> list[Booking]:
        """Отзыв согласия: удаляем историю и согласие, будущие записи отменяем, ПДн в записях затираем.

        Возвращает отменённые будущие записи (их показываем владельцу, чтобы освободить время).
        """
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE")
            try:
                rows = self._conn.execute(
                    "SELECT * FROM bookings WHERE user_id = ? AND status = 'active' AND start_utc >= ?",
                    (user_id, _utc(now)),
                ).fetchall()
                cancelled = [self._row_to_booking(r) for r in rows]
                self._conn.execute(
                    "UPDATE bookings SET status = 'cancelled' WHERE user_id = ? AND status = 'active' AND start_utc >= ?",
                    (user_id, _utc(now)),
                )
                self._conn.execute(
                    "UPDATE bookings SET client_name = ?, phone = ?, comment = '' WHERE user_id = ?",
                    (DELETED, DELETED, user_id),
                )
                self._conn.execute("DELETE FROM history WHERE user_id = ?", (user_id,))
                self._conn.execute("DELETE FROM consents WHERE user_id = ?", (user_id,))
                self._conn.execute("COMMIT")
            except Exception:
                self._conn.execute("ROLLBACK")
                raise
        return cancelled
