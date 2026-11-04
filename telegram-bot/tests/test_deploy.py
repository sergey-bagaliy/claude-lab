"""Файлы для сервера: Docker, docker-compose, пример настроек."""

import re
import subprocess
from pathlib import Path

import pytest

from family_bot.config import load_settings

PROJECT = Path(__file__).resolve().parent.parent
yaml = pytest.importorskip("yaml")


def test_compose_restarts_and_keeps_data():
    compose = yaml.safe_load((PROJECT / "docker-compose.yml").read_text(encoding="utf-8"))
    bot = compose["services"]["bot"]
    assert bot["restart"] == "unless-stopped"  # сам поднимется после перезагрузки
    assert bot["env_file"] == ".env"  # ключи — из файла на сервере, не из образа
    assert "./data:/data" in bot["volumes"] and "./models:/models" in bot["volumes"]


def test_dockerfile_is_safe():
    dockerfile = (PROJECT / "Dockerfile").read_text(encoding="utf-8")
    assert re.search(r"^USER bot$", dockerfile, re.M)  # не root
    assert "DB_PATH=/data/family_bot.db" in dockerfile and "BACKUP_DIR=/data/backups" in dockerfile
    assert "ANTHROPIC_API_KEY" not in dockerfile and "TELEGRAM_BOT_TOKEN" not in dockerfile


def test_secrets_never_go_into_image():
    ignored = (PROJECT / ".dockerignore").read_text(encoding="utf-8").split()
    for name in (".env", "*.db", "data", "models"):
        assert name in ignored


def test_env_example_is_complete_and_has_no_secrets():
    lines = (PROJECT / ".env.example").read_text(encoding="utf-8").splitlines()
    env = dict(line.split("=", 1) for line in lines if line and not line.startswith("#"))
    for key in ("TELEGRAM_BOT_TOKEN", "ANTHROPIC_API_KEY", "ADMIN_USER_ID", "DAILY_BUDGET_USD", "VOICE"):
        assert key in env
    assert env["ANTHROPIC_API_KEY"].startswith("сюда")
    settings = load_settings(env)  # пример читается без ошибок
    assert settings.daily_budget_usd == 1 and settings.voice is True and settings.admin_user_id is None


def test_env_file_is_ignored_by_git_but_example_is_not():
    def ignored(name: str) -> bool:
        result = subprocess.run(["git", "check-ignore", "-q", name], cwd=PROJECT, capture_output=True)
        if result.returncode == 128:
            pytest.skip("это не git-репозиторий")
        return result.returncode == 0

    assert ignored(".env") and ignored("data/family_bot.db") and ignored("models/whisper")
    assert not ignored(".env.example")
