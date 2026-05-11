import random

from generator.grid import CLASSIC_9, string_to_grid
from generator.solver import count_solutions, random_solved


def test_random_solved_produces_valid_filled_grid():
    rng = random.Random(42)
    grid = random_solved(CLASSIC_9, rng)
    assert all(grid[r][c] != 0 for r in range(9) for c in range(9))
    for r in range(9):
        assert sorted(grid[r]) == list(range(1, 10))
    for c in range(9):
        assert sorted(grid[r][c] for r in range(9)) == list(range(1, 10))


def test_random_solved_is_seed_deterministic():
    a = random_solved(CLASSIC_9, random.Random(7))
    b = random_solved(CLASSIC_9, random.Random(7))
    assert a == b


def test_count_solutions_recognizes_unique():
    s = "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
    grid = string_to_grid(s, CLASSIC_9)
    assert count_solutions(grid, CLASSIC_9, limit=2) == 1


def test_count_solutions_recognizes_empty_grid_as_non_unique():
    grid = [[0] * 9 for _ in range(9)]
    assert count_solutions(grid, CLASSIC_9, limit=2) == 2
