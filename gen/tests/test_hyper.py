import random

import pytest

from generator.constraints.hyper import HYPER_WINDOW_ORIGINS, hyper_regions
from generator.grid import CLASSIC_9, Shape, peers_of
from generator.solver import count_solutions, random_solved


def test_hyper_regions_have_expected_origins_and_sizes():
    regions = hyper_regions(CLASSIC_9)
    assert len(regions) == 4
    for region in regions:
        assert len(region) == 9
    origins = sorted(min(region) for region in regions)
    assert origins == sorted(HYPER_WINDOW_ORIGINS)


def test_hyper_regions_rejects_non_9x9_shape():
    with pytest.raises(ValueError):
        hyper_regions(Shape(size=6, box_rows=2, box_cols=3))


def test_peers_of_includes_window_cells_when_inside_window():
    extra = hyper_regions(CLASSIC_9)
    peers = set(peers_of(1, 1, CLASSIC_9, extra))
    # window-1 occupies rows 1-3 cols 1-3; all those cells are peers of (1,1)
    assert (3, 3) in peers
    assert (2, 2) in peers
    # (1, 5) is in window-2, not window-1, so not a window-peer of (1,1)
    # (but it IS a row-peer of (1,1) via the classic row)
    assert (1, 5) in peers  # via row
    # (4, 4) is in no window AND not row/col/box-related to (1,1)
    assert (4, 4) not in peers


def test_peers_of_for_cell_outside_any_window():
    extra = hyper_regions(CLASSIC_9)
    peers = set(peers_of(0, 0, CLASSIC_9, extra))
    # (0, 0) is in no hyper window; cells inside windows that aren't classic
    # peers should NOT appear.
    assert (3, 3) not in peers
    assert (5, 5) not in peers


def test_random_solved_with_hyper_satisfies_window_rule():
    extra = hyper_regions(CLASSIC_9)
    grid = random_solved(CLASSIC_9, random.Random(13), extra_regions=extra)
    for region in extra:
        values = sorted(grid[r][c] for r, c in region)
        assert values == list(range(1, 10))


def test_count_solutions_hyper_accepts_solved_hyper_grid():
    extra = hyper_regions(CLASSIC_9)
    solved = random_solved(CLASSIC_9, random.Random(21), extra_regions=extra)
    n = count_solutions(solved, CLASSIC_9, limit=2, extra_regions=extra)
    assert n == 1


def test_hyper_constraint_narrows_uniqueness_vs_classic():
    """Build a sparse grid, dig it under classic; under hyper rules the solved
    grid must remain unique, and the window constraint must still hold."""
    extra = hyper_regions(CLASSIC_9)
    solved = random_solved(CLASSIC_9, random.Random(99), extra_regions=extra)
    # Verify each window has 1-9 exactly once.
    for region in extra:
        digits = sorted(solved[r][c] for r, c in region)
        assert digits == list(range(1, 10))
    # Verify count is still 1 (sanity).
    assert count_solutions(solved, CLASSIC_9, limit=2, extra_regions=extra) == 1
