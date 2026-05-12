"""Anti-King: no two cells a chess king's move apart share a digit.

The orthogonal king moves are redundant with classic row/col peers, so we
only need the four diagonal offsets in extra_same_offsets — classic already
forbids same-digit at orthogonal neighbours.
"""

from __future__ import annotations

KING_DIAGONAL_OFFSETS: list[tuple[int, int]] = [
    (-1, -1),
    (-1, 1),
    (1, -1),
    (1, 1),
]
