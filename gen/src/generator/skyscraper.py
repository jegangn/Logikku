"""Skyscraper generator.

Strategy: solve a classic grid. For a random subset of (side, row/col)
positions, compute the visibility count from that side and place a clue.
Dig the puzzle, then let the TS grader verify uniqueness + technique-only.
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


SKYSCRAPER_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 40),
    "medium": (1.0, 2.4, 50),
    "hard": (1.0, 2.4, 58),
    "expert": (1.0, 2.4, 66),
    "diabolical": (1.0, 2.4, 81),
}


CLUES_PER_PUZZLE = 16  # of a possible 4 * 9 = 36 on 9×9.


def _count_visible(values: list[int]) -> int:
    max_so_far = 0
    n = 0
    for v in values:
        if v > max_so_far:
            max_so_far = v
            n += 1
    return n


def _line_for_side(
    solved: list[list[int]], side: str, index: int, n: int
) -> list[int]:
    if side == "top":
        return [solved[r][index] for r in range(n)]
    if side == "bottom":
        return [solved[r][index] for r in range(n - 1, -1, -1)]
    if side == "left":
        return list(solved[index])
    return list(reversed(solved[index]))


def random_skyscraper_clues(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
    count: int = CLUES_PER_PUZZLE,
) -> list[dict]:
    n = shape.size
    positions: list[tuple[str, int]] = []
    for side in ("top", "bottom", "left", "right"):
        for idx in range(n):
            positions.append((side, idx))
    rng.shuffle(positions)
    out: list[dict] = []
    for side, idx in positions[:count]:
        vals = _line_for_side(solved, side, idx, n)
        c = _count_visible(vals)
        out.append(
            {
                "id": f"sk{len(out) + 1}",
                "side": side,
                "index": idx,
                "count": c,
            }
        )
    return out


@dataclass(frozen=True)
class SkyscraperPuzzle:
    base: GeneratedPuzzle
    clues: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["skyscraperClues"] = self.clues
        return d


def generate_skyscraper(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[SkyscraperPuzzle]:
    if difficulty not in SKYSCRAPER_DIFFICULTY_BANDS:
        raise ValueError(f"unknown skyscraper band: {difficulty}")
    se_lo, se_hi, max_removals = SKYSCRAPER_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        clues = random_skyscraper_clues(rng, solved, shape)
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(
            puzzle_str, variant="skyscraper", skyscraper_clues=clues
        )
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
                f"  [skyscraper/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"skyscraper-{difficulty}-{seed}-{emitted:04d}",
            variant="skyscraper",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield SkyscraperPuzzle(base=base, clues=clues)
