"""Примерная стоимость запросов к Claude — для команды «Расходы» и дневного лимита.

Цены в долларах за 1 миллион токенов. Источник (ноябрь 2026):
https://platform.claude.com/docs/en/about-claude/pricing
Цены могут меняться — точный расход всегда виден в Claude Console.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Price:
    input: float
    output: float
    cache_write: float  # запись в кэш на 5 минут
    cache_read: float  # чтение из кэша


PRICES = {
    "claude-sonnet-5-5": Price(input=2.00, output=10.00, cache_write=2.50, cache_read=0.10),
    "claude-haiku-5-5": Price(input=0.10, output=0.50, cache_write=0.125, cache_read=0.01),
    "claude-opus-5-5": Price(input=4.00, output=20.00, cache_write=5.00, cache_read=0.20),
}
# Для незнакомой модели считаем по ценам Sonnet — лучше переоценить, чем недооценить.
FALLBACK_PRICE = PRICES["claude-sonnet-5-5"]

WEB_SEARCH_USD = 10.00 / 1000  # $10 за 1000 поисков


@dataclass(frozen=True)
class UsageCounts:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    web_searches: int = 0

    def __add__(self, other: UsageCounts) -> UsageCounts:
        return UsageCounts(
            self.input_tokens + other.input_tokens,
            self.output_tokens + other.output_tokens,
            self.cache_read_tokens + other.cache_read_tokens,
            self.cache_write_tokens + other.cache_write_tokens,
            self.web_searches + other.web_searches,
        )


def usage_from_response(usage: Any) -> UsageCounts:
    """Достаёт счётчики из response.usage (поля могут отсутствовать или быть None)."""
    if usage is None:
        return UsageCounts()
    server_tools = getattr(usage, "server_tool_use", None)
    return UsageCounts(
        input_tokens=getattr(usage, "input_tokens", 0) or 0,
        output_tokens=getattr(usage, "output_tokens", 0) or 0,
        cache_read_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
        cache_write_tokens=getattr(usage, "cache_creation_input_tokens", 0) or 0,
        web_searches=(getattr(server_tools, "web_search_requests", 0) or 0) if server_tools else 0,
    )


def estimate_cost(model: str, counts: UsageCounts) -> float:
    price = PRICES.get(model, FALLBACK_PRICE)
    return (
        counts.input_tokens * price.input
        + counts.output_tokens * price.output
        + counts.cache_read_tokens * price.cache_read
        + counts.cache_write_tokens * price.cache_write
    ) / 1_000_000 + counts.web_searches * WEB_SEARCH_USD
