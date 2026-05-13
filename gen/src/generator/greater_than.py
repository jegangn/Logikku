"""Greater Than Sudoku generator.

We place an arrow on EVERY orthogonal edge — every adjacent pair has a strict
inequality. This is the standard "Futoshiki-on-Sudoku" formulation and means
no edges are absent, so there's no strict-absence concept to worry about.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Iterator

from .classic import GeneratedPuzzle
from .constraints.edge_helpers import gt_mark, iter_edges
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


GT_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 60),
    "medium": (2.5, 3.9, 64),
    "hard": (4.0, 5.9, 68),
    "tough": (6.0, 6.4, 72),
    "expert": (6.5, 7.9, 72),
}


@dataclass(frozen=True)
class GreaterThanPuzzle:
    base: GeneratedPuzzle
    edges: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["edges"] = self.edges
        return d


def edges_from_solved(grid: list[list[int]], shape: Shape) -> list[dict]:
    out: list[dict] = []
    for a, b in iter_edges(shape):
        out.append(
            {
                "from": {"r": a[0], "c": a[1]},
                "to": {"r": b[0], "c": b[1]},
                "kind": gt_mark(grid[a[0]][a[1]], grid[b[0]][b[1]]),
            }
        )
    return out


def generate_greater_than(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[GreaterThanPuzzle]:
    if difficulty not in GT_DIFFICULTY_BANDS:
        raise ValueError(f"unknown greater-than band: {difficulty}")
    se_lo, se_hi, max_removals = GT_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        edges = edges_from_solved(solved, shape)
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="greater-than", edges=edges)
        if not result.get("ok"):
            continue
        if not result.get("unique"):
            continue
        if not result.get("techniqueOnly"):
            continue
        se = float(result["se"])
        if se < se_lo or se > se_hi:
            continue
        emitted += 1
        if emitted % progress_every == 0 or emitted == count:
            print(
                f"  [greater-than/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"greater-than-{difficulty}-{seed}-{emitted:04d}",
            variant="greater-than",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield GreaterThanPuzzle(base=base, edges=edges)
