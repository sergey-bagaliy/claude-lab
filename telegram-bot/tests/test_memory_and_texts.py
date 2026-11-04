from datetime import date

from family_bot.family import build_system_prompt, build_weekend_request, format_date, season
from family_bot.memory import ChatMemory
from family_bot.texts import split_message


def test_memory_keeps_only_last_messages():
    memory = ChatMemory(4)
    for i in range(3):
        memory.add_exchange(1, f"вопрос {i}", f"ответ {i}")
    assert memory.get(1) == [
        {"role": "user", "content": "вопрос 1"},
        {"role": "assistant", "content": "ответ 1"},
        {"role": "user", "content": "вопрос 2"},
        {"role": "assistant", "content": "ответ 2"},
    ]


def test_memory_always_starts_with_user_message():
    memory = ChatMemory(3)  # нечётный размер
    for i in range(3):
        memory.add_exchange(1, f"вопрос {i}", f"ответ {i}")
    history = memory.get(1)
    assert history[0]["role"] == "user"
    assert history[-1] == {"role": "assistant", "content": "ответ 2"}


def test_memory_is_separate_per_chat_and_can_be_cleared():
    memory = ChatMemory(10)
    memory.add_exchange(1, "a", "b")
    memory.add_exchange(2, "c", "d")
    memory.clear(1)
    assert memory.get(1) == []
    assert len(memory.get(2)) == 2


def test_memory_get_returns_copy():
    memory = ChatMemory(10)
    memory.add_exchange(1, "a", "b")
    memory.get(1).append({"role": "user", "content": "лишнее"})
    memory.get(1)[0]["content"] = "испорчено"
    assert memory.get(1) == [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}]


def test_system_prompt_knows_the_family():
    prompt = build_system_prompt(date(2026, 11, 4))
    for word in ("Сергей", "Вика", "Никита", "8 лет", "Катя", "3 года", "Краснодар"):
        assert word in prompt
    assert "4 ноября 2026, среда" in prompt
    assert "осень" in prompt


def test_weekend_request_mentions_kids_and_season():
    request = build_weekend_request(date(2026, 7, 1))
    assert "Краснодар" in request
    assert "8 и 3 года" in request
    assert "лето" in request


def test_dates_and_seasons():
    assert format_date(date(2026, 1, 1)) == "1 января 2026, четверг"
    assert [season(date(2026, m, 1)) for m in (1, 4, 7, 10, 12)] == [
        "зима",
        "весна",
        "лето",
        "осень",
        "зима",
    ]


def test_split_short_message():
    assert split_message("Привет") == ["Привет"]


def test_split_long_message_by_lines():
    text = "\n".join(f"строка {i:03d}" for i in range(100))  # ~1100 символов
    parts = split_message(text, limit=300)
    assert len(parts) > 1
    assert all(len(part) <= 300 for part in parts)
    assert "\n".join(parts) == text  # ничего не потеряли


def test_split_text_without_spaces():
    parts = split_message("я" * 1000, limit=300)
    assert [len(p) for p in parts] == [300, 300, 300, 100]
