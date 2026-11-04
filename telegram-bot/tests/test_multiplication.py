import random

import pytest

from family_bot.multiplication import (
    Example,
    format_examples,
    make_examples,
    make_options,
    new_game,
    praise,
    question_text,
    result_text,
)


@pytest.mark.parametrize("seed", range(20))
def test_ten_unique_examples_from_table(seed):
    examples = make_examples(rng=random.Random(seed))
    assert len(examples) == 10
    assert len({tuple(sorted((e.a, e.b))) for e in examples}) == 10
    assert all(2 <= e.a <= 9 and 2 <= e.b <= 9 for e in examples)


@pytest.mark.parametrize("table", range(2, 10))
def test_examples_for_one_number(table):
    examples = make_examples(table=table, rng=random.Random(1))
    assert all(e.a == table for e in examples)
    assert sorted(e.b for e in examples) == list(range(1, 11))


def test_format_hides_answers_under_spoiler():
    text = format_examples([Example(7, 8), Example(3, 4)])
    assert "1) 7 × 8 = <tg-spoiler>56</tg-spoiler>" in text
    assert "Никита" in text


@pytest.mark.parametrize("seed", range(50))
def test_options_have_one_right_answer(seed):
    rng = random.Random(seed)
    example = Example(rng.randint(2, 9), rng.randint(1, 10))
    options = make_options(example, rng)
    assert len(options) == 4 and len(set(options)) == 4
    assert options.count(example.answer) == 1
    assert all(value > 0 for value in options)


def test_full_game():
    game = new_game(table=7, rng=random.Random(3))
    assert len(game.examples) == 10 and len(game.id) == 4
    for number in range(10):
        right = game.current.answer
        game.answer(right if number < 8 else right + 1)  # две ошибки в конце
    assert game.finished and game.score == 8 and len(game.mistakes) == 2

    summary = result_text(game, "❌ Почти!")
    assert "8 из 10" in summary and "Запомним:" in summary
    assert "Отлично" in summary


def test_question_text():
    game = new_game(rng=random.Random(1))
    text = question_text(game, "✅ Верно!")
    assert "Пример 1 из 10" in text and "✅ Верно!" in text and "вся таблица" in text


@pytest.mark.parametrize("score, word", [(10, "Идеально"), (9, "Отлично"), (6, "Хорошо"), (2, "Не сдавайся")])
def test_praise(score, word):
    assert word in praise(score, 10)
