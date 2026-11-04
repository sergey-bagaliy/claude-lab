"""Цены, время, тексты, системный промпт, карточка рецепта."""

from datetime import date, datetime
from types import SimpleNamespace

import pytest

from family_bot.family import build_context, build_story_request, build_system_prompt, build_weekend_request
from family_bot.pricing import UsageCounts, estimate_cost, usage_from_response
from family_bot.recipes import parse_recipe, recipe_as_text, render_recipe_html
from family_bot.texts import split_message
from family_bot.timeutil import TZ, format_date, format_when, parse_local, season

from .conftest import RECIPE_INPUT

# ---------- цены ----------


def test_sonnet_cost():
    counts = UsageCounts(input_tokens=1_000_000, output_tokens=1_000_000)
    assert estimate_cost("claude-sonnet-5-5", counts) == pytest.approx(12.0)  # $2 + $10


def test_cache_and_search_cost():
    counts = UsageCounts(cache_read_tokens=1_000_000, cache_write_tokens=1_000_000, web_searches=3)
    assert estimate_cost("claude-sonnet-5-5", counts) == pytest.approx(0.10 + 2.50 + 0.03)


def test_haiku_is_twenty_times_cheaper():
    counts = UsageCounts(input_tokens=5000, output_tokens=700)
    assert estimate_cost("claude-sonnet-5-5", counts) == pytest.approx(
        estimate_cost("claude-haiku-5-5", counts) * 20
    )


def test_usage_from_response_handles_missing_fields():
    assert usage_from_response(None) == UsageCounts()
    usage = SimpleNamespace(input_tokens=5, output_tokens=None, server_tool_use=None)
    assert usage_from_response(usage) == UsageCounts(input_tokens=5)


# ---------- время ----------


def test_dates_and_seasons():
    assert format_date(date(2026, 1, 1)) == "1 января 2026, четверг"
    assert [season(date(2026, m, 1)) for m in (1, 4, 7, 10, 12)] == ["зима", "весна", "лето", "осень", "зима"]


def test_format_when():
    now = datetime(2026, 11, 4, 15, 0, tzinfo=TZ)
    assert format_when(parse_local("2026-11-04 17:30"), now) == "сегодня в 17:30"
    assert format_when(parse_local("2026-11-05 09:00"), now) == "завтра в 09:00"
    assert format_when(parse_local("2026-11-06 09:00"), now) == "послезавтра в 09:00"
    assert format_when(parse_local("2026-12-31 23:59"), now) == "31 декабря в 23:59"


@pytest.mark.parametrize("bad", ["завтра", "2026-11-05", "05.11.2026 17:30", ""])
def test_parse_local_rejects_bad_format(bad):
    with pytest.raises(ValueError):
        parse_local(bad)


# ---------- промпты ----------


def test_system_prompt_knows_family_and_has_no_date():
    prompt = build_system_prompt()
    for word in (
        "Сергей",
        "Вика",
        "Никита",
        "8 лет",
        "Катя",
        "3 года",
        "Краснодар",
        "show_recipe",
        "create_reminder",
    ):
        assert word in prompt
    assert "2026" not in prompt  # дата — в отдельной строке, чтобы промпт кэшировался


def test_context_line():
    line = build_context(datetime(2026, 11, 4, 15, 7, tzinfo=TZ), "Вика", ["Сергей", "Вика"])
    assert "4 ноября 2026, среда, 15:07" in line
    assert "Пишет: Вика" in line
    assert "Сергей, Вика" in line
    assert "осень" in line


def test_weekend_and_story_requests():
    assert "погоды" in build_weekend_request("any")
    assert "Только поездки" in build_weekend_request("trip")
    assert "Катя" in build_story_request("про космос")


# ---------- карточка рецепта ----------


def test_recipe_card():
    recipe = parse_recipe(RECIPE_INPUT, allow_url=True)
    html = render_recipe_html(recipe)
    assert "🍲 <b>Курица с рисом</b>" in html
    assert "⏱ 40 мин · 🍽 4 порц." in html
    assert "• курица — 600 г" in html
    assert "3. Добавить рис и воду" in html
    assert 'href="https://example.ru/recipe/kurica-s-risom"' in html
    assert "Кате — без перца" in html


def test_recipe_url_dropped_without_search():
    assert parse_recipe(RECIPE_INPUT, allow_url=False).url is None
    assert parse_recipe({**RECIPE_INPUT, "source_url": "javascript:alert(1)"}, allow_url=True).url is None


def test_recipe_html_is_escaped():
    recipe = parse_recipe({**RECIPE_INPUT, "title": "<script>Торт</script>", "steps": ["a < b & c"]}, True)
    html = render_recipe_html(recipe)
    assert "<script>" not in html
    assert "&lt;script&gt;Торт" in html and "a &lt; b &amp; c" in html


def test_recipe_requires_main_fields():
    with pytest.raises(ValueError):
        parse_recipe({**RECIPE_INPUT, "steps": []}, allow_url=True)
    with pytest.raises(ValueError):
        parse_recipe({"title": "Суп"}, allow_url=True)


def test_long_recipe_fits_telegram_limit():
    recipe = parse_recipe({**RECIPE_INPUT, "steps": ["очень длинный шаг " * 15] * 25}, allow_url=True)
    html = render_recipe_html(recipe)
    assert len(html) <= 4096
    assert "остальные шаги — по ссылке" in html


def test_recipe_as_text_for_memory():
    memory = recipe_as_text(parse_recipe(RECIPE_INPUT, allow_url=True))
    assert "Курица с рисом" in memory and "рис — 1 стакан" in memory and "example.ru" in memory


# ---------- разбивка длинных сообщений ----------


def test_split_message():
    assert split_message("Привет") == ["Привет"]
    text = "\n".join(f"строка {i:03d}" for i in range(100))
    parts = split_message(text, limit=300)
    assert len(parts) > 1 and all(len(p) <= 300 for p in parts)
    assert "\n".join(parts) == text
    assert [len(p) for p in split_message("я" * 1000, limit=300)] == [300, 300, 300, 100]
