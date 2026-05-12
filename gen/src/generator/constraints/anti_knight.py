"""Anti-Knight: no two cells a chess knight's move apart share a digit."""

from __future__ import annotations

KNIGHT_OFFSETS: list[tuple[int, int]] = [
    (-2, -1),
    (-2, 1),
    (-1, -2),
    (-1, 2),
    (1, -2),
    (1, 2),
    (2, -1),
    (2, 1),
]
