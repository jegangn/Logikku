"""X-Sudoku diagonal regions: both main diagonals must contain 1..N."""

from __future__ import annotations

from ..grid import Shape


def x_diagonal_regions(shape: Shape) -> list[frozenset[tuple[int, int]]]:
    """Return the two main diagonals as frozenset regions."""
    n = shape.size
    nw_se = frozenset((i, i) for i in range(n))
    ne_sw = frozenset((i, n - 1 - i) for i in range(n))
    return [nw_se, ne_sw]
