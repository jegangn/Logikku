"""Little Killer generator.

Strategy: solve a classic grid, sample a handful of outside-arrow diagonals,
compute each diagonal's sum from the solution, dig under classic uniqueness,
then let the TS grader check uniqueness + technique-only under the full
little-killer constraint.
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


# Density-gated bands all in the tier-1 SE range — little-killer diagonals
# are powerful sum constraints that resolve nearly every puzzle via tier-1.
LITTLE_KILLER_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 40),
    "medium": (1.0, 2.4, 50),
    "hard": (1.0, 2.4, 60),
    "expert": (1.0, 2.4, 70),
    "diabolical": (1.0, 2.4, 81),
}

# Diagonal count per puzzle. Each diagonal carries serious sum information.
DIAGONALS_PER_PUZZLE = 8


SIDES = ("top", "bottom", "left", "right")


def _diagonal_cells(
    side: str, index: int, direction: str, n: int
) -> list[tuple[int, int]]:
    if side == "top":
        r, c = 0, index
    elif side == "bottom":
        r, c = n - 1, index
    elif side == "left":
        r, c = index, 0
    else:
        r, c = index, n - 1
    dr = -1 if direction in ("NW", "NE") else 1
    dc = -1 if direction in ("NW", "SW") else 1
    cells: list[tuple[int, int]] = []
    while 0 <= r < n and 0 <= c < n:
        cells.append((r, c))
        r += dr
        c += dc
    return cells


def _legal_directions_for_side(side: str) -> tuple[str, ...]:
    # Arrows on each side can only point along diagonals that go INTO the
    # grid, never back out.
    if side == "top":
        return ("SE", "SW")
    if side == "bottom":
        return ("NE", "NW")
    if side == "left":
        return ("NE", "SE")
    return ("NW", "SW")


def random_little_killer_clues(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
    count: int = DIAGONALS_PER_PUZZLE,
) -> list[dict]:
    n = shape.size
    out: list[dict] = []
    seen: set[tuple[str, int, str]] = set()
    attempts = 0
    while len(out) < count and attempts < count * 6:
        attempts += 1
        side = rng.choice(SIDES)
        index = rng.randrange(n)
        direction = rng.choice(_legal_directions_for_side(side))
        key = (side, index, direction)
        if key in seen:
            continue
        cells = _diagonal_cells(side, index, direction, n)
        if len(cells) < 2:
            continue  # too short to be informative
        total = sum(solved[r][c] for r, c in cells)
        out.append(
            {
                "id": f"lk{len(out) + 1}",
                "side": side,
                "index": index,
                "direction": direction,
                "sum": total,
            }
        )
        seen.add(key)
    return out


@dataclass(frozen=True)
class LittleKillerPuzzle:
    base: GeneratedPuzzle
    clues: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["littleKillerClues"] = self.clues
        return d


def generate_little_killer(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[LittleKillerPuzzle]:
    if difficulty not in LITTLE_KILLER_DIFFICULTY_BANDS:
        raise ValueError(f"unknown little-killer band: {difficulty}")
    se_lo, se_hi, max_removals = LITTLE_KILLER_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        clues = random_little_killer_clues(rng, solved, shape)
        if len(clues) < DIAGONALS_PER_PUZZLE - 2:
            continue
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(
            puzzle_str, variant="little-killer", little_killer_clues=clues
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
                f"  [little-killer/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"little-killer-{difficulty}-{seed}-{emitted:04d}",
            variant="little-killer",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield LittleKillerPuzzle(base=base, clues=clues)
