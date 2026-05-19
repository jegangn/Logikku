"""Palindrome Sudoku generator.

Strategy: solve a classic grid, then sample orthogonal paths where the cells
already read the same forwards and backwards. The dig + TS-grader pipeline
checks uniqueness under the full palindrome constraint.
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


PALINDROME_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 40),
    "medium": (1.0, 2.4, 50),
    "hard": (1.0, 7.9, 54),
    "expert": (1.0, 7.9, 56),
    "diabolical": (1.0, 7.9, 58),
}

PATHS_PER_PUZZLE = 3
PATH_MIN_LEN = 3
PATH_MAX_LEN = 4


@dataclass(frozen=True)
class PalindromePuzzle:
    base: GeneratedPuzzle
    paths: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["paths"] = self.paths
        return d


def _random_walk(
    rng: random.Random,
    shape: Shape,
    used: set[tuple[int, int]],
    target_len: int,
) -> list[tuple[int, int]] | None:
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


def _is_palindromic(path: list[tuple[int, int]], solved: list[list[int]]) -> bool:
    L = len(path)
    for i in range(L // 2):
        a = solved[path[i][0]][path[i][1]]
        b = solved[path[L - 1 - i][0]][path[L - 1 - i][1]]
        if a != b:
            return False
    return True


def random_palindromes(
    rng: random.Random,
    solved: list[list[int]],
    shape: Shape,
    count: int = PATHS_PER_PUZZLE,
) -> list[dict]:
    used: set[tuple[int, int]] = set()
    out: list[dict] = []
    attempts = 0
    while len(out) < count and attempts < count * 200:
        attempts += 1
        target_len = rng.randint(PATH_MIN_LEN, PATH_MAX_LEN)
        path = _random_walk(rng, shape, used, target_len)
        if path is None:
            continue
        if not _is_palindromic(path, solved):
            continue
        out.append(
            {
                "id": f"pl{len(out) + 1}",
                "kind": "palindrome",
                "cells": [{"r": r, "c": c} for r, c in path],
            }
        )
        for r, c in path:
            used.add((r, c))
    return out


def generate_palindrome(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[PalindromePuzzle]:
    if difficulty not in PALINDROME_DIFFICULTY_BANDS:
        raise ValueError(f"unknown palindrome band: {difficulty}")
    se_lo, se_hi, max_removals = PALINDROME_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        solved = random_solved(shape, rng)
        paths = random_palindromes(rng, solved, shape)
        if len(paths) < PATHS_PER_PUZZLE - 1:
            continue
        dug = dig(solved, shape, rng, symmetry=symmetry, max_removals=max_removals)
        puzzle_str = grid_to_string(dug)
        result = grader.grade(
            puzzle_str, variant="palindrome", paths=paths
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
                f"  [palindrome/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"palindrome-{difficulty}-{seed}-{emitted:04d}",
            variant="palindrome",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield PalindromePuzzle(base=base, paths=paths)
