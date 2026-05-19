"""Mega 16x16 Sudoku generator: classic on a 16x16 board with 4x4 boxes.

Phase 16 acceptance criterion: variable grid sizes work all the way at
N=16. Mega is the second canary after Mini 6x6.
"""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_16, Shape, grid_to_string
from .solver import random_solved


# Mega 16x16 SE bands. The 256-cell grid is over-constrained relative to 9x9
# in the sense that singletons cascade fast — most boards solve at tier 1-2
# with SE 1.0-3.9. SE bands stay aligned with classic; max_removals are
# tuned per band. Raw scaling from 9x9 (256/81 ≈ 3.16x) gives lower bounds;
# actual targets are rounded up ~10-15 cells to compensate for the faster
# cascade and will be re-tuned empirically once generation runs land.
# tough/diabolical bands omitted: at N=16 the current technique stack is
# unlikely to encounter tier-4+ patterns frequently enough to make those
# bands ship-able.
MEGA_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "very-easy": (1.0, 1.4, 130),
    "easy":      (1.5, 2.4, 160),
    "medium":    (2.5, 3.9, 185),
    "hard":      (4.0, 5.9, 200),
    "expert":    (6.0, 7.9, 210),
}


def generate_mega(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_16,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 5,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in MEGA_DIFFICULTY_BANDS:
        raise ValueError(f"unknown mega band: {difficulty}")
    se_lo, se_hi, max_removals = MEGA_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="mega-16", size=16)
        if not result.get("ok"):
            continue
        if not result.get("techniqueOnly"):
            continue
        if not result.get("unique"):
            continue
        se = float(result["se"])
        if se < se_lo or se > se_hi:
            continue
        emitted += 1
        if emitted % progress_every == 0 or emitted == count:
            print(
                f"  [mega-16/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"mega-16-{difficulty}-{seed}-{emitted:04d}",
            variant="mega-16",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
