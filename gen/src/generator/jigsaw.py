"""Jigsaw Sudoku generator: random polyomino partition + classic dig pipeline.

Jigsaw replaces the classic 3x3 boxes with an irregular 9-piece partition.
The solver bookkeeping pipes the polyominoes through as `extra_regions` with
`use_classic_box=False`.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Iterator

from .classic import GeneratedPuzzle
from .constraints.jigsaw import (
    partition_to_flat,
    random_polyomino_partition,
    regions_from_partition,
)
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


JIGSAW_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 38),
    "medium": (2.5, 3.9, 44),
    "hard": (4.0, 5.9, 50),
    "tough": (6.0, 6.4, 54),
    "expert": (6.5, 7.9, 56),
}

# Pure stdlib backtracker is slow on freeform polyominoes (irregular pieces
# spread across many rows/cols give the MRV heuristic poor pruning). We cap
# the swap count so pieces stay near-classic; the visual is still recognisably
# jigsaw and generation stays under ~1s/puzzle.
JIGSAW_SWAP_COUNT = 2


@dataclass(frozen=True)
class JigsawPuzzle:
    base: GeneratedPuzzle
    regions: list[list[int]]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["regions"] = self.regions
        return d


def generate_jigsaw(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[JigsawPuzzle]:
    if difficulty not in JIGSAW_DIFFICULTY_BANDS:
        raise ValueError(f"unknown jigsaw band: {difficulty}")
    se_lo, se_hi, max_removals = JIGSAW_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        partition = random_polyomino_partition(shape, rng, swap_count=JIGSAW_SWAP_COUNT)
        extra_regions = regions_from_partition(partition)
        flat_regions = partition_to_flat(partition, shape.size)
        solved = random_solved(
            shape,
            rng,
            extra_regions=extra_regions,
            use_classic_box=False,
        )
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
            extra_regions=extra_regions,
            use_classic_box=False,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(
            puzzle_str, variant="jigsaw", regions=flat_regions
        )
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
                f"  [jigsaw/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"jigsaw-{difficulty}-{seed}-{emitted:04d}",
            variant="jigsaw",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield JigsawPuzzle(base=base, regions=flat_regions)
