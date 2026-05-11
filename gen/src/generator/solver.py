"""Fast Python backtracker for Classic Sudoku — used for filling random grids and
for uniqueness checks during digging.

Pure stdlib. ~10ms per typical 9x9.
"""

from __future__ import annotations

import random

from .grid import Shape, initial_candidates, peers_of


def random_solved(shape: Shape, rng: random.Random) -> list[list[int]]:
    grid = [[0] * shape.size for _ in range(shape.size)]
    cands = initial_candidates(grid, shape)
    if not _backtrack_fill(grid, cands, shape, rng=rng):
        raise RuntimeError("failed to fill grid (should be impossible)")
    return grid


def count_solutions(
    grid: list[list[int]], shape: Shape, limit: int = 2
) -> int:
    g = [row[:] for row in grid]
    cands = initial_candidates(g, shape)
    return _backtrack_count(g, cands, shape, limit=limit, found=0)


def _backtrack_fill(
    grid: list[list[int]],
    cands: list[list[set[int]]],
    shape: Shape,
    rng: random.Random,
) -> bool:
    cell = _pick_cell(grid, cands, shape)
    if cell is None:
        return True
    r, c, choices = cell
    options = list(choices)
    rng.shuffle(options)
    peers = peers_of(r, c, shape)
    for d in options:
        grid[r][c] = d
        removed: list[tuple[int, int]] = []
        for pr, pc in peers:
            if d in cands[pr][pc]:
                cands[pr][pc].remove(d)
                removed.append((pr, pc))
        saved = cands[r][c]
        cands[r][c] = set()
        if _backtrack_fill(grid, cands, shape, rng):
            return True
        grid[r][c] = 0
        cands[r][c] = saved
        for pr, pc in removed:
            cands[pr][pc].add(d)
    return False


def _backtrack_count(
    grid: list[list[int]],
    cands: list[list[set[int]]],
    shape: Shape,
    limit: int,
    found: int,
) -> int:
    if found >= limit:
        return found
    cell = _pick_cell(grid, cands, shape)
    if cell is None:
        return found + 1
    r, c, choices = cell
    peers = peers_of(r, c, shape)
    for d in choices:
        grid[r][c] = d
        removed: list[tuple[int, int]] = []
        for pr, pc in peers:
            if d in cands[pr][pc]:
                cands[pr][pc].remove(d)
                removed.append((pr, pc))
        saved = cands[r][c]
        cands[r][c] = set()
        found = _backtrack_count(grid, cands, shape, limit, found)
        grid[r][c] = 0
        cands[r][c] = saved
        for pr, pc in removed:
            cands[pr][pc].add(d)
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
