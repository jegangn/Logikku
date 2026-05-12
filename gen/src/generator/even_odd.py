"""Even-Odd Sudoku generator: classic dig + per-cell parity markings.

We pick a random subset of cells, read their parity from the solved grid, and
ship that as the puzzle's `parityMask`. The grader uses both classic and the
parity constraint when checking uniqueness.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Iterator

from .classic import GeneratedPuzzle
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


EVEN_ODD_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 44),
    "medium": (2.5, 3.9, 50),
    "hard": (4.0, 5.9, 54),
    "tough": (6.0, 6.4, 56),
    "expert": (6.5, 7.9, 58),
}

# Fraction of cells to mark with parity hints, per band. More marks make the
# puzzle easier; fewer = harder. Tuned heuristically.
PARITY_FRACTION: dict[str, float] = {
    "easy": 0.40,
    "medium": 0.32,
    "hard": 0.25,
    "tough": 0.20,
    "expert": 0.15,
}


@dataclass(frozen=True)
class EvenOddPuzzle:
    base: GeneratedPuzzle
    parity_mask: str

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["parityMask"] = self.parity_mask
        return d


def _mask_from_solved(
    solved: list[list[int]],
    rng: random.Random,
    fraction: float,
    shape: Shape,
) -> str:
    n = shape.size
    coords = [(r, c) for r in range(n) for c in range(n)]
    rng.shuffle(coords)
    count = int(round(n * n * fraction))
    marked = set(coords[:count])
    out = []
    for r in range(n):
        for c in range(n):
            if (r, c) not in marked:
                out.append(".")
            else:
                out.append("E" if solved[r][c] % 2 == 0 else "O")
    return "".join(out)


def generate_even_odd(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[EvenOddPuzzle]:
    if difficulty not in EVEN_ODD_DIFFICULTY_BANDS:
        raise ValueError(f"unknown even-odd band: {difficulty}")
    se_lo, se_hi, max_removals = EVEN_ODD_DIFFICULTY_BANDS[difficulty]
    fraction = PARITY_FRACTION[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        parity_mask = _mask_from_solved(solved, rng, fraction, shape)
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(
            puzzle_str, variant="even-odd", parity_mask=parity_mask
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
                f"  [even-odd/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"even-odd-{difficulty}-{seed}-{emitted:04d}",
            variant="even-odd",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield EvenOddPuzzle(base=base, parity_mask=parity_mask)
