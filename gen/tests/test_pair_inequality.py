"""Tests for the pair-inequality plumbing in the Python solver: anti-knight,
anti-king (diagonal-only), and non-consecutive offsets/flags."""

import random

from generator.constraints.anti_king import KING_DIAGONAL_OFFSETS
from generator.constraints.anti_knight import KNIGHT_OFFSETS
from generator.grid import CLASSIC_9, orthogonal_neighbours, peers_of
from generator.solver import count_solutions, random_solved


def test_peers_of_extends_with_knight_offsets():
    peers = set(peers_of(4, 4, CLASSIC_9, extra_same_offsets=KNIGHT_OFFSETS))
    # Eight knight-move peers around (4, 4)
    expected = {(2, 3), (2, 5), (3, 2), (3, 6), (5, 2), (5, 6), (6, 3), (6, 5)}
    assert expected <= peers


def test_peers_of_extends_with_king_diagonal_offsets():
    peers = set(peers_of(4, 4, CLASSIC_9, extra_same_offsets=KING_DIAGONAL_OFFSETS))
    expected_diagonals = {(3, 3), (3, 5), (5, 3), (5, 5)}
    assert expected_diagonals <= peers


def test_orthogonal_neighbours_at_edge():
    nbrs = set(orthogonal_neighbours(0, 0, CLASSIC_9))
    assert nbrs == {(0, 1), (1, 0)}


def test_random_solved_anti_knight_satisfies_rule():
    grid = random_solved(
        CLASSIC_9, random.Random(101), extra_same_offsets=KNIGHT_OFFSETS
    )
    for r in range(9):
        for c in range(9):
            v = grid[r][c]
            for dr, dc in KNIGHT_OFFSETS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < 9 and 0 <= nc < 9:
                    assert grid[nr][nc] != v, f"knight conflict at ({r},{c})/({nr},{nc})"


def test_random_solved_anti_king_diagonals_distinct():
    grid = random_solved(
        CLASSIC_9, random.Random(202), extra_same_offsets=KING_DIAGONAL_OFFSETS
    )
    for r in range(9):
        for c in range(9):
            v = grid[r][c]
            for dr, dc in KING_DIAGONAL_OFFSETS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < 9 and 0 <= nc < 9:
                    assert grid[nr][nc] != v


def test_random_solved_non_consecutive_satisfies_rule():
    grid = random_solved(CLASSIC_9, random.Random(303), non_consecutive=True)
    for r in range(9):
        for c in range(9):
            v = grid[r][c]
            for nr, nc in orthogonal_neighbours(r, c, CLASSIC_9):
                assert abs(grid[nr][nc] - v) != 1, (
                    f"non-consecutive violation at ({r},{c})={v} / ({nr},{nc})={grid[nr][nc]}"
                )


def test_count_solutions_unique_for_solved_pair_variant_grids():
    for kwargs in [
        {"extra_same_offsets": KNIGHT_OFFSETS},
        {"extra_same_offsets": KING_DIAGONAL_OFFSETS},
        {"non_consecutive": True},
    ]:
        grid = random_solved(CLASSIC_9, random.Random(7), **kwargs)
        n = count_solutions(grid, CLASSIC_9, limit=2, **kwargs)
        assert n == 1
