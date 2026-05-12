import random

import pytest

from generator.constraints.jigsaw import (
    partition_to_flat,
    random_polyomino_partition,
    regions_from_partition,
)
from generator.grid import CLASSIC_9
from generator.solver import count_solutions, random_solved


def _contiguous(piece: list[tuple[int, int]]) -> bool:
    if not piece:
        return False
    cells = set(piece)
    seed = piece[0]
    visited: set[tuple[int, int]] = set()
    stack = [seed]
    while stack:
        r, c = stack.pop()
        if (r, c) in visited:
            continue
        visited.add((r, c))
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            n = (r + dr, c + dc)
            if n in cells and n not in visited:
                stack.append(n)
    return visited == cells


# Small swap_count keeps tests fast (see GOTCHAS: stdlib backtracker is slow
# on heavily-perturbed polyominoes). Phase 9 ships jigsaw constraint without
# generator banks; these tests still cover partition correctness.
TEST_SWAP_COUNT = 2


@pytest.mark.parametrize("seed", [1, 2, 3, 7, 42, 100])
def test_partition_covers_all_81_cells(seed):
    partition = random_polyomino_partition(
        CLASSIC_9, random.Random(seed), swap_count=TEST_SWAP_COUNT
    )
    flat = {(r, c) for piece in partition for r, c in piece}
    assert flat == {(r, c) for r in range(9) for c in range(9)}


@pytest.mark.parametrize("seed", [1, 2, 3, 7, 42, 100])
def test_each_piece_is_9_cells_and_contiguous(seed):
    partition = random_polyomino_partition(
        CLASSIC_9, random.Random(seed), swap_count=TEST_SWAP_COUNT
    )
    assert len(partition) == 9
    for piece in partition:
        assert len(piece) == 9
        assert _contiguous(piece), f"piece not contiguous: {piece}"


def test_partition_to_flat_indices():
    partition = [[(0, 0), (0, 1)], [(8, 7), (8, 8)]]
    assert partition_to_flat(partition, 9) == [[0, 1], [79, 80]]


def test_random_solved_with_jigsaw_satisfies_each_piece():
    partition = random_polyomino_partition(
        CLASSIC_9, random.Random(11), swap_count=TEST_SWAP_COUNT
    )
    regions = regions_from_partition(partition)
    grid = random_solved(
        CLASSIC_9,
        random.Random(13),
        extra_regions=regions,
        use_classic_box=False,
    )
    for region in regions:
        digits = sorted(grid[r][c] for r, c in region)
        assert digits == list(range(1, 10))


def test_count_solutions_jigsaw_unique_for_solved_grid():
    partition = random_polyomino_partition(
        CLASSIC_9, random.Random(21), swap_count=TEST_SWAP_COUNT
    )
    regions = regions_from_partition(partition)
    solved = random_solved(
        CLASSIC_9,
        random.Random(23),
        extra_regions=regions,
        use_classic_box=False,
    )
    n = count_solutions(
        solved,
        CLASSIC_9,
        limit=2,
        extra_regions=regions,
        use_classic_box=False,
    )
    assert n == 1
