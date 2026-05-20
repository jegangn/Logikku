"""End-to-end tests for the Node grader bridge. Skipped if bun isn't installed."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from generator.grader_bridge import BUN_PATH, GraderBridge


def _bun_available() -> bool:
    return BUN_PATH.exists() or shutil.which("bun") is not None


pytestmark = pytest.mark.skipif(not _bun_available(), reason="bun runtime not installed")


def test_grader_bridge_round_trip():
    easy = "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
    with GraderBridge() as bridge:
        result = bridge.grade(easy)
    assert result["ok"] is True
    assert result["se"] > 0
    assert result["difficulty"] in {"very-easy", "easy", "medium", "hard", "expert", "diabolical"}
    assert result["unique"] is True


def test_grader_bridge_marks_diabolical_for_inkala():
    inkala = "800000000003600000070090200050007000000045700000100030001000068008500010090000400"
    with GraderBridge() as bridge:
        result = bridge.grade(inkala)
    assert result["ok"] is True
    assert result["difficulty"] == "diabolical"
    assert result["unique"] is True


EMPTY_81 = "0" * 81


@pytest.mark.slow
def test_grade_samurai_empty_returns_unique_false():
    with GraderBridge() as g:
        result = g.grade_samurai([EMPTY_81] * 5)
    assert result.get("ok") is True
    # An empty samurai has many solutions; unique should be False.
    assert result.get("unique") is False


@pytest.mark.slow
def test_solve_samurai_empty_returns_5_strings_of_length_81():
    with GraderBridge() as g:
        givens = g.solve_samurai_empty(seed=1)
    assert isinstance(givens, list)
    assert len(givens) == 5
    for s in givens:
        assert isinstance(s, str)
        assert len(s) == 81
        assert "0" not in s


@pytest.mark.slow
def test_solve_samurai_empty_is_deterministic_per_seed():
    with GraderBridge() as g:
        a = g.solve_samurai_empty(seed=42)
        b = g.solve_samurai_empty(seed=42)
    assert a == b


@pytest.mark.slow
def test_grade_samurai_rejects_wrong_length():
    with GraderBridge() as g:
        result = g.grade_samurai([EMPTY_81, EMPTY_81])
    assert result.get("ok") is False
