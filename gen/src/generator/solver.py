"""Fast Python backtracker for Classic Sudoku — used for filling random grids and
for uniqueness checks during digging. Variant-aware via `extra_regions`,
`extra_same_offsets`, and `non_consecutive`.

Pure stdlib. ~10ms per typical 9x9.
"""

from __future__ import annotations

import random

from .grid import (
    ExtraRegions,
    Offsets,
    Shape,
    initial_candidates,
    orthogonal_neighbours,
    peers_of,
)


def random_solved(
    shape: Shape,
    rng: random.Random,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    non_consecutive: bool = False,
) -> list[list[int]]:
    grid = [[0] * shape.size for _ in range(shape.size)]
    cands = initial_candidates(
        grid, shape, extra_regions, extra_same_offsets, non_consecutive
    )
    if not _backtrack_fill(
        grid,
        cands,
        shape,
        rng=rng,
        extra_regions=extra_regions,
        extra_same_offsets=extra_same_offsets,
        non_consecutive=non_consecutive,
    ):
        raise RuntimeError("failed to fill grid (should be impossible)")
    return grid


def count_solutions(
    grid: list[list[int]],
    shape: Shape,
    limit: int = 2,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    non_consecutive: bool = False,
) -> int:
    g = [row[:] for row in grid]
    cands = initial_candidates(
        g, shape, extra_regions, extra_same_offsets, non_consecutive
    )
    return _backtrack_count(
        g,
        cands,
        shape,
        limit=limit,
        found=0,
        extra_regions=extra_regions,
        extra_same_offsets=extra_same_offsets,
        non_consecutive=non_consecutive,
    )


def _apply_placement(
    cands: list[list[set[int]]],
    r: int,
    c: int,
    d: int,
    peers: list[tuple[int, int]],
    shape: Shape,
    non_consecutive: bool,
) -> list[tuple[int, int, int]]:
    """Remove d from peer candidates; under non-consecutive also remove d±1
    from orthogonal neighbours. Returns the (pr, pc, digit) tuples removed so
    the caller can restore on backtrack."""
    removed: list[tuple[int, int, int]] = []
    for pr, pc in peers:
        if d in cands[pr][pc]:
            cands[pr][pc].remove(d)
            removed.append((pr, pc, d))
    if non_consecutive:
        for nr, nc in orthogonal_neighbours(r, c, shape):
            for nd in (d - 1, d + 1):
                if 1 <= nd <= shape.size and nd in cands[nr][nc]:
                    cands[nr][nc].remove(nd)
                    removed.append((nr, nc, nd))
    return removed


def _restore_removed(
    cands: list[list[set[int]]],
    removed: list[tuple[int, int, int]],
) -> None:
    for pr, pc, dd in removed:
        cands[pr][pc].add(dd)


def _backtrack_fill(
    grid: list[list[int]],
    cands: list[list[set[int]]],
    shape: Shape,
    rng: random.Random,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    non_consecutive: bool = False,
) -> bool:
    cell = _pick_cell(grid, cands, shape)
    if cell is None:
        return True
    r, c, choices = cell
    options = list(choices)
    rng.shuffle(options)
    peers = peers_of(r, c, shape, extra_regions, extra_same_offsets)
    for d in options:
        grid[r][c] = d
        removed = _apply_placement(cands, r, c, d, peers, shape, non_consecutive)
        saved = cands[r][c]
        cands[r][c] = set()
        if _backtrack_fill(
            grid,
            cands,
            shape,
            rng,
            extra_regions,
            extra_same_offsets,
            non_consecutive,
        ):
            return True
        grid[r][c] = 0
        cands[r][c] = saved
        _restore_removed(cands, removed)
    return False


def _backtrack_count(
    grid: list[list[int]],
    cands: list[list[set[int]]],
    shape: Shape,
    limit: int,
    found: int,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    non_consecutive: bool = False,
) -> int:
    if found >= limit:
        return found
    cell = _pick_cell(grid, cands, shape)
    if cell is None:
        return found + 1
    r, c, choices = cell
    peers = peers_of(r, c, shape, extra_regions, extra_same_offsets)
    for d in choices:
        grid[r][c] = d
        removed = _apply_placement(cands, r, c, d, peers, shape, non_consecutive)
        saved = cands[r][c]
        cands[r][c] = set()
        found = _backtrack_count(
            grid,
            cands,
            shape,
            limit,
            found,
            extra_regions,
            extra_same_offsets,
            non_consecutive,
        )
        grid[r][c] = 0
        cands[r][c] = saved
        _restore_removed(cands, removed)
        if found >= limit:
            return found
    return found


def _pick_cell(
    grid: list[list[int]], cands: list[list[set[int]]], shape: Shape
) -> tuple[int, int, set[int]] | None:
    best: tuple[int, int, set[int]] | None = None
    best_size = shape.size + 1
    for r in range(shape.size):
        for c in range(shape.size):
            if grid[r][c] != 0:
                continue
            choices = cands[r][c]
            if not choices:
                return r, c, choices
            if len(choices) < best_size:
                best = (r, c, choices)
                best_size = len(choices)
                if best_size == 1:
                    return best
    return best
