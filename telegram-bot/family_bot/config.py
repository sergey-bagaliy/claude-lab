"""Настройки бота. Всё берём ТОЛЬКО из переменных окружения.

Ключи никогда не пишем в код и не храним в репозитории.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass, field

# Экономная модель: Claude Haiku 5.5 — самая дешёвая из актуальных.
# Можно поменять без правки кода через переменную CLAUDE_MODEL,
# например на "claude-sonnet-5-5" (умнее, но дороже).
DEFAULT_MODEL = "claude-haiku-5-5"

# Сколько последних сообщений бот помнит в каждом чате
# (20 = 10 ваших вопросов + 10 ответов бота).
DEFAULT_MEMORY_SIZE = 20


class ConfigError(Exception):
    """Ошибка настройки: не задана или неверно задана переменная окружения."""


@dataclass(frozen=True)
class Settings:
    telegram_token: str = field(repr=False)  # repr=False: ключ не попадёт в логи
    anthropic_api_key: str = field(repr=False)
    model: str = DEFAULT_MODEL
    memory_size: int = DEFAULT_MEMORY_SIZE
    allowed_user_ids: frozenset[int] = frozenset()


def _parse_positive_int(name: str, raw: str) -> int:
    try:
        value = int(raw)
    except ValueError:
        raise ConfigError(f"{name} должно быть целым числом, а сейчас: {raw!r}") from None
    if value < 2:
        raise ConfigError(f"{name} должно быть не меньше 2, а сейчас: {value}")
    return value


def _parse_user_ids(raw: str) -> frozenset[int]:
    ids: set[int] = set()
    for part in raw.replace(";", ",").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.add(int(part))
        except ValueError:
            raise ConfigError(
                "ALLOWED_USER_IDS — это числа через запятую, например: 123456789,987654321. "
                f"Не получилось разобрать: {part!r}"
            ) from None
    return frozenset(ids)


def load_settings(env: Mapping[str, str] | None = None) -> Settings:
    """Читает настройки из переменных окружения и проверяет их."""
    if env is None:
        env = os.environ

    telegram_token = env.get("TELEGRAM_BOT_TOKEN", "").strip()
    anthropic_api_key = env.get("ANTHROPIC_API_KEY", "").strip()

    missing = [
        name
        for name, value in (
            ("TELEGRAM_BOT_TOKEN", telegram_token),
            ("ANTHROPIC_API_KEY", anthropic_api_key),
        )
        if not value
    ]
    if missing:
        raise ConfigError(
            "Не заданы переменные окружения: "
            + ", ".join(missing)
            + ".\nКак их задать — см. README.md, раздел «Запуск на Windows»."
        )

    model = env.get("CLAUDE_MODEL", "").strip() or DEFAULT_MODEL

    raw_memory = env.get("MEMORY_SIZE", "").strip()
    memory_size = _parse_positive_int("MEMORY_SIZE", raw_memory) if raw_memory else DEFAULT_MEMORY_SIZE

    allowed_user_ids = _parse_user_ids(env.get("ALLOWED_USER_IDS", ""))

    return Settings(
        telegram_token=telegram_token,
        anthropic_api_key=anthropic_api_key,
        model=model,
        memory_size=memory_size,
        allowed_user_ids=allowed_user_ids,
    )
