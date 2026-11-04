"""Примеры на умножение для Никиты.

Примеры генерирует сам Python, без Claude: это бесплатно, мгновенно
и ответы гарантированно правильные.
"""

from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class Example:
    a: int
    b: int

    @property
    def answer(self) -> int:
        return self.a * self.b


def make_examples(
    count: int = 10,
    table: int | None = None,
    rng: random.Random | None = None,
) -> list[Example]:
    """Случайные примеры без повторов.

    table=None — вся таблица умножения от 2 до 9;
    table=7 — только на 7 (7×1 … 7×10).
    """
    rng = rng or random.Random()

    if table is None:
        # Пары 2..9 × 2..9 без повторов вида «3×7» и «7×3».
        pairs = [(a, b) for a in range(2, 10) for b in range(a, 10)]
        chosen = rng.sample(pairs, k=min(count, len(pairs)))
        # Перемешиваем порядок множителей, чтобы было интереснее.
        return [Example(a, b) if rng.random() < 0.5 else Example(b, a) for a, b in chosen]

    multipliers = list(range(1, 11))
    rng.shuffle(multipliers)
    return [Example(table, b) for b in multipliers[:count]]


def format_examples(examples: list[Example], table: int | None = None) -> str:
    """Текст для Telegram в формате HTML. Ответы спрятаны под спойлер."""
    title = f"на {table}" if table else "на умножение"
    lines = [f"🧮 Никита, вот {len(examples)} примеров {title}!", ""]
    for number, example in enumerate(examples, start=1):
        lines.append(f"{number}) {example.a} × {example.b} = <tg-spoiler>{example.answer}</tg-spoiler>")
    lines += [
        "",
        "Сначала посчитай сам, потом нажми на серую полоску — там ответ. Удачи! 💪",
    ]
    return "\n".join(lines)
