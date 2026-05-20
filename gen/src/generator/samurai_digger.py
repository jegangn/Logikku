"""Samurai digger: iteratively remove cells from a solved board, keeping the
puzzle uniquely solvable. Mirrors the engine's SAMURAI_LAYOUT (17a) for
overlap propagation.
"""

from __future__ import annotations

import random
from typing import Iterable, Literal

from .grader_bridge import GraderBridge

Symmetry = Literal["rotational", "none"]

# SAMURAI_LAYOUT mirror: each corner reports its (centerBox, cornerBox)
# 3×3 anchor positions. Box (r, c) covers cells in rows r*3..r*3+2 and
# cols c*3..c*3+2. Center idx is 0; corners are 1=NW, 2=NE, 3=SW, 4=SE.
_LAYOUT: tuple[tuple[int, tuple[int, int], tuple[int, int]], ...] = (
    (1, (0, 0), (2, 2)),  # NW: center box (0,0) ↔ NW cornerBox (2,2)
    (2, (0, 2), (2, 0)),  # NE
    (3, (2, 0), (0, 2)),  # SW
    (4, (2, 2), (0, 0)),  # SE
)


def _compute_shared_map() -> dict[tuple[int, int, int], tuple[int, int, int]]:
    """Build a bidirectional cell-to-partner map for the cruciform overlap."""
    m: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for corner_idx, (cbr, cbc), (xbr, xbc) in _LAYOUT:
        for dr in range(3):
            for dc in range(3):
                center = (0, cbr * 3 + dr, cbc * 3 + dc)
                corner = (corner_idx, xbr * 3 + dr, xbc * 3 + dc)
                m[center] = corner
                m[corner] = center
    return m


SHARED_CELL_MAP = _compute_shared_map()


def _pair_rotational(g: int, r: int, c: int) -> list[tuple[int, int, int]]:
    pr, pc = 8 - r, 8 - c
    if (r, c) == (pr, pc):
        return [(g, r, c)]
    return [(g, r, c), (g, pr, pc)]


def _expand_to_shared(cells: Iterable[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    out: list[tuple[int, int, int]] = []
    seen: set[tuple[int, int, int]] = set()
    for cell in cells:
        if cell in seen:
            continue
        seen.add(cell)
        out.append(cell)
        partner = SHARED_CELL_MAP.get(cell)
        if partner is not None and partner not in seen:
            seen.add(partner)
            out.append(partner)
    return out


def _close_dig_set(
    seed: list[tuple[int, int, int]], symmetry: Symmetry
) -> list[tuple[int, int, int]]:
    """Close seed under rotational symmetry + shared-cell propagation (fixed point)."""
    seen: set[tuple[int, int, int]] = set()
    queue = list(seed)
    out: list[tuple[int, int, int]] = []
    while queue:
        cell = queue.pop(0)
        if cell in seen:
            continue
        seen.add(cell)
        out.append(cell)
        g, r, c = cell
        if symmetry == "rotational":
            pr, pc = 8 - r, 8 - c
            rot = (g, pr, pc)
            if rot not in seen:
                queue.append(rot)
        shared = SHARED_CELL_MAP.get(cell)
        if shared is not None and shared not in seen:
            queue.append(shared)
    return out


def _cell_at(state: list[str], cell: tuple[int, int, int]) -> str:
    g, r, c = cell
    return state[g][r * 9 + c]


def _set_cell(s: str, r: int, c: int, ch: str) -> str:
    i = r * 9 + c
    return s[:i] + ch + s[i + 1 :]


def dig_samurai(
    solved: list[str],
    rng: random.Random,
    bridge: GraderBridge,
    max_removals: int,
    symmetry: Symmetry = "rotational",
    *,
    max_failed_attempts: int | None = None,
) -> list[str]:
    """Returns a new list[str] of length 5 with cells removed.

    `max_failed_attempts` (default 3 * max_removals) caps how many consecutive
    uniqueness-rejected attempts the digger tolerates before giving up. Each
    grade_samurai call is ~30-200ms; without a cap a single dig pass can hit
    the bridge ~1000+ times on a tough board, which is the dominant wall-clock
    cost. Capping bounds per-puzzle latency at the cost of leaving some safe
    removals on the table — the generator just iterates with a fresh seed.
    """
    if len(solved) != 5:
        raise ValueError(f"expected 5 solved sub-grids, got {len(solved)}")
    for i, s in enumerate(solved):
        if len(s) != 81:
            raise ValueError(f"solved[{i}] must be 81 chars, got {len(s)}")
    if max_failed_attempts is None:
        max_failed_attempts = 3 * max_removals
    state = list(solved)
    cells: list[tuple[int, int, int]] = [
        (g, r, c) for g in range(5) for r in range(9) for c in range(9)
    ]
    rng.shuffle(cells)
    removed = 0
    failed = 0
    for (g, r, c) in cells:
        if removed >= max_removals:
            break
        if failed >= max_failed_attempts:
            break
        targets = _close_dig_set([(g, r, c)], symmetry)
        if all(_cell_at(state, t) == "0" for t in targets):
            continue
        before = list(state)
        for (xg, xr, xc) in targets:
            state[xg] = _set_cell(state[xg], xr, xc, "0")
        result = bridge.grade_samurai(state)
        if not result.get("ok") or not result.get("unique"):
            state = before
            failed += 1
            continue
        removed += sum(1 for t in targets if _cell_at(before, t) != "0")
        failed = 0
    return state
