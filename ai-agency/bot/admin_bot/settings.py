"""Настройки из переменных окружения. Ключи и токены в коде и конфигах НЕ храним."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from .ai import DEFAULT_MODEL

EFFORT_LEVELS = ("low", "medium", "high", "xhigh", "max")


class SettingsError(ValueError):
    pass


@dataclass(frozen=True)
class Settings:
    telegram_token: str
    anthropic_api_key: str
    owner_chat_id: int | None
    business_config: Path
    db_path: str
    model: str
    effort: str | None
    history_messages: int

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if env is None else env
        missing = [name for name in ("TELEGRAM_BOT_TOKEN", "ANTHROPIC_API_KEY") if not env.get(name, "").strip()]
        if missing:
            raise SettingsError(
                "Не заданы переменные окружения: " + ", ".join(missing) + ". См. README, раздел «Шаг 3. Ключи»."
            )

        owner_raw = env.get("OWNER_CHAT_ID", "").strip()
        owner_chat_id = None
        if owner_raw:
            try:
                owner_chat_id = int(owner_raw)
            except ValueError:
                raise SettingsError(f"OWNER_CHAT_ID должен быть числом, получено {owner_raw!r}") from None

        effort = env.get("ANTHROPIC_EFFORT", "low").strip().lower() or None
        if effort is not None and effort not in EFFORT_LEVELS:
            raise SettingsError(f"ANTHROPIC_EFFORT: одно из {EFFORT_LEVELS} или пусто, получено {effort!r}")

        try:
            history = int(env.get("HISTORY_MESSAGES", "20"))
        except ValueError:
            raise SettingsError("HISTORY_MESSAGES должен быть числом") from None

        return cls(
            telegram_token=env["TELEGRAM_BOT_TOKEN"].strip(),
            anthropic_api_key=env["ANTHROPIC_API_KEY"].strip(),
            owner_chat_id=owner_chat_id,
            business_config=Path(env.get("BUSINESS_CONFIG", "configs/dentistry.yaml").strip()),
            db_path=env.get("DB_PATH", "data/bot.db").strip(),
            model=env.get("ANTHROPIC_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL,
            effort=effort,
            history_messages=max(2, history),
        )
