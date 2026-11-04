"""Уведомления владельцу бизнеса в Telegram."""

from __future__ import annotations

import logging

from aiogram import Bot

log = logging.getLogger(__name__)


class TelegramNotifier:
    """Отправляет сообщения владельцу (чат OWNER_CHAT_ID)."""

    def __init__(self, bot: Bot, owner_chat_id: int | None):
        self.bot = bot
        self.owner_chat_id = owner_chat_id

    async def notify_owner(self, text: str) -> None:
        if self.owner_chat_id is None:
            log.warning("OWNER_CHAT_ID не задан — уведомление владельцу не отправлено:\n%s", text)
            return
        await self.bot.send_message(self.owner_chat_id, text[:4000])
