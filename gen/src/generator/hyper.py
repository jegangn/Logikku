"""Hyper / Windoku generator: classic dig pipeline + four extra 3x3 windows.

The hyper constraint adds four region constraints (each forcing 1-9 in a
3x3 window). Acceptance rates sit between Classic and X-Sudoku: more
constraint than Classic but less than the dense X-Sudoku diagonals.
"""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .constraints.hyper import hyper_regions
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


HYPER_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 40),
    "medium": (2.5, 3.9, 46),
    "hard": (4.0, 5.9, 52),
    "tough": (6.0, 6.4, 54),
    "expert": (6.5, 7.9, 58),
}


def generate_hyper(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in HYPER_DIFFICULTY_BANDS:
        raise ValueError(f"unknown hyper band: {difficulty}")
    se_lo, se_hi, max_removals = HYPER_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    extra_regions = hyper_regions(shape)

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng, extra_regions=extra_regions)
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
            extra_regions=extra_regions,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="hyper")
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
                f"  [hyper/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"hyper-{difficulty}-{seed}-{emitted:04d}",
            variant="hyper",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
