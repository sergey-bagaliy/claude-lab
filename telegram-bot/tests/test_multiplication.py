import random

import pytest

from family_bot.multiplication import Example, format_examples, make_examples


@pytest.mark.parametrize("seed", range(20))
def test_ten_unique_examples_from_table(seed):
    examples = make_examples(rng=random.Random(seed))
    assert len(examples) == 10
    pairs = {tuple(sorted((e.a, e.b))) for e in examples}
    assert len(pairs) == 10  # без повторов, «3×7» и «7×3» считаются одинаковыми
    for example in examples:
        assert 2 <= example.a <= 9
        assert 2 <= example.b <= 9


@pytest.mark.parametrize("table", range(2, 10))
def test_examples_for_one_number(table):
    examples = make_examples(table=table, rng=random.Random(1))
    assert len(examples) == 10
    assert all(e.a == table for e in examples)
    assert sorted(e.b for e in examples) == list(range(1, 11))


def test_answers_are_correct():
    assert Example(7, 8).answer == 56
    assert all(e.answer == e.a * e.b for e in make_examples())


def test_format_hides_answers_under_spoiler():
    text = format_examples([Example(7, 8), Example(3, 4)])
    assert "1) 7 × 8 = <tg-spoiler>56</tg-spoiler>" in text
    assert "2) 3 × 4 = <tg-spoiler>12</tg-spoiler>" in text
    assert "Никита" in text


def test_format_for_one_number():
    text = format_examples(make_examples(table=7), table=7)
    assert "примеров на 7" in text
    assert text.count("<tg-spoiler>") == 10
