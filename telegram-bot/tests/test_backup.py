"""Ежедневные резервные копии базы."""

import asyncio
import sqlite3
from datetime import datetime

import pytest
from aiogram import Bot
from aiogram.methods import SendDocument

from family_bot.backup import BackupService
from family_bot.storage import Storage
from family_bot.timeutil import TZ

from .conftest import FakeClock, FakeTelegramSession


@pytest.fixture
def db(tmp_path):
    storage = Storage(str(tmp_path / "family_bot.db"))
    storage.add_shopping(["молоко"], added_by="Сергей")
    yield storage
    storage.close()


def test_backup_is_a_working_copy(db, tmp_path, clock):
    path = BackupService(db, tmp_path / "backups", clock=clock).make_backup()
    assert path.name == "family_bot-2026-11-04.db"
    with sqlite3.connect(path) as copy:
        assert copy.execute("SELECT text FROM shopping").fetchall() == [("молоко",)]


def test_old_backups_are_removed(db, tmp_path, clock):
    backups = tmp_path / "backups"
    service = BackupService(db, backups, keep_days=3, clock=clock)
    for _ in range(5):
        service.make_backup()
        clock.advance(days=1)
    (backups / "notes.txt").write_text("чужой файл")
    assert sorted(p.name for p in backups.iterdir()) == [
        "family_bot-2026-11-06.db",
        "family_bot-2026-11-07.db",
        "family_bot-2026-11-08.db",
        "notes.txt",  # чужое не трогаем
    ]


@pytest.mark.parametrize(
    "now, hours",
    [
        (datetime(2026, 11, 4, 3, 0, tzinfo=TZ), 0.5),  # сегодня в 03:30
        (datetime(2026, 11, 4, 15, 0, tzinfo=TZ), 12.5),  # завтра в 03:30
        (datetime(2026, 11, 4, 3, 30, tzinfo=TZ), 24),
    ],
)
def test_next_run_at_half_past_three(db, tmp_path, now, hours):
    service = BackupService(db, tmp_path, clock=FakeClock(now))
    assert service.seconds_until_next_run() == pytest.approx(hours * 3600)


async def test_send_copy_to_admin(db, tmp_path, clock):
    session = FakeTelegramSession()
    bot = Bot(token="123456:TEST", session=session)
    service = BackupService(db, tmp_path / "b", clock=clock, bot=bot, admin_id=100, send_to_admin=True)
    await service.backup_and_send()
    [document] = session.of_type(SendDocument)
    assert document.chat_id == 100 and "4 ноября" in document.caption
    assert document.disable_notification is True


async def test_no_copy_to_telegram_by_default(db, tmp_path, clock):
    session = FakeTelegramSession()
    bot = Bot(token="123456:TEST", session=session)
    await BackupService(db, tmp_path / "b", clock=clock, bot=bot, admin_id=100).backup_and_send()
    assert session.requests == []


async def test_backup_on_start_if_missing(db, tmp_path, clock, monkeypatch):
    service = BackupService(db, tmp_path / "b", clock=clock)

    async def stop(seconds):
        raise asyncio.CancelledError

    monkeypatch.setattr("family_bot.backup.asyncio.sleep", stop)
    with pytest.raises(asyncio.CancelledError):
        await service.run_forever()
    assert service.path_for(clock().date()).exists()
