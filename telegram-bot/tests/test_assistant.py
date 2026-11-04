"""Логика общения с Claude: параметры запроса, инструменты, поиск, ошибки. API подменён."""

import asyncio

import anthropic
import pytest

from family_bot.assistant import FALLBACK_BETA, MAX_TOKENS, TRUNCATED_NOTE, AssistantError, FamilyAssistant
from family_bot.family import build_story_request
from family_bot.storage import Storage

from .conftest import (
    RECIPE_INPUT,
    SERGEY,
    VIKA,
    api_connection_error,
    api_status_error,
    citation,
    claude_message,
    claude_text,
    recipe_turn,
    search_results,
    server_search,
    text,
    thinking,
    tool_use,
)


def user_text(call, index=-1):
    return call["messages"][index]["content"]


async def test_request_parameters(assistant, fake_claude):
    await assistant.ask(100, SERGEY, "Привет!")

    [call] = fake_claude.messages.calls
    assert call["model"] == "claude-sonnet-5-5"
    assert call["max_tokens"] == MAX_TOKENS
    assert call["output_config"] == {"effort": "low"}
    assert call["cache_control"] == {"type": "ephemeral"}
    # Защита от ложных отказов: сервер сам повторит запрос на другой модели.
    assert call["betas"] == [FALLBACK_BETA]
    assert call["fallbacks"] == "default"
    assert "Никита" in call["system"] and "Краснодар" in call["system"]
    for forbidden in ("temperature", "top_p", "top_k", "tool_choice", "thinking"):
        assert forbidden not in call

    names = [t["name"] for t in call["tools"]]
    assert names == [
        "web_search",
        "add_shopping_items",
        "get_shopping_list",
        "create_reminder",
        "list_reminders",
        "show_recipe",
        "show_media",
        "show_photos",
    ]
    assert call["tools"][0]["type"] == "web_search_20260318"


async def test_context_line_with_time_and_author(assistant, fake_claude):
    await assistant.ask(100, SERGEY, "Привет!")
    content = user_text(fake_claude.messages.calls[0])
    assert content.startswith("[Сейчас 4 ноября 2026, среда, 15:00 (Краснодар)")
    assert "Пишет: Сергей" in content
    assert content.endswith("\nПривет!")


async def test_haiku_has_no_fallbacks(storage, fake_claude, clock):
    assistant = FamilyAssistant(fake_claude, storage, "claude-haiku-5-5", clock=clock)
    await assistant.ask(1, SERGEY, "Привет")
    call = fake_claude.messages.calls[0]
    assert "fallbacks" not in call and "betas" not in call


async def test_effort_depends_on_task(assistant, fake_claude):
    await assistant.ask(1, SERGEY, "сказка", kind="story")
    await assistant.ask(1, SERGEY, "рецепт", kind="recipe")
    await assistant.ask(1, SERGEY, "выходные", kind="weekend")
    assert [c["output_config"]["effort"] for c in fake_claude.messages.calls] == ["low", "medium", "medium"]


async def test_returns_only_text(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_message(thinking(), text("Добрый "), text("день!")))
    reply = await assistant.ask(1, SERGEY, "Привет")
    assert reply.text == "Добрый день!" and reply.recipe is None


async def test_dialog_memory_persists(assistant, fake_claude, storage):
    fake_claude.messages.queue += [claude_text("Приятно познакомиться!"), claude_text("Сергей")]
    await assistant.ask(1, SERGEY, "Меня зовут Сергей")
    await assistant.ask(1, SERGEY, "Как меня зовут?")

    messages = fake_claude.messages.calls[1]["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant", "user"]
    assert messages[0]["content"].endswith("Меня зовут Сергей")
    assert messages[1]["content"] == "Приятно познакомиться!"
    assert len(storage.history(1, 20)) == 4


async def test_tool_loop_adds_to_shopping_list(assistant, fake_claude, storage):
    call_tool = tool_use("add_shopping_items", {"items": ["молоко", "хлеб"]})
    fake_claude.messages.queue += [
        claude_message(thinking(), call_tool, stop_reason="tool_use"),
        claude_text("Добавил в список: молоко, хлеб"),
    ]
    reply = await assistant.ask(1, SERGEY, "Добавь молоко и хлеб")

    assert reply.text == "Добавил в список: молоко, хлеб"
    assert [i.text for i in storage.shopping()] == ["молоко", "хлеб"]

    second = fake_claude.messages.calls[1]["messages"]
    # ответ Claude вернули целиком, а результат инструмента — с тем же id
    assert second[-2]["role"] == "assistant"
    [result] = second[-1]["content"]
    assert result["type"] == "tool_result" and result["tool_use_id"] == call_tool["id"]
    assert result["is_error"] is False and "молоко, хлеб" in result["content"]
    # в историю попадает только итоговый текст
    assert storage.history(1, 20)[-1]["content"] == "Добавил в список: молоко, хлеб"


