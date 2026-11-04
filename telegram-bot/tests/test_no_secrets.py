"""Страховка: в файлах проекта не должно быть настоящих ключей."""

import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".venv", "venv", "__pycache__", ".pytest_cache", ".git"}

# Настоящий ключ Anthropic: sk-ant-... и дальше длинная строка.
ANTHROPIC_KEY = re.compile(r"sk-ant-[A-Za-z0-9_\-]{30,}")
# Настоящий токен Telegram: 8–10 цифр, двоеточие, 35 символов.
TELEGRAM_TOKEN = re.compile(r"\b\d{8,10}:[A-Za-z0-9_\-]{35}\b")


def project_files():
    for path in PROJECT.rglob("*"):
        if path.is_file() and not SKIP_DIRS & set(path.relative_to(PROJECT).parts):
            yield path


def test_no_real_keys_in_project_files():
    leaks = []
    for path in project_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if ANTHROPIC_KEY.search(text) or TELEGRAM_TOKEN.search(text):
            leaks.append(str(path.relative_to(PROJECT)))
    assert leaks == [], f"Похоже на настоящие ключи в файлах: {leaks}"


def test_patterns_actually_catch_keys():
    # Проверяем саму проверку на выдуманных ключах (собираем строку по частям,
    # чтобы этот файл сам не выглядел как утечка).
    assert ANTHROPIC_KEY.search("sk-ant-" + "api03-" + "x" * 40)
    assert TELEGRAM_TOKEN.search("1234567890:" + "A" * 35)
