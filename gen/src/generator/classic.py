"""Classic Sudoku generator: solved grid -> symmetric dig -> grade -> emit."""

from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved

DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "very-easy": (0.0, 1.4, 36),
    "easy": (1.5, 2.4, 44),
    "medium": (2.5, 3.9, 52),
    "hard": (4.0, 5.9, 56),
    "expert": (6.0, 7.9, 60),
    "diabolical": (8.0, 99.9, 64),
}


@dataclass(frozen=True)
class GeneratedPuzzle:
    id: str
    variant: str
    size: int
    givens: str
    difficulty: str
    se: float
    hardest_tier: int
    steps: int
    generated_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "variant": self.variant,
            "size": self.size,
            "givens": self.givens,
            "difficulty": self.difficulty,
            "se": self.se,
            "hardestTier": self.hardest_tier,
            "steps": self.steps,
            "generatedAt": self.generated_at,
        }


def generate_classic(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 25,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in DIFFICULTY_BANDS:
        raise ValueError(f"unknown difficulty band: {difficulty}")
    se_lo, se_hi, max_removals = DIFFICULTY_BANDS[difficulty]
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
        result = grader.grade(puzzle_str)
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
                f"  [{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"classic-{difficulty}-{seed}-{emitted:04d}",
            variant="classic",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )


def write_bank(path: Path, puzzles: Iterator[GeneratedPuzzle]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for p in puzzles:
            f.write(json.dumps(p.to_dict(), separators=(",", ":")) + "\n")
            count += 1
    return count
