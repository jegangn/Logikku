"""Non-Consecutive Sudoku generator. See anti_knight.py for the
hole-count-vs-SE-band rationale used for hard/expert here."""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


NON_CONSECUTIVE_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 40),
    "hard": (0.0, 99.0, 56),
    "expert": (0.0, 99.0, 62),
}
_TECHNIQUE_ONLY_BANDS: set[str] = {"easy"}


def generate_non_consecutive(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in NON_CONSECUTIVE_DIFFICULTY_BANDS:
        raise ValueError(f"unknown non-consecutive band: {difficulty}")
    se_lo, se_hi, max_removals = NON_CONSECUTIVE_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng, non_consecutive=True)
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
            non_consecutive=True,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="non-consecutive")
        if not result.get("ok"):
            continue
        if not result.get("unique"):
            continue
        if difficulty in _TECHNIQUE_ONLY_BANDS:
            if not result.get("techniqueOnly"):
                continue
            se = float(result["se"])
            if se < se_lo or se > se_hi:
                continue
        se = float(result["se"])
        emitted += 1
        if emitted % progress_every == 0 or emitted == count:
            print(
                f"  [non-consecutive/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"non-consecutive-{difficulty}-{seed}-{emitted:04d}",
            variant="non-consecutive",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
