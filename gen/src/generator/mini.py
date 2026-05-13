"""Mini 6x6 Sudoku generator: same as classic but on a 6x6 board with 2x3 boxes.

Phase 10 acceptance criterion: variable grid sizes work in the generator and
in the app. Mini 6x6 is the canary that catches every hardcoded 9 in the
pipeline.
"""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_6, Shape, grid_to_string
from .solver import random_solved


# Mini 6x6 SE bands. The grid is too small for most tier-2+ techniques to
# apply: 95%+ of puzzles solve via tier-1 with SE 1.0-2.4. We differentiate
# easy vs medium by puzzle density (max_removals), accept the full tier-1
# SE range for both, and reserve a wider SE range for hard.
MINI_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 14),
    "medium": (1.0, 2.4, 20),
    "hard": (2.0, 7.9, 24),
}


def generate_mini(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_6,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 25,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in MINI_DIFFICULTY_BANDS:
        raise ValueError(f"unknown mini band: {difficulty}")
    se_lo, se_hi, max_removals = MINI_DIFFICULTY_BANDS[difficulty]
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
        result = grader.grade(puzzle_str, variant="mini-6")
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
                f"  [mini-6/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"mini-6-{difficulty}-{seed}-{emitted:04d}",
            variant="mini-6",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
