import pytest

from family_bot.config import (
    DEFAULT_DAILY_BUDGET_USD,
    DEFAULT_DB_PATH,
    DEFAULT_MEMORY_SIZE,
    DEFAULT_MODEL,
    ConfigError,
    load_settings,
)

KEYS = {"TELEGRAM_BOT_TOKEN": "123:abc", "ANTHROPIC_API_KEY": "sk-ant-test"}


def test_reads_keys_and_defaults():
    settings = load_settings(KEYS)
    assert settings.telegram_token == "123:abc"
    assert settings.anthropic_api_key == "sk-ant-test"
    assert settings.model == DEFAULT_MODEL == "claude-sonnet-5-5"
    assert settings.memory_size == DEFAULT_MEMORY_SIZE
    assert settings.allowed_user_ids == frozenset()
    assert settings.daily_budget_usd == DEFAULT_DAILY_BUDGET_USD == 1.0
    assert settings.db_path == DEFAULT_DB_PATH
    assert settings.web_search is True


def test_strips_spaces_around_keys():
    settings = load_settings({"TELEGRAM_BOT_TOKEN": " 123:abc\n", "ANTHROPIC_API_KEY": "  sk-ant-test "})
    assert settings.telegram_token == "123:abc"
    assert settings.anthropic_api_key == "sk-ant-test"


@pytest.mark.parametrize(
    "env, missing",
    [
        ({}, ["TELEGRAM_BOT_TOKEN", "ANTHROPIC_API_KEY"]),
        ({"TELEGRAM_BOT_TOKEN": "123:abc"}, ["ANTHROPIC_API_KEY"]),
        ({"ANTHROPIC_API_KEY": "sk-ant-test", "TELEGRAM_BOT_TOKEN": "   "}, ["TELEGRAM_BOT_TOKEN"]),
    ],
)
def test_missing_keys_give_clear_error(env, missing):
    with pytest.raises(ConfigError) as error:
        load_settings(env)
    for name in missing:
        assert name in str(error.value)


def test_keys_are_not_shown_in_repr():
    text = repr(load_settings(KEYS))
    assert "sk-ant-test" not in text
    assert "123:abc" not in text


def test_optional_settings():
    settings = load_settings(
        {
            **KEYS,
            "CLAUDE_MODEL": "claude-haiku-5-5",
            "MEMORY_SIZE": "10",
            "ALLOWED_USER_IDS": "111, 222;333,",
            "DAILY_BUDGET_USD": "2,5",
            "DB_PATH": "C:/bots/family.db",
            "WEB_SEARCH": "0",
        }
    )
    assert settings.model == "claude-haiku-5-5"
    assert settings.memory_size == 10
    assert settings.allowed_user_ids == frozenset({111, 222, 333})
    assert settings.daily_budget_usd == 2.5
    assert settings.db_path == "C:/bots/family.db"
    assert settings.web_search is False


@pytest.mark.parametrize("value", ["abc", "1", "0", "-5"])
def test_bad_memory_size(value):
    with pytest.raises(ConfigError, match="MEMORY_SIZE"):
        load_settings({**KEYS, "MEMORY_SIZE": value})


@pytest.mark.parametrize("value", ["много", "-1"])
def test_bad_budget(value):
    with pytest.raises(ConfigError, match="DAILY_BUDGET_USD"):
        load_settings({**KEYS, "DAILY_BUDGET_USD": value})


def test_bad_web_search_flag():
    with pytest.raises(ConfigError, match="WEB_SEARCH"):
        load_settings({**KEYS, "WEB_SEARCH": "может быть"})


def test_bad_user_ids():
    with pytest.raises(ConfigError, match="ALLOWED_USER_IDS"):
        load_settings({**KEYS, "ALLOWED_USER_IDS": "111,Вика"})
