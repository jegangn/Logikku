"""Anti-Knight Sudoku generator.

Pair-inequality variants (anti-knight, anti-king, non-consecutive) sit at a
sharp easy/diabolical divide under classic SE grading: the dense extra-peer
constraint either gives tier-1 a free ride, or breaks the technique solver
entirely. So we ship three banks differentiated by hole count rather than by
SE band, accepting any uniquely-solvable puzzle past the "easy" tier.
"""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .constraints.anti_knight import KNIGHT_OFFSETS
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


# (se_lo, se_hi, max_removals, require_technique_only)
# easy band still enforces tier-1 SE; hard/expert are hole-count gated and only
# require uniqueness.
ANTI_KNIGHT_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 38),
    "hard": (0.0, 99.0, 56),
    "expert": (0.0, 99.0, 64),
}
_TECHNIQUE_ONLY_BANDS: set[str] = {"easy"}


def generate_anti_knight(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in ANTI_KNIGHT_DIFFICULTY_BANDS:
        raise ValueError(f"unknown anti-knight band: {difficulty}")
    se_lo, se_hi, max_removals = ANTI_KNIGHT_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng, extra_same_offsets=KNIGHT_OFFSETS)
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
            extra_same_offsets=KNIGHT_OFFSETS,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="anti-knight")
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
                f"  [anti-knight/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"anti-knight-{difficulty}-{seed}-{emitted:04d}",
            variant="anti-knight",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
