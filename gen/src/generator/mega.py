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


# Mega 16x16 SE bands — empirically tuned from a 70-puzzle sweep.
# At N=16 every tier-1 puzzle grades to SE=2.4 because computeSE saturates
# (hardSteps/12 ratio always >= 1 at this grid size — see grader/se.ts).
# Consequence: the SE 1.0-1.4 "very-easy" band is unreachable; we ship
# 4 bands instead of 5, and the "easy" band lower bound starts at 2.0
# (any tier-1 puzzle). max_removals tuned per band based on observed
# acceptance rates. Higher bands rely on tier-2+ techniques being needed,
# which at N=16 only occurs at density >=140 holes.
MEGA_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy":   (2.0, 2.4, 100),
    "medium": (2.5, 3.9, 150),
    "hard":   (4.0, 5.9, 170),
    "expert": (6.0, 7.9, 190),
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
