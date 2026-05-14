"""Sandwich generator.

Strategy: solve a classic grid. For each row and column, compute the sandwich
sum (digits strictly between 1 and 9 in that line). Place a CLUE on a random
subset of rows / columns (giving the user partial information). Dig the
puzzle, then let the TS grader verify uniqueness + technique-only.
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


SANDWICH_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 40),
    "medium": (1.0, 2.4, 50),
    "hard": (1.0, 2.4, 58),
    "expert": (1.0, 2.4, 66),
    "diabolical": (1.0, 2.4, 81),
}


# Rough coverage: how many of the 2 * size lines (rows + columns) carry clues.
# Each clue gets attributed to either the 'top' (column) or 'left' (row) side.
CLUE_LINES_PER_PUZZLE = 14  # of a possible 18 on 9×9.


def _sandwich_sum_in_line(values: list[int], n: int) -> int:
    p1 = values.index(1)
    p9 = values.index(n)
    lo, hi = min(p1, p9), max(p1, p9)
    return sum(values[lo + 1 : hi])


def random_sandwich_clues(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
    count: int = CLUE_LINES_PER_PUZZLE,
) -> list[dict]:
    n = shape.size
    lines: list[tuple[str, int]] = []
    for c in range(n):
        lines.append(("top", c))
    for r in range(n):
        lines.append(("left", r))
    rng.shuffle(lines)
    out: list[dict] = []
    for side, idx in lines[:count]:
        if side == "top":
            vals = [solved[r][idx] for r in range(n)]
        else:
            vals = list(solved[idx])
        s = _sandwich_sum_in_line(vals, n)
        out.append(
            {
                "id": f"sw{len(out) + 1}",
                "side": side,
                "index": idx,
                "sum": s,
            }
        )
    return out


@dataclass(frozen=True)
class SandwichPuzzle:
    base: GeneratedPuzzle
    clues: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["sandwichClues"] = self.clues
        return d


def generate_sandwich(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[SandwichPuzzle]:
    if difficulty not in SANDWICH_DIFFICULTY_BANDS:
        raise ValueError(f"unknown sandwich band: {difficulty}")
    se_lo, se_hi, max_removals = SANDWICH_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        clues = random_sandwich_clues(rng, solved, shape)
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="sandwich", sandwich_clues=clues)
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
                f"  [sandwich/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"sandwich-{difficulty}-{seed}-{emitted:04d}",
            variant="sandwich",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield SandwichPuzzle(base=base, clues=clues)