async def test_reminder_for_another_family_member(assistant, fake_claude, storage):
    storage.touch_user(VIKA.user_id, VIKA.name, VIKA.user_id, 0)
    fake_claude.messages.queue += [
        claude_message(
            tool_use(
                "create_reminder", {"text": "забрать Катю", "when": "2026-11-04 17:30", "for_whom": "Вике"}
            ),
            stop_reason="tool_use",
        ),
        claude_text("Напомню Вике сегодня в 17:30."),
    ]
    await assistant.ask(100, SERGEY, "Напомни Вике в 17:30 забрать Катю")

    [reminder] = storage.pending_reminders_for(VIKA.user_id)
    assert reminder.text == "забрать Катю" and reminder.created_by == "Сергей"
    assert "Сергей, Вика" in user_text(fake_claude.messages.calls[0])


async def test_tool_error_goes_back_to_claude(assistant, fake_claude):
    fake_claude.messages.queue += [
        claude_message(
            tool_use("create_reminder", {"text": "x", "when": "вечером", "for_whom": ""}),
            stop_reason="tool_use",
        ),
        claude_text("Во сколько именно напомнить?"),
    ]
    reply = await assistant.ask(1, SERGEY, "Напомни вечером")
    [result] = fake_claude.messages.calls[1]["messages"][-1]["content"]
    assert result["is_error"] is True
    assert reply.text == "Во сколько именно напомнить?"


async def test_recipe_card_after_search(assistant, fake_claude, storage):
    fake_claude.messages.queue.append(recipe_turn())
    reply = await assistant.ask(1, SERGEY, "Нужен рецепт: курица", kind="recipe", recipe_query="курица")

    assert len(fake_claude.messages.calls) == 1  # после карточки Claude больше не вызываем
    assert reply.recipe.title == "Курица с рисом"
    assert reply.recipe.url == RECIPE_INPUT["source_url"]
    saved = storage.recipe(reply.recipe_id)
    assert saved.query == "курица" and "рис — 1 стакан" in saved.ingredients
    assert "Курица с рисом" in storage.history(1, 20)[-1]["content"]


async def test_recipe_without_search_has_no_link(assistant, fake_claude):
    fake_claude.messages.queue.append(
        claude_message(tool_use("show_recipe", RECIPE_INPUT), stop_reason="tool_use", searches=0)
    )
    reply = await assistant.ask(1, SERGEY, "рецепт", kind="recipe")
    assert reply.recipe is not None and reply.recipe.url is None  # ссылку не выдумываем


async def test_bad_recipe_is_returned_to_claude(assistant, fake_claude):
    fake_claude.messages.queue += [
        claude_message(tool_use("show_recipe", {"title": "Суп"}), stop_reason="tool_use"),
        claude_text("Не нашёл подходящий рецепт, уточните, пожалуйста."),
    ]
    reply = await assistant.ask(1, SERGEY, "рецепт", kind="recipe")
    assert reply.recipe is None
    assert fake_claude.messages.calls[1]["messages"][-1]["content"][0]["is_error"] is True


async def test_sources_from_web_search(assistant, fake_claude):
    fake_claude.messages.queue.append(
        claude_message(
            server_search("погода"),
            text(
                "В субботу +14 и солнечно.",
                citations=[citation("https://pogoda.example/krd", "Погода Краснодар")],
            ),
            searches=1,
        )
    )
    reply = await assistant.ask(1, SERGEY, "Какая погода в субботу?")
    assert reply.sources == [("Погода Краснодар", "https://pogoda.example/krd")]
    assert reply.display_text().endswith("Источники:\n• Погода Краснодар — https://pogoda.example/krd")


async def test_pause_turn_is_continued(assistant, fake_claude):
    paused = claude_message(server_search(), stop_reason="pause_turn", searches=1)
    fake_claude.messages.queue += [paused, claude_text("Нашёл!")]
    reply = await assistant.ask(1, SERGEY, "Найди афишу")
    assert reply.text == "Нашёл!"
    second = fake_claude.messages.calls[1]["messages"]
    assert second[-1]["role"] == "assistant"  # «Продолжи» не добавляем — сервер продолжит сам


