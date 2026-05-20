"""Tests for the samurai digger module."""

from __future__ import annotations

import random
from unittest.mock import MagicMock

import pytest

from generator.samurai_digger import (
    SHARED_CELL_MAP,
    _expand_to_shared,
    _pair_rotational,
    dig_samurai,
)

SOLVED = "1" * 81  # placeholder; doesn't matter for digger tests with mock bridge.


def test_pair_rotational_returns_symmetric_partner():
    pairs = _pair_rotational(0, 1, 2)
    assert (0, 1, 2) in pairs
    assert (0, 7, 6) in pairs
    assert len(pairs) == 2


def test_pair_rotational_self_pair_at_center():
    pairs = _pair_rotational(0, 4, 4)
    assert pairs == [(0, 4, 4)]


def test_expand_to_shared_adds_partners_for_shared_cells():
    # Center (0,0) is in box (0,0), shared with NW cornerBox (2,2) → NW (6,6).
    result = _expand_to_shared([(0, 0, 0)])
    assert (0, 0, 0) in result
    assert (1, 6, 6) in result


def test_expand_to_shared_no_op_for_non_shared_cells():
    # Center (4,4) is in middle box (1,1), not shared with any corner.
    result = _expand_to_shared([(0, 4, 4)])
    assert result == [(0, 4, 4)]


def test_shared_cell_map_has_9_pairs_per_corner():
    # 4 corners × 9 shared cells each × 2 directions = 72 entries.
    assert len(SHARED_CELL_MAP) == 4 * 9 * 2


def test_dig_samurai_removes_cells_when_bridge_says_unique():
    bridge = MagicMock()
    bridge.grade_samurai.return_value = {"ok": True, "unique": True}
    rng = random.Random(1)
    result = dig_samurai([SOLVED] * 5, rng, bridge, max_removals=20)
    total_empty = sum(s.count("0") for s in result)
    assert total_empty >= 20
    assert total_empty <= 30  # symmetry + shared-cell expansion may overshoot.


def test_dig_samurai_no_removal_when_bridge_says_not_unique():
    bridge = MagicMock()
    bridge.grade_samurai.return_value = {"ok": True, "unique": False}
    rng = random.Random(1)
    result = dig_samurai([SOLVED] * 5, rng, bridge, max_removals=20)
    total_empty = sum(s.count("0") for s in result)
    assert total_empty == 0


def test_dig_samurai_rotational_symmetry_preserved():
    bridge = MagicMock()
    bridge.grade_samurai.return_value = {"ok": True, "unique": True}
    rng = random.Random(1)
    result = dig_samurai([SOLVED] * 5, rng, bridge, max_removals=8, symmetry="rotational")
    for g in range(5):
        for r in range(9):
            for c in range(9):
                if result[g][r * 9 + c] == "0":
                    # The rotational partner must also be empty (unless it's
                    # the same cell, i.e. (4,4)).
                    pr, pc = 8 - r, 8 - c
                    if (r, c) != (pr, pc):
                        assert result[g][pr * 9 + pc] == "0", (
                            f"asymmetric dig at g={g}, r={r}, c={c}"
                        )
