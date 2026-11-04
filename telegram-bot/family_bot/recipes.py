"""Карточка рецепта.

Фото блюда показывает сам Telegram: в сообщение добавляется ссылка на страницу
рецепта, и Telegram выводит крупное превью этой страницы (обычно это фото блюда)
над текстом. Claude картинки не рисует — фото настоящее, с сайта-источника.
"""

from __future__ import annotations

from dataclasses import dataclass
from html import escape
from typing import Any

from .texts import TELEGRAM_LIMIT


@dataclass
class Recipe:
    title: str
    ingredients: list[str]
    steps: list[str]
    url: str | None = None
    minutes: int | None = None
    servings: int | None = None
    kids_tip: str = ""


def _clean_list(value: Any, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    items = [" ".join(str(v).split())[:300] for v in value if str(v).strip()]
    return items[:limit]


def _positive_int(value: Any) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if 0 < number < 10_000 else None


def parse_recipe(data: dict[str, Any], allow_url: bool) -> Recipe:
    """Проверяет данные от Claude. allow_url=False — ссылку не берём (поиска не было)."""
    title = " ".join(str(data.get("title", "")).split())[:120]
    ingredients = _clean_list(data.get("ingredients"), 40)
    steps = _clean_list(data.get("steps"), 25)
    if not title or not ingredients or not steps:
        raise ValueError("Нужны title, ingredients и steps (непустые).")

    url = str(data.get("source_url") or "").strip()
    if not allow_url or not url.startswith(("https://", "http://")) or len(url) > 500 or " " in url:
        url = ""

    return Recipe(
        title=title,
        ingredients=ingredients,
        steps=steps,
        url=url or None,
        minutes=_positive_int(data.get("cook_time_minutes")),
        servings=_positive_int(data.get("servings")),
        kids_tip=" ".join(str(data.get("kids_tip", "")).split())[:400],
    )


def render_recipe_html(recipe: Recipe) -> str:
    """Текст карточки для Telegram (HTML). Всё от Claude экранируется."""
    head = [f"🍲 <b>{escape(recipe.title)}</b>"]
    facts = []
    if recipe.minutes:
        facts.append(f"⏱ {recipe.minutes} мин")
    if recipe.servings:
        facts.append(f"🍽 {recipe.servings} порц.")
    if facts:
        head.append(" · ".join(facts))

    ingredients = ["", "<b>Продукты:</b>"] + [f"• {escape(i)}" for i in recipe.ingredients]
    tail = []
    if recipe.kids_tip:
        tail += ["", f"👧 <i>{escape(recipe.kids_tip)}</i>"]
    if recipe.url:
        tail += ["", f'🔗 <a href="{escape(recipe.url, quote=True)}">Рецепт с фото на сайте</a>']

    steps = ["", "<b>Как готовить:</b>"]
    for number, step in enumerate(recipe.steps, start=1):
        candidate = "\n".join(head + ingredients + steps + [f"{number}. {escape(step)}"] + tail)
        if len(candidate) > TELEGRAM_LIMIT - 60:
            steps.append("… остальные шаги — по ссылке." if recipe.url else "… (рецепт сокращён)")
            break
        steps.append(f"{number}. {escape(step)}")

    return "\n".join(head + ingredients + steps + tail)


def recipe_as_text(recipe: Recipe) -> str:
    """Короткая текстовая версия — сохраняется в историю разговора."""
    parts = [f"Рецепт: {recipe.title}"]
    if recipe.url:
        parts.append(f"Источник: {recipe.url}")
    parts.append("Продукты: " + "; ".join(recipe.ingredients))
    parts.append("Шаги: " + " ".join(f"{n}) {s}" for n, s in enumerate(recipe.steps, start=1)))
    return "\n".join(parts)
