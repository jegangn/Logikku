"""Kropki Sudoku generator.

Strict Kropki: every adjacent pair with a relation gets a dot; absence of a
dot implies neither relation holds. We compute the dots from the solved grid,
then dig with uniqueness checked under the strict-semantics grader.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Iterator

from .classic import GeneratedPuzzle
from .constraints.edge_helpers import iter_edges, kropki_mark
from .digger import Symmetry, dig
from .grader_bridge import GraderBridge
from .grid import CLASSIC_9, Shape, grid_to_string
from .solver import random_solved


KROPKI_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.5, 2.4, 50),
    "medium": (2.5, 3.9, 56),
    "hard": (4.0, 5.9, 60),
    "tough": (6.0, 6.4, 64),
    "expert": (6.5, 7.9, 64),
}


@dataclass(frozen=True)
class KropkiPuzzle:
    base: GeneratedPuzzle
    edges: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["edges"] = self.edges
        return d


def edges_from_solved(grid: list[list[int]], shape: Shape) -> list[dict]:
    out: list[dict] = []
    for a, b in iter_edges(shape):
        mark = kropki_mark(grid[a[0]][a[1]], grid[b[0]][b[1]])
        if mark is None:
            continue
        out.append({"from": {"r": a[0], "c": a[1]}, "to": {"r": b[0], "c": b[1]}, "kind": mark})
    return out


def generate_kropki(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "rotational",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[KropkiPuzzle]:
    if difficulty not in KROPKI_DIFFICULTY_BANDS:
        raise ValueError(f"unknown kropki band: {difficulty}")
    se_lo, se_hi, max_removals = KROPKI_DIFFICULTY_BANDS[difficulty]
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
        # Aggressive dig: under strict-Kropki the marks are very constraining.
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
        )
        puzzle_str = grid_to_string(dug)
        result = grader.grade(puzzle_str, variant="kropki", edges=edges)
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
                f"  [kropki/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"kropki-{difficulty}-{seed}-{emitted:04d}",
            variant="kropki",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield KropkiPuzzle(base=base, edges=edges)
