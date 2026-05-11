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
