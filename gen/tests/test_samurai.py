"""Tests for gen/src/generator/samurai.py."""

from __future__ import annotations

import itertools
import random
from unittest.mock import MagicMock

import pytest

from generator.samurai import SAMURAI_DIFFICULTY_BANDS, generate_samurai


SOLVED = "1" * 81  # placeholder; the mock bridge will fake the grade response.


def make_mock_bridge(grade_result: dict, solve_result: list[str] | None = None) -> MagicMock:
    bridge = MagicMock()
    bridge.grade_samurai.return_value = grade_result
    bridge.solve_samurai_empty.return_value = solve_result or ([SOLVED] * 5)
    return bridge


def test_bands_cover_all_seven_user_facing_labels():
    expected = {"very-easy", "easy", "medium", "hard", "tough", "expert", "diabolical"}
    assert set(SAMURAI_DIFFICULTY_BANDS.keys()) == expected


def test_generate_samurai_yields_count_records_when_grades_match():
    bridge = make_mock_bridge({
        "ok": True,
        "unique": True,
        "se": 2.0,
        "hardestTier": 1,
        "steps": 10,
        "techniqueOnly": True,
    })
    records = list(generate_samurai(count=3, difficulty="easy", seed=1, grader=bridge))
    assert len(records) == 3
    for rec in records:
        assert rec.variant == "samurai"
        assert rec.samurai_givens is not None
        assert len(rec.samurai_givens) == 5


def test_generate_samurai_skips_out_of_band_se():
    # easy band is 1.5-2.4. Return 5.0 — should never accept. Use itertools.islice
    # to bound the loop because the generator would loop forever otherwise.
    bridge = make_mock_bridge({
        "ok": True, "unique": True, "se": 5.0, "hardestTier": 4,
        "steps": 10, "techniqueOnly": True,
    })
    result = list(itertools.islice(
        generate_samurai(count=100, difficulty="easy", seed=1, grader=bridge),
        0,
    ))
    assert result == []


def test_generate_samurai_diabolical_requires_technique_only_false():
    bridge = make_mock_bridge({
        "ok": True, "unique": True, "se": 9.0, "hardestTier": 9,
        "steps": 50, "techniqueOnly": False,  # required for diabolical
    })
    records = list(generate_samurai(count=2, difficulty="diabolical", seed=1, grader=bridge))
    assert len(records) == 2


def test_generate_samurai_to_dict_writes_samuraiGivens_field():
    bridge = make_mock_bridge({
        "ok": True, "unique": True, "se": 2.0, "hardestTier": 1,
        "steps": 5, "techniqueOnly": True,
    })
    records = list(generate_samurai(count=1, difficulty="easy", seed=1, grader=bridge))
    d = records[0].to_dict()
    assert "samuraiGivens" in d
    assert isinstance(d["samuraiGivens"], list)
    assert len(d["samuraiGivens"]) == 5
    assert d["givens"] == ""
