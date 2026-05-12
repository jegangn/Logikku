"""Hyper / Windoku regions: four extra 3×3 windows at the cross-points."""

from __future__ import annotations

from ..grid import Shape

HYPER_WINDOW_ORIGINS: tuple[tuple[int, int], ...] = (
    (1, 1),
    (1, 5),
    (5, 1),
    (5, 5),
)


def hyper_regions(shape: Shape) -> list[frozenset[tuple[int, int]]]:
    """Return the four hyper windows as frozenset regions."""
    if shape.size != 9 or shape.box_rows != 3 or shape.box_cols != 3:
        raise ValueError("Hyper / Windoku is defined only for the 9x9 grid")
    regions: list[frozenset[tuple[int, int]]] = []
    for r0, c0 in HYPER_WINDOW_ORIGINS:
        regions.append(
            frozenset((r0 + dr, c0 + dc) for dr in range(3) for dc in range(3))
        )
    return regions
