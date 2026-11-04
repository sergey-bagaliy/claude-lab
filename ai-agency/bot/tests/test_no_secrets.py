"""Проверка, что в репозиторий не попали ключи и токены."""

import re
from pathlib import Path

AGENCY_ROOT = Path(__file__).resolve().parents[2]  # папка ai-agency
BOT_ROOT = Path(__file__).resolve().parents[1]

PATTERNS = {
    "ключ Anthropic": re.compile(r"sk-ant-[A-Za-z0-9_\-]{20,}"),
    "ключ OpenAI": re.compile(r"\bsk-[A-Za-z0-9]{32,}\b"),
    "токен Telegram-бота": re.compile(r"\b\d{8,10}:[A-Za-z0-9_\-]{35}\b"),
}
SKIP_DIRS = {".git", "__pycache__", ".pytest_cache", "data", "venv", ".venv", "node_modules"}
TEXT_SUFFIXES = {".py", ".md", ".yaml", ".yml", ".txt", ".html", ".js", ".css", ".json", ".example", ".ini", ""}


def _files():
    for path in AGENCY_ROOT.rglob("*"):
        if path.is_file() and not SKIP_DIRS.intersection(path.parts) and path.suffix in TEXT_SUFFIXES:
            yield path


def test_no_secrets_in_files():
    found = []
    for path in _files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name, pattern in PATTERNS.items():
            if pattern.search(text):
                found.append(f"{path.relative_to(AGENCY_ROOT)}: {name}")
    assert not found, "Похоже на секреты в файлах: " + "; ".join(found)


def test_env_files_are_ignored_and_example_is_empty():
    gitignore = (BOT_ROOT / ".gitignore").read_text(encoding="utf-8")
    assert ".env" in gitignore and "data/" in gitignore
    for line in (BOT_ROOT / ".env.example").read_text(encoding="utf-8").splitlines():
        if line.startswith(("TELEGRAM_BOT_TOKEN=", "ANTHROPIC_API_KEY=")):
            assert line.split("=", 1)[1] == "", f"В .env.example не должно быть реальных значений: {line}"
