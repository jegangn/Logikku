import random

from generator.digger import dig, symmetric_pair
from generator.grid import CLASSIC_9
from generator.solver import count_solutions, random_solved


def test_rotational_pair_partners_are_reflected_through_center():
    pair = symmetric_pair(0, 0, CLASSIC_9, "rotational")
    assert (0, 0) in pair
    assert (8, 8) in pair


def test_center_cell_has_no_partner_under_rotational():
    pair = symmetric_pair(4, 4, CLASSIC_9, "rotational")
    assert pair == [(4, 4)]


def test_dig_preserves_unique_solvability():
    rng = random.Random(123)
    solved = random_solved(CLASSIC_9, rng)
    puzzle = dig(solved, CLASSIC_9, rng, symmetry="rotational", max_removals=40)
    assert count_solutions(puzzle, CLASSIC_9, limit=2) == 1
    holes = sum(1 for r in range(9) for c in range(9) if puzzle[r][c] == 0)
    assert holes >= 20


def test_dig_is_seed_deterministic():
    rng_a = random.Random(99)
    rng_b = random.Random(99)
    solved_a = random_solved(CLASSIC_9, rng_a)
    solved_b = random_solved(CLASSIC_9, rng_b)
    assert solved_a == solved_b
    a = dig(solved_a, CLASSIC_9, rng_a, symmetry="rotational", max_removals=30)
    b = dig(solved_b, CLASSIC_9, rng_b, symmetry="rotational", max_removals=30)
    assert a == b
