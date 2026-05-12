import random

from generator.constraints.x_diagonal import x_diagonal_regions
from generator.grid import CLASSIC_9, peers_of
from generator.solver import count_solutions, random_solved


def test_x_diagonal_regions_have_correct_cells():
    regions = x_diagonal_regions(CLASSIC_9)
    assert len(regions) == 2
    nw_se, ne_sw = regions
    assert (0, 0) in nw_se
    assert (8, 8) in nw_se
    assert (4, 4) in nw_se
    assert (0, 8) in ne_sw
    assert (8, 0) in ne_sw
    assert (4, 4) in ne_sw


def test_peers_of_includes_diagonal_when_on_diagonal():
    extra = x_diagonal_regions(CLASSIC_9)
    peers = set(peers_of(0, 0, CLASSIC_9, extra))
    assert (8, 8) in peers
    assert (4, 4) in peers
    # off-diagonal cell on row 0
    assert (0, 3) in peers
    # not on either diagonal
    assert (3, 5) not in peers


def test_peers_of_skips_diagonals_when_cell_off_diagonal():
    extra = x_diagonal_regions(CLASSIC_9)
    peers = set(peers_of(0, 1, CLASSIC_9, extra))
    # (0,1) is not on NW-SE (r != c) nor NE-SW (r+c != 8)
    assert (8, 8) not in peers
    assert (8, 0) not in peers


def test_random_solved_with_diagonals_satisfies_x_rule():
    extra = x_diagonal_regions(CLASSIC_9)
    grid = random_solved(CLASSIC_9, random.Random(7), extra_regions=extra)
    nw_se = [grid[i][i] for i in range(9)]
    ne_sw = [grid[i][8 - i] for i in range(9)]
    assert sorted(nw_se) == list(range(1, 10))
    assert sorted(ne_sw) == list(range(1, 10))


def test_count_solutions_x_diagonal_accepts_solved_x_grid():
    extra = x_diagonal_regions(CLASSIC_9)
    solved = random_solved(CLASSIC_9, random.Random(11), extra_regions=extra)
    n = count_solutions(solved, CLASSIC_9, limit=2, extra_regions=extra)
    assert n == 1


def test_random_solved_with_diagonals_satisfies_x_rule_for_each_diagonal():
    extra = x_diagonal_regions(CLASSIC_9)
    grid = random_solved(CLASSIC_9, random.Random(31), extra_regions=extra)
    for region in extra:
        digits = sorted(grid[r][c] for r, c in region)
        assert digits == list(range(1, 10))
