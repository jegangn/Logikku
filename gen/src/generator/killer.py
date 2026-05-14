"""Killer Sudoku generator.

Strategy:
  1. Solve a classic grid.
  2. Partition all 81 cells into cages of size 1..MAX_CAGE_SIZE via random
     polyomino growth.
  3. Compute each cage's sum from the solved grid (digits are guaranteed
     distinct because the partition does not cross row, column, OR box more
     than once for the same digit — actually we enforce distinctness during
     growth).
  4. Dig the grid (remove most or all givens) and verify the TS grader can
     solve technique-only AND uniquely under the cage constraints.

Bands gate by `max_removals` (givens density) AND SE range.
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


# Bands. Killer cages are extremely constraining: combination filtering means
# nearly every puzzle solves via tier-1 techniques only. Like Mini 6x6 /
# Thermometer / Arrow, we gate the five labelled bands by puzzle density
# (max_removals) and accept the full tier-1 SE range for all of them. Higher
# max_removals = sparser givens = perceived harder.
KILLER_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 45),
    "medium": (1.0, 2.4, 55),
    "hard": (1.0, 2.4, 65),
    "expert": (1.0, 2.4, 73),
    "diabolical": (1.0, 2.4, 81),
}


# Cage size policy.
MIN_CAGE_SIZE = 1
MAX_CAGE_SIZE = 5
# Distribution skew: probability weights per target size (1..5). Avoid too many
# singletons (boring) and too many size-5 cages (over-determined).
CAGE_SIZE_WEIGHTS = (1, 4, 5, 4, 2)


@dataclass(frozen=True)
class KillerPuzzle:
    base: GeneratedPuzzle
    cages: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["cages"] = self.cages
        return d


def _random_cage_size(rng: random.Random) -> int:
    return rng.choices(
        range(MIN_CAGE_SIZE, MAX_CAGE_SIZE + 1),
        weights=CAGE_SIZE_WEIGHTS,
        k=1,
    )[0]


def partition_into_cages(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
) -> list[list[tuple[int, int]]]:
    """Cover every cell with cages whose member digits are distinct."""
    n = shape.size
    assigned: dict[tuple[int, int], int] = {}
    cages: list[list[tuple[int, int]]] = []

    coords = [(r, c) for r in range(n) for c in range(n)]
    rng.shuffle(coords)

    for r, c in coords:
        if (r, c) in assigned:
            continue
        target_size = _random_cage_size(rng)
        cage: list[tuple[int, int]] = [(r, c)]
        digits = {solved[r][c]}
        assigned[(r, c)] = len(cages)

        # Greedy polyomino growth.
        while len(cage) < target_size:
            # Candidate neighbours of any cell in the cage.
            frontier: list[tuple[int, int]] = []
            seen = set()
            for cr, cc in cage:
                for nr, nc in orthogonal_neighbours(cr, cc, shape):
                    if (nr, nc) in assigned:
                        continue
                    if (nr, nc) in seen:
                        continue
                    if solved[nr][nc] in digits:
                        continue
                    seen.add((nr, nc))
                    frontier.append((nr, nc))
            if not frontier:
                break
            nr, nc = rng.choice(frontier)
            cage.append((nr, nc))
            digits.add(solved[nr][nc])
            assigned[(nr, nc)] = len(cages)
        cages.append(cage)

    return cages


def _cages_to_dict(
    cages: list[list[tuple[int, int]]],
    solved: list[list[int]],
) -> list[dict]:
    out: list[dict] = []
    for i, cells in enumerate(cages):
        total = sum(solved[r][c] for r, c in cells)
        out.append(
            {
                "id": f"k{i + 1}",
                "sum": total,
                "cells": [{"r": r, "c": c} for r, c in cells],
            }
        )
    return out


def generate_killer(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[KillerPuzzle]:
    if difficulty not in KILLER_DIFFICULTY_BANDS:
        raise ValueError(f"unknown killer band: {difficulty}")
    se_lo, se_hi, max_removals = KILLER_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        cages = partition_into_cages(rng, solved, shape)
        cage_dicts = _cages_to_dict(cages, solved)
        # Dig aggressively under classic-only because the cage constraint will
        # give the grader extra power. The TS grader does the final uniqueness
        # check using the full constraint stack.
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="killer", cages=cage_dicts)
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
                f"  [killer/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"killer-{difficulty}-{seed}-{emitted:04d}",
            variant="killer",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield KillerPuzzle(base=base, cages=cage_dicts)
