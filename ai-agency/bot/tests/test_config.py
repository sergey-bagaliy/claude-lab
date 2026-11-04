from pathlib import Path

import pytest
import yaml

from admin_bot.business import ConfigError, load_business, parse_business
from admin_bot.settings import Settings, SettingsError

from .conftest import CONFIGS


@pytest.mark.parametrize("name", ["dentistry.yaml", "autoservice.yaml"])
def test_example_configs_load(name):
    biz = load_business(CONFIGS / name)
    assert biz.services, "в примере должны быть услуги"
    assert biz.schedule.timezone == "Europe/Moscow"
    assert biz.privacy_policy_url.startswith("https://")
    for service in biz.services:
        assert biz.service(service.id) is service


def test_niche_specific_settings(business, auto_business):
    assert business.schedule.capacity == 1
    assert business.booking_comment_prompt is None  # клиника не собирает жалобы (данные о здоровье)
    assert business.schedule.working_hours[6] is None  # воскресенье — выходной
    assert auto_business.schedule.capacity == 2
    assert "марку" in auto_business.booking_comment_prompt
    # Цены в примерах не выдуманы: пустые → бот говорит, что стоимость уточняет администратор.
    assert all(s.price is None for s in business.services)
    assert business.services[0].price_text == "стоимость уточняет администратор"


def _base() -> dict:
    return yaml.safe_load((CONFIGS / "dentistry.yaml").read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    ("mutate", "expected"),
    [
        (lambda d: d.pop("services"), "services"),
        (lambda d: d["schedule"]["working_hours"].update(mon="9-18"), "schedule.working_hours.mon"),
        (lambda d: d["schedule"]["working_hours"].update(funday="10:00-11:00"), "неизвестные дни"),
        (lambda d: d["schedule"]["working_hours"].update(mon="18:00-09:00"), "раньше конца"),
        (lambda d: d["services"].append(dict(d["services"][0])), "повторяется id"),
        (lambda d: d["services"][0].update(id="Консультация"), "services[0].id"),
        (lambda d: d["services"][0].update(duration_minutes="полчаса"), "duration_minutes"),
        (lambda d: d["business"].pop("phone"), "business.phone"),
        (lambda d: d["schedule"].update(timezone="Mars/Olympus"), "часовой пояс"),
        (lambda d: d["schedule"].update(days_off=["31.12.2026"]), "days_off"),
    ],
)
def test_invalid_config_has_clear_error(mutate, expected):
    data = _base()
    mutate(data)
    with pytest.raises(ConfigError) as exc:
        parse_business(data)
    assert expected in str(exc.value)


def test_missing_file(tmp_path: Path):
    with pytest.raises(ConfigError, match="не найден"):
        load_business(tmp_path / "nope.yaml")


def test_settings_require_keys_from_env():
    with pytest.raises(SettingsError, match="TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY"):
        Settings.from_env({})


def test_settings_defaults_and_parsing():
    s = Settings.from_env({"TELEGRAM_BOT_TOKEN": "t", "ANTHROPIC_API_KEY": "k", "OWNER_CHAT_ID": "-100123"})
    assert s.owner_chat_id == -100123
    assert s.model == "claude-opus-5-5"
    assert s.effort == "low"
    assert str(s.business_config) == "configs/dentistry.yaml"
    with pytest.raises(SettingsError, match="OWNER_CHAT_ID"):
        Settings.from_env({"TELEGRAM_BOT_TOKEN": "t", "ANTHROPIC_API_KEY": "k", "OWNER_CHAT_ID": "мой"})
    with pytest.raises(SettingsError, match="ANTHROPIC_EFFORT"):
        Settings.from_env({"TELEGRAM_BOT_TOKEN": "t", "ANTHROPIC_API_KEY": "k", "ANTHROPIC_EFFORT": "turbo"})
