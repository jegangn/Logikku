"""X-Sudoku generator: classic dig pipeline + both main diagonals as extra regions.

The X variant is significantly harder to dig at the same hole count as Classic,
so the per-band `max_removals` cap is tuned down. Bank sizes are kept smaller
(≥ 50 per band is acceptable per phase prompt) because X-Sudoku is rare and
generation is slower.
"""

from __future__ import annotations

import random
import time
from pathlib import Path
from typing import Iterator

from .classic import GeneratedPuzzle
from .constraints.x_diagonal import x_diagonal_regions
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


X_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 38),
    "medium": (2.5, 3.9, 46),
    "hard": (4.0, 5.9, 50),
    "tough": (6.0, 6.4, 54),
    "expert": (6.5, 7.9, 56),
}


def generate_x_diagonal(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in X_DIFFICULTY_BANDS:
        raise ValueError(f"unknown x-diagonal band: {difficulty}")
    se_lo, se_hi, max_removals = X_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    extra_regions = x_diagonal_regions(shape)

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
        result = grader.grade(puzzle_str, variant="x-diagonal")
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
                f"  [x-diagonal/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"x-diagonal-{difficulty}-{seed}-{emitted:04d}",
            variant="x-diagonal",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )


def out_paths_for_x_diagonal(out_dir: Path) -> dict[str, Path]:
    return {band: out_dir / f"{band}.jsonl" for band in X_DIFFICULTY_BANDS}
