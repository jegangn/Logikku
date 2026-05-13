"""Helpers for edge-constraint variants (Kropki / XV / Greater Than).

These variants place marks on edges between orthogonally-adjacent cells.
For Kropki and XV we use *strict* semantics: an unmarked edge implies that
neither mark's relation holds. This makes the marks themselves heavily
constraining and lets us dig more cells while preserving uniqueness.
"""

from __future__ import annotations

from typing import Iterator

from ..grid import Shape


def iter_edges(shape: Shape) -> Iterator[tuple[tuple[int, int], tuple[int, int]]]:
    """Yield each orthogonally-adjacent (from, to) edge once.

    For each pair we emit (from, to) with `to` to the right or below `from`.
    """
    n = shape.size
    for r in range(n):
        for c in range(n):
            if c + 1 < n:
                yield (r, c), (r, c + 1)
            if r + 1 < n:
                yield (r, c), (r + 1, c)


def kropki_mark(a: int, b: int) -> str | None:
    """Return 'white-dot' if consecutive, 'black-dot' if 1:2, else None.

    When both relations hold (1 and 2), the convention is white-dot wins
    (consecutive is the simpler relation).
    """
    if abs(a - b) == 1:
        return "white-dot"
    if a == b * 2 or b == a * 2:
        return "black-dot"
    return None


def xv_mark(a: int, b: int) -> str | None:
    if a + b == 5:
        return "v"
    if a + b == 10:
        return "x"
    return None


def gt_mark(a: int, b: int) -> str:
    """Edge from `a` toward `b`. Returns 'gt' if a > b else 'lt'."""
    return "gt" if a > b else "lt"