async def test_web_search_disabled_in_console(assistant, fake_claude):
    fake_claude.messages.queue += [
        api_status_error(anthropic.BadRequestError, 400, "web search is not enabled for this organization"),
        claude_text("Ответ без поиска"),
    ]
    reply = await assistant.ask(1, SERGEY, "Привет")
    assert reply.text == "Ответ без поиска"
    assert "web_search" not in [t["name"] for t in fake_claude.messages.calls[1]["tools"]]
    assert assistant.web_search is False


async def test_usage_and_cost_are_recorded(assistant, fake_claude, storage):
    fake_claude.messages.queue.append(claude_message(text("ok"), searches=2))
    await assistant.ask(1, SERGEY, "Привет")
    spent = storage.spent("2026-11-04")
    # 1000 входящих × $2 + 200 исходящих × $10 за миллион + 2 поиска × $0.01
    assert spent.requests == 1
    assert spent.cost_usd == pytest.approx(0.002 + 0.002 + 0.02)


async def test_daily_budget_stops_paid_requests(assistant, fake_claude, storage):
    assistant.daily_budget_usd = 0.01
    fake_claude.messages.queue.append(claude_message(text("ok"), searches=2))  # ≈ $0.024
    await assistant.ask(1, SERGEY, "Привет")
    with pytest.raises(AssistantError, match="лимит"):
        await assistant.ask(1, SERGEY, "Ещё вопрос")
    assert len(fake_claude.messages.calls) == 1


async def test_too_many_tool_steps(assistant, fake_claude):
    loop = [claude_message(tool_use("get_shopping_list", {}), stop_reason="tool_use") for _ in range(10)]
    fake_claude.messages.queue += loop
    with pytest.raises(AssistantError, match="слишком сложным"):
        await assistant.ask(1, SERGEY, "?")


async def test_parallel_messages_are_processed_in_order(assistant, fake_claude):
    fake_claude.messages.queue += [claude_text("ответ 1"), claude_text("ответ 2")]
    await asyncio.gather(assistant.ask(1, SERGEY, "вопрос 1"), assistant.ask(1, SERGEY, "вопрос 2"))
    second = fake_claude.messages.calls[1]["messages"]
    assert second[1]["content"] == "ответ 1" and second[2]["content"].endswith("вопрос 2")


async def test_truncated_answer_gets_note(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_text("Длинный ответ", stop_reason="max_tokens"))
    assert (await assistant.ask(1, SERGEY, "Расскажи всё")).text == "Длинный ответ" + TRUNCATED_NOTE


async def test_refusal(assistant, fake_claude, storage):
    fake_claude.messages.queue.append(
        claude_message(
            stop_reason="refusal",
            stop_details={"type": "refusal", "category": "general_harms", "explanation": None},
        )
    )
    with pytest.raises(AssistantError, match="не могу"):
        await assistant.ask(1, SERGEY, "плохой вопрос")
    assert storage.history(1, 20) == []


async def test_empty_answer(assistant, fake_claude):
    fake_claude.messages.queue.append(claude_message(thinking()))
    with pytest.raises(AssistantError, match="пустой"):
        await assistant.ask(1, SERGEY, "?")


@pytest.mark.parametrize(
    "error, expected",
    [
        (api_status_error(anthropic.AuthenticationError, 401), "ANTHROPIC_API_KEY"),
        (api_status_error(anthropic.PermissionDeniedError, 403), "не поддерживает"),
        (api_status_error(anthropic.NotFoundError, 404), "CLAUDE_MODEL"),
        (api_status_error(anthropic.RateLimitError, 429), "Подождите"),
        (
            api_status_error(
                anthropic.BadRequestError, 400, "Your credit balance is too low to access the Anthropic API."
            ),
            "баланс",
        ),
        (api_status_error(anthropic.BadRequestError, 400, "invalid request"), "Новый разговор"),
        (api_status_error(anthropic.InternalServerError, 529, "Overloaded"), "перегружен"),
        (api_connection_error(), "интернет"),
    ],
)
async def test_api_errors_become_clear_messages(assistant, fake_claude, storage, error, expected):
    await assistant.ask(1, SERGEY, "первый вопрос")
    fake_claude.messages.queue.append(error)
    with pytest.raises(AssistantError, match=expected):
        await assistant.ask(1, SERGEY, "второй вопрос")
    assert len(storage.history(1, 20)) == 2  # неудачный вопрос не попал в историю


# ---------- видео, аудио и фото мест ----------


