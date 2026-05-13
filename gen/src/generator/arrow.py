"""Arrow Sudoku generator.

Strategy: solve a classic grid, then sample arrow shapes (head + tail) where
the sum equation already holds in the solution. The dig + TS-grader pipeline
checks uniqueness; the Python solver doesn't need arrow-awareness because the
final `result["unique"]` check goes through the TS grader's `backtrackingSolve`
which respects all constraints.

Multi-digit heads: 1- or 2-cell heads supported. Two-cell head H = [h0, h1]
means head_value = 10*v[h0] + v[h1], so v[h0] is the tens digit.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Iterator

from .classic import GeneratedPuzzle
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string, orthogonal_neighbours
from .solver import random_solved


ARROW_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 40),
    "medium": (1.0, 2.4, 50),
    "hard": (1.0, 7.9, 58),
}

# Arrow count per puzzle. Each arrow further constrains the grid so even at
# easy band, ~5 arrows make for a pleasing puzzle.
ARROWS_PER_PUZZLE = 5
ARROW_TAIL_MIN = 2
ARROW_TAIL_MAX = 5


@dataclass(frozen=True)
class ArrowPuzzle:
    base: GeneratedPuzzle
    arrows: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["arrows"] = self.arrows
        return d


def _random_walk(
    rng: random.Random,
    shape: Shape,
    used: set[tuple[int, int]],
    target_len: int,
) -> list[tuple[int, int]] | None:
    """Random orthogonal walk of `target_len` cells avoiding `used`."""
    n = shape.size
    for _ in range(20):
        sr = rng.randrange(n)
        sc = rng.randrange(n)
        if (sr, sc) in used:
            continue
        path: list[tuple[int, int]] = [(sr, sc)]
        local = {(sr, sc)}
        while len(path) < target_len:
            r, c = path[-1]
            cands = [
                (nr, nc)
                for nr, nc in orthogonal_neighbours(r, c, shape)
                if (nr, nc) not in used and (nr, nc) not in local
            ]
            if not cands:
                break
            nr, nc = rng.choice(cands)
            path.append((nr, nc))
            local.add((nr, nc))
        if len(path) == target_len:
            return path
    return None


def _try_make_arrow(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
    used: set[tuple[int, int]],
) -> dict | None:
    """Pick a random arrow shape whose sum equation holds in `solved`."""
    tail_len = rng.randint(ARROW_TAIL_MIN, ARROW_TAIL_MAX)
    # Decide single vs double head: tail sums up to tail_len*9 = 18..45 for
    # length 2..5, so double-digit head is needed when sum ≥ 10.
    # We just walk paths and check both possibilities.
    for _ in range(50):
        # Try single head: walk path of length 1 + tail_len.
        path = _random_walk(rng, shape, used, 1 + tail_len)
        if path is not None:
            head = [path[0]]
            tail = path[1:]
            head_val = solved[head[0][0]][head[0][1]]
            tail_sum = sum(solved[r][c] for r, c in tail)
            if head_val == tail_sum:
                return {
                    "id": "",
                    "head": [{"r": r, "c": c} for r, c in head],
                    "tail": [{"r": r, "c": c} for r, c in tail],
                }
        # Try double head: walk path of length 2 + tail_len.
        path = _random_walk(rng, shape, used, 2 + tail_len)
        if path is not None:
            head = [path[0], path[1]]
            tail = path[2:]
            tens = solved[head[0][0]][head[0][1]]
            ones = solved[head[1][0]][head[1][1]]
            head_val = 10 * tens + ones
            tail_sum = sum(solved[r][c] for r, c in tail)
            if head_val == tail_sum:
                return {
                    "id": "",
                    "head": [{"r": r, "c": c} for r, c in head],
                    "tail": [{"r": r, "c": c} for r, c in tail],
                }
    return None


def random_arrows(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
    count: int = ARROWS_PER_PUZZLE,
) -> list[dict]:
    used: set[tuple[int, int]] = set()
    out: list[dict] = []
    attempts = 0
    while len(out) < count and attempts < count * 10:
        attempts += 1
        arrow = _try_make_arrow(rng, solved, shape, used)
        if arrow is None:
            continue
        arrow["id"] = f"a{len(out) + 1}"
        out.append(arrow)
        for pt in arrow["head"]:
            used.add((pt["r"], pt["c"]))
        for pt in arrow["tail"]:
            used.add((pt["r"], pt["c"]))
    return out


def generate_arrow(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[ArrowPuzzle]:
    if difficulty not in ARROW_DIFFICULTY_BANDS:
        raise ValueError(f"unknown arrow band: {difficulty}")
    se_lo, se_hi, max_removals = ARROW_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        arrows = random_arrows(rng, solved, shape)
        if len(arrows) < ARROWS_PER_PUZZLE - 1:
            continue
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="arrow", arrows=arrows)
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
                f"  [arrow/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"arrow-{difficulty}-{seed}-{emitted:04d}",
            variant="arrow",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield ArrowPuzzle(base=base, arrows=arrows)
