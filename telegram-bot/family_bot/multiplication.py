"""Примеры на умножение для Никиты: список с ответами под спойлером и игра-тренажёр.

Примеры генерирует сам Python, без Claude: это бесплатно, мгновенно
и ответы гарантированно правильные.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field


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


# ---------- Игра-тренажёр: варианты ответов на кнопках, счёт и похвала ----------


def make_options(example: Example, rng: random.Random, count: int = 4) -> list[int]:
    """Правильный ответ + похожие неправильные (соседние значения таблицы)."""
    a, b, right = example.a, example.b, example.answer
    candidates = [
        a * (b + 1),
        a * (b - 1),
        (a + 1) * b,
        (a - 1) * b,
        right + 1,
        right - 1,
        right + 10,
        right - 10,
    ]
    wrong = [c for c in dict.fromkeys(candidates) if c > 0 and c != right]
    rng.shuffle(wrong)
    options = [right, *wrong[: count - 1]]
    rng.shuffle(options)
    return options


@dataclass
class QuizGame:
    id: str
    table: int | None
    examples: list[Example]
    options: list[list[int]]
    index: int = 0
    score: int = 0
    mistakes: list[Example] = field(default_factory=list)

    @property
    def current(self) -> Example:
        return self.examples[self.index]

    @property
    def finished(self) -> bool:
        return self.index >= len(self.examples)

    def answer(self, value: int) -> bool:
        """Принимает ответ на текущий пример и переходит к следующему."""
        example = self.current
        correct = value == example.answer
        if correct:
            self.score += 1
        else:
            self.mistakes.append(example)
        self.index += 1
        return correct


def new_game(table: int | None = None, count: int = 10, rng: random.Random | None = None) -> QuizGame:
    rng = rng or random.Random()
    examples = make_examples(count=count, table=table, rng=rng)
    return QuizGame(
        id=f"{rng.randrange(16**4):04x}",
        table=table,
        examples=examples,
        options=[make_options(e, rng) for e in examples],
    )


def praise(score: int, total: int) -> str:
    if score == total:
        return "🏆 Идеально! Все примеры верно! Никита — чемпион!"
    if score >= total * 0.8:
        return "🌟 Отлично! Почти без ошибок!"
    if score >= total * 0.5:
        return "👍 Хорошо! Ещё немного потренируемся — и будет идеально."
    return "💪 Не сдавайся! Повтори таблицу и попробуй ещё раз."


def question_text(game: QuizGame, feedback: str = "") -> str:
    title = f"на {game.table}" if game.table else "вся таблица"
    lines = [f"🧮 Тренажёр для Никиты ({title})", ""]
    if feedback:
        lines += [feedback, ""]
    example = game.current
    lines += [
        f"Пример {game.index + 1} из {len(game.examples)}:",
        f"<b>{example.a} × {example.b} = ?</b>",
        "",
        f"⭐ Верно: {game.score}",
    ]
    return "\n".join(lines)


def result_text(game: QuizGame, feedback: str = "") -> str:
    total = len(game.examples)
    lines = []
    if feedback:
        lines += [feedback, ""]
    lines += [f"Готово! Никита решил <b>{game.score} из {total}</b>", praise(game.score, total)]
    if game.mistakes:
        lines += ["", "Запомним:"] + [f"• {e.a} × {e.b} = {e.answer}" for e in game.mistakes]
    return "\n".join(lines)
