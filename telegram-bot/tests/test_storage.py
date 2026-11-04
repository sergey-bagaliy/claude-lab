from family_bot.pricing import UsageCounts
from family_bot.storage import Storage


def test_history_keeps_last_messages_and_survives_restart(tmp_path):
    path = str(tmp_path / "family.db")
    db = Storage(path)
    for i in range(3):
        db.add_exchange(1, f"вопрос {i}", f"ответ {i}", keep=4)
    db.close()

    db = Storage(path)  # «перезапуск бота»
    assert db.history(1, limit=20) == [
        {"role": "user", "content": "вопрос 1"},
        {"role": "assistant", "content": "ответ 1"},
        {"role": "user", "content": "вопрос 2"},
        {"role": "assistant", "content": "ответ 2"},
    ]
    db.close()


def test_history_always_starts_with_user(storage):
    for i in range(3):
        storage.add_exchange(1, f"вопрос {i}", f"ответ {i}", keep=20)
    history = storage.history(1, limit=3)  # нечётный лимит
    assert history[0]["role"] == "user"
    assert history[-1]["content"] == "ответ 2"


def test_history_separate_per_chat_and_clear(storage):
    storage.add_exchange(1, "a", "b", keep=20)
    storage.add_exchange(2, "c", "d", keep=20)
    storage.clear_history(1)
    assert storage.history(1, 20) == []
    assert len(storage.history(2, 20)) == 2


def test_shopping_add_skips_duplicates_and_empty(storage):
    assert storage.add_shopping(["Молоко", "хлеб", " ", "молоко"], added_by="Сергей") == ["Молоко", "хлеб"]
    assert storage.add_shopping(["МОЛОКО", "яйца"], added_by="Вика") == ["яйца"]
    assert [i.text for i in storage.shopping()] == ["Молоко", "хлеб", "яйца"]


def test_shopping_toggle_and_clear(storage):
    storage.add_shopping(["молоко", "хлеб"], added_by="Сергей")
    milk = storage.shopping()[0]
    assert storage.toggle_bought(milk.id).bought is True
    # купленное уходит в конец списка
    assert [(i.text, i.bought) for i in storage.shopping()] == [("хлеб", False), ("молоко", True)]
    # купленное можно добавить снова
    assert storage.add_shopping(["молоко"], added_by="Вика") == ["молоко"]
    assert storage.clear_bought() == 1
    assert [i.text for i in storage.shopping()] == ["хлеб", "молоко"]
    assert storage.toggle_bought(9999) is None


def test_find_member_understands_cases(storage):
    storage.touch_user(100, "Сергей", 100, 0)
    storage.touch_user(200, "Вика", 200, 0)
    assert storage.find_member("Вика").user_id == 200
    assert storage.find_member("вике").user_id == 200
    assert storage.find_member("Вику").user_id == 200
    assert storage.find_member("Сергею").user_id == 100
    assert storage.find_member("Никита") is None
    assert storage.find_member("") is None


def test_reminders_due_and_reschedule(storage):
    first = storage.add_reminder(100, "позвонить маме", due_at=1000, created_by="Сергей", created_by_chat=100)
    second = storage.add_reminder(200, "забрать Катю", due_at=2000, created_by="Сергей", created_by_chat=100)
    assert [r.id for r in storage.due_reminders(1500)] == [first]

    storage.set_reminder_status(first, "sent")
    assert storage.due_reminders(1500) == []

    storage.reschedule(first, 3000)
    assert storage.reminder(first).status == "pending"
    # Сергей видит и свои, и созданные им для Вики; Вика — только свои
    assert [r.id for r in storage.pending_reminders_for(100)] == [second, first]
    assert [r.id for r in storage.pending_reminders_for(200)] == [second]


def test_usage_sums(storage):
    counts = UsageCounts(input_tokens=10, output_tokens=5)
    storage.add_usage("2026-11-04", "chat", "m", counts, 0.10)
    storage.add_usage("2026-11-04", "recipe", "m", counts, 0.30)
    storage.add_usage("2026-11-05", "chat", "m", counts, 0.05)
    assert storage.spent("2026-11-04").cost_usd == 0.4
    assert storage.spent("2026-11").requests == 3
    assert list(storage.spent_by_kind("2026-11-04")) == ["recipe", "chat"]


def test_recipes(storage):
    recipe_id = storage.save_recipe(1, "Плов", ["рис", "морковь"], "плов")
    saved = storage.recipe(recipe_id)
    assert saved.title == "Плов" and saved.ingredients == ["рис", "морковь"] and saved.query == "плов"
    assert storage.recipe(999) is None


def test_group_message_does_not_move_private_chat(storage):
    storage.touch_user(200, "Вика", 200, 0)
    storage.touch_user(200, "Вика", -500, 10, private_chat=False)  # написала в семейной группе
    assert storage.find_member("Вика").chat_id == 200
    storage.touch_user(300, "Бабушка", -500, 10, private_chat=False)  # знаем её только по группе
    assert storage.find_member("Бабушка").chat_id == -500


def test_settings(storage, tmp_path):
    assert storage.get_setting("model") is None
    storage.set_setting("model", "claude-sonnet-5-5")
    storage.set_setting("model", "claude-haiku-5-5")
    assert storage.get_setting("model") == "claude-haiku-5-5"
