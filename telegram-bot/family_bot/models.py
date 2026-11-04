"""Модели Claude, между которыми можно переключаться прямо в боте (⚙️ Настройки).

Цены — https://platform.claude.com/docs/en/about-claude/pricing (ноябрь 2026).
Суммы «в месяц» — примерная оценка для обычного дня: 20 вопросов и 2 рецепта.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelChoice:
    key: str  # короткое имя для кнопок
    model_id: str  # как модель называется в Claude API
    label: str
    summary: str
    about: str
    per_month: str


MODEL_CHOICES: dict[str, ModelChoice] = {
    "haiku": ModelChoice(
        key="haiku",
        model_id="claude-haiku-5-5",
        label="⚡ Haiku 5.5",
        summary="быстро и экономно",
        about="хватает для покупок, напоминаний, сказок, рецептов и обычных вопросов.",
        per_month="≈ $1,5–2 в месяц",
    ),
    "sonnet": ModelChoice(
        key="sonnet",
        model_id="claude-sonnet-5-5",
        label="🧠 Sonnet 5.5",
        summary="умнее, но дороже",
        about="лучше для сложных вопросов, советов и разбора ситуаций. Токены в 20 раз дороже.",
        per_month="≈ $8 в месяц",
    ),
}

KNOWN_MODEL_IDS = {choice.model_id for choice in MODEL_CHOICES.values()}


def choice_by_model(model_id: str) -> ModelChoice | None:
    return next((c for c in MODEL_CHOICES.values() if c.model_id == model_id), None)


def model_label(model_id: str) -> str:
    choice = choice_by_model(model_id)
    return f"{choice.label} — {choice.summary}" if choice else model_id