async def test_media_card_after_search(assistant, fake_claude, storage):
    fake_claude.messages.queue.append(
        claude_message(
            server_search("мультфильмы"),
            search_results("https://www.youtube.com/watch?v=real1", "https://multiki.example/ezhik"),
            tool_use(
                "show_media",
                {
                    "kind": "video",
                    "title": "Мультфильмы для Кати",
                    "items": [
                        {"title": "Ёжик в тумане", "url": "https://youtu.be/real1"},
                        {"title": "Про ёжика", "url": "https://multiki.example/ezhik/"},
                    ],
                },
            ),
            stop_reason="tool_use",
            searches=1,
        )
    )
    reply = await assistant.ask(1, SERGEY, "мультфильмы", kind="media")
    assert len(fake_claude.messages.calls) == 1
    assert [i.title for i in reply.media.items] == ["Ёжик в тумане", "Про ёжика"]
    assert "youtu.be/real1" in storage.history(1, 20)[-1]["content"]
    assert fake_claude.messages.calls[0]["output_config"] == {"effort": "medium"}


async def test_invented_links_go_back_to_claude(assistant, fake_claude):
    bad = tool_use(
        "show_media",
        {"kind": "video", "title": "Мультики", "items": [{"title": "X", "url": "https://youtu.be/fake9"}]},
    )
    good = tool_use(
        "show_media",
        {"kind": "video", "title": "Мультики", "items": [{"title": "Y", "url": "https://youtu.be/real1"}]},
    )
    fake_claude.messages.queue += [
        claude_message(
            server_search(), search_results("https://youtu.be/real1"), bad, stop_reason="tool_use", searches=1
        ),
        claude_message(good, stop_reason="tool_use"),
    ]
    reply = await assistant.ask(1, SERGEY, "мультики", kind="media")
    [result] = fake_claude.messages.calls[1]["messages"][-1]["content"]
    assert result["is_error"] is True and "fake9" in result["content"]
    assert reply.media.items[0].url == "https://youtu.be/real1"


async def test_recipe_link_must_come_from_search(assistant, fake_claude):
    fake_claude.messages.queue.append(
        claude_message(
            server_search(),
            search_results("https://other.ru/recipe"),
            tool_use("show_recipe", RECIPE_INPUT),
            stop_reason="tool_use",
            searches=1,
        )
    )
    reply = await assistant.ask(1, SERGEY, "рецепт", kind="recipe")
    assert reply.recipe.url is None  # адреса нет среди найденных — без фото, но рецепт показан


async def test_place_photos(assistant, fake_claude, fake_photos, storage):
    fake_claude.messages.queue += [
        claude_message(
            tool_use("show_photos", {"title": "Геленджик", "search_query": "Gelendzhik embankment"}),
            tool_use("show_photos", {"title": "Анапа", "search_query": "Anapa beach"}),
            stop_reason="tool_use",
        ),
        claude_text("Геленджик — бухта и набережная, Анапа — песчаные пляжи для малышей."),
    ]
    reply = await assistant.ask(1, SERGEY, "Покажи фото Геленджика и Анапы")

    assert fake_photos.queries == ["Gelendzhik embankment", "Anapa beach"]
    assert [a.title for a in reply.albums] == ["Геленджик", "Анапа"]
    assert len(reply.albums[0].photos) == 3
    results = fake_claude.messages.calls[1]["messages"][-1]["content"]
    assert [r["is_error"] for r in results] == [False, False]
    assert "Отправлены фото: Геленджик, Анапа" in storage.history(1, 20)[-1]["content"]


async def test_place_photos_not_found(assistant, fake_claude, fake_photos):
    fake_photos.count = 0
    fake_claude.messages.queue += [
        claude_message(
            tool_use("show_photos", {"title": "Х", "search_query": "xyz"}), stop_reason="tool_use"
        ),
        claude_text("Фото не нашлось."),
    ]
    reply = await assistant.ask(1, SERGEY, "фото Х")
    assert reply.albums == []
    assert fake_claude.messages.calls[1]["messages"][-1]["content"][0]["is_error"] is True


async def test_photos_only_answer_is_ok(assistant, fake_claude):
    fake_claude.messages.queue += [
        claude_message(
            tool_use("show_photos", {"title": "Сочи", "search_query": "Sochi"}), stop_reason="tool_use"
        ),
        claude_message(thinking()),  # Claude ничего не написал — это нормально, фото уже есть
    ]
    reply = await assistant.ask(1, SERGEY, "фото Сочи")
    assert reply.text == "" and len(reply.albums) == 1


async def test_no_more_than_three_albums(assistant, fake_claude):
    calls = [tool_use("show_photos", {"title": f"Место {n}", "search_query": f"Place {n}"}) for n in range(4)]
    fake_claude.messages.queue += [claude_message(*calls, stop_reason="tool_use"), claude_text("Вот места.")]
    reply = await assistant.ask(1, SERGEY, "4 курорта с фото")
    assert len(reply.albums) == 3
    assert fake_claude.messages.calls[1]["messages"][-1]["content"][3]["is_error"] is True


