"""Symmetric digging: remove cells from a solved grid in pairs/quads while
preserving solution uniqueness.
"""

from __future__ import annotations

import random
from typing import Literal

from .grid import ExtraRegions, Offsets, Shape
from .solver import count_solutions

Symmetry = Literal["rotational", "horizontal", "vertical", "none"]


def symmetric_pair(r: int, c: int, shape: Shape, kind: Symmetry) -> list[tuple[int, int]]:
    n = shape.size
    if kind == "rotational":
        partner = (n - 1 - r, n - 1 - c)
        return [(r, c)] if partner == (r, c) else [(r, c), partner]
    if kind == "horizontal":
        partner = (n - 1 - r, c)
        return [(r, c)] if partner == (r, c) else [(r, c), partner]
    if kind == "vertical":
        partner = (r, n - 1 - c)
        return [(r, c)] if partner == (r, c) else [(r, c), partner]
    return [(r, c)]


def dig(
    grid: list[list[int]],
    shape: Shape,
    rng: random.Random,
    symmetry: Symmetry = "rotational",
    max_removals: int | None = None,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    non_consecutive: bool = False,
) -> list[list[int]]:
    """Dig holes while preserving unique solvability. Mutates a copy of grid."""
    g = [row[:] for row in grid]
    n = shape.size
    coords = [(r, c) for r in range(n) for c in range(n)]
    rng.shuffle(coords)
    removed = 0
    cap = max_removals if max_removals is not None else n * n
    seen: set[tuple[int, int]] = set()
    for r, c in coords:
        if (r, c) in seen:
            continue
        if g[r][c] == 0:
            continue
        pair = symmetric_pair(r, c, shape, symmetry)
        if any(g[pr][pc] == 0 for pr, pc in pair):
            continue
        if any((pr, pc) in seen for pr, pc in pair):
            continue
        saved = [(pr, pc, g[pr][pc]) for pr, pc in pair]
        for pr, pc, _ in saved:
            g[pr][pc] = 0
        unique = (
            count_solutions(
                g,
                shape,
                limit=2,
                extra_regions=extra_regions,
                extra_same_offsets=extra_same_offsets,
                non_consecutive=non_consecutive,
            )
            == 1
        )
        if unique:
            removed += len(pair)
            seen.update((pr, pc) for pr, pc in pair)
            if removed >= cap:
                break
        else:
            for pr, pc, val in saved:
                g[pr][pc] = val
            seen.update((pr, pc) for pr, pc in pair)
    return g