async def test_photos_unavailable(storage, fake_claude, clock):
    assistant = FamilyAssistant(fake_claude, storage, "claude-haiku-5-5", clock=clock, photos=None)
    fake_claude.messages.queue += [
        claude_message(
            tool_use("show_photos", {"title": "Сочи", "search_query": "Sochi"}), stop_reason="tool_use"
        ),
        claude_text("Фото сейчас недоступны."),
    ]
    reply = await assistant.ask(1, SERGEY, "фото Сочи")
    assert reply.albums == [] and reply.text == "Фото сейчас недоступны."


# ---------- выбор модели в боте ----------


async def test_switch_model_in_app(storage, fake_claude, clock):
    assistant = FamilyAssistant(fake_claude, storage, "claude-haiku-5-5", clock=clock)
    assert assistant.model == "claude-haiku-5-5"
    await assistant.ask(1, SERGEY, "вопрос 1")

    assistant.set_model("claude-sonnet-5-5")
    await assistant.ask(1, SERGEY, "вопрос 2")

    first, second = fake_claude.messages.calls
    assert first["model"] == "claude-haiku-5-5" and "fallbacks" not in first
    assert second["model"] == "claude-sonnet-5-5" and second["fallbacks"] == "default"
    # история сохранилась — переключение не мешает разговору
    assert second["messages"][1]["content"] == "Ответ Claude"
    # расходы посчитаны по цене каждой модели
    assert {row["model"] for row in storage.db.execute("SELECT model FROM usage")} == {
        "claude-haiku-5-5",
        "claude-sonnet-5-5",
    }


async def test_model_choice_survives_restart(tmp_path, fake_claude, clock):
    path = str(tmp_path / "bot.db")
    db = Storage(path)
    FamilyAssistant(fake_claude, db, "claude-haiku-5-5", clock=clock).set_model("claude-sonnet-5-5")
    db.close()
    db = Storage(path)
    assert FamilyAssistant(fake_claude, db, "claude-haiku-5-5", clock=clock).model == "claude-sonnet-5-5"
    db.close()


def test_unknown_model_is_rejected(assistant, storage):
    with pytest.raises(ValueError):
        assistant.set_model("gpt-something")
    storage.set_setting("model", "испорчено")  # кто-то вручную испортил базу
    assert assistant.model == assistant.default_model


async def test_model_is_fixed_for_whole_answer(assistant, fake_claude):
    """Если переключить модель, пока Claude думает, этот ответ закончится на прежней."""
    fake_claude.messages.queue += [
        claude_message(tool_use("get_shopping_list", {}), stop_reason="tool_use"),
        claude_text("Список пуст."),
    ]
    original = fake_claude.messages.create

    async def create(**kwargs):
        response = await original(**kwargs)
        assistant.set_model("claude-haiku-5-5")  # переключили посреди ответа
        return response

    fake_claude.messages.create = create
    await assistant.ask(1, SERGEY, "что купить?")
    assert [c["model"] for c in fake_claude.messages.calls] == ["claude-sonnet-5-5", "claude-sonnet-5-5"]


# ---------- картинки к сказке ----------


async def test_story_with_pictures(assistant, fake_claude, fake_photos):
    fake_claude.messages.queue += [
        claude_message(
            tool_use("show_photos", {"title": "Герой сказки — ёжик", "search_query": "hedgehog", "count": 3}),
            stop_reason="tool_use",
        ),
        claude_text("Жил-был ёжик…"),
    ]
    reply = await assistant.ask(1, SERGEY, build_story_request("про зверят"), kind="story")
    assert "show_photos" in fake_claude.messages.calls[0]["messages"][-1]["content"]
    assert fake_photos.limits == [3]
    assert reply.albums[0].title == "Герой сказки — ёжик" and len(reply.albums[0].photos) == 3
    assert reply.text == "Жил-был ёжик…"


async def test_photo_count_is_limited(assistant, fake_claude, fake_photos):
    fake_claude.messages.queue += [
        claude_message(
            tool_use("show_photos", {"title": "Сочи", "search_query": "Sochi", "count": 50}),
            tool_use("show_photos", {"title": "Анапа", "search_query": "Anapa", "count": "много"}),
            stop_reason="tool_use",
        ),
        claude_text("ok"),
    ]
    await assistant.ask(1, SERGEY, "фото")
    assert fake_photos.limits == [6, 4]
