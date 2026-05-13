"""Thermometer Sudoku generator.

Each thermometer is a random orthogonal path of length 3-8. Values along the
path must strictly increase from bulb to tip. We generate a set of disjoint
thermometers per puzzle, then solve and dig under the combined constraint.
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


# Thermometer constraint is heavily constraining so most puzzles solve via
# tier-1 (SE 1.0-2.4). Like Mini 6x6 and Phase 8 variants, we differentiate
# easy / medium / hard by puzzle density (max_removals) and accept the full
# tier-1 SE range for all three bands.
THERMO_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "easy": (1.0, 2.4, 36),
    "medium": (1.0, 2.4, 46),
    "hard": (1.0, 7.9, 54),
}

# Thermometer count and path-length range per puzzle. With pure-Python solver
# every cell constrained by a thermometer cascades eliminations through the
# whole path on each placement, so search slows quickly with more/longer
# thermos. 4 paths of length 3-5 keeps generation under ~2s/puzzle.
THERMO_PATHS_PER_PUZZLE = 4
THERMO_MIN_LEN = 3
THERMO_MAX_LEN = 5


@dataclass(frozen=True)
class ThermometerPuzzle:
    base: GeneratedPuzzle
    thermometers: list[dict]

    def to_dict(self) -> dict:
        d = self.base.to_dict()
        d["thermometers"] = self.thermometers
        return d


def _random_path(
    rng: random.Random,
    shape: Shape,
    used: set[tuple[int, int]],
    target_len: int,
) -> list[tuple[int, int]] | None:
    """Random walk on the grid; never revisit a cell or one already used."""
    n = shape.size
    # Try a few seeds before giving up.
    for _ in range(20):
        sr = rng.randrange(n)
        sc = rng.randrange(n)
        if (sr, sc) in used:
            continue
        path: list[tuple[int, int]] = [(sr, sc)]
        local_used = {(sr, sc)}
        while len(path) < target_len:
            r, c = path[-1]
            candidates = [
                (nr, nc)
                for nr, nc in orthogonal_neighbours(r, c, shape)
                if (nr, nc) not in used and (nr, nc) not in local_used
            ]
            if not candidates:
                break
            nr, nc = rng.choice(candidates)
            path.append((nr, nc))
            local_used.add((nr, nc))
        if len(path) >= THERMO_MIN_LEN:
            return path
    return None


def random_thermometers(
    rng: random.Random,
    shape: Shape,
    count: int = THERMO_PATHS_PER_PUZZLE,
) -> list[list[tuple[int, int]]]:
    used: set[tuple[int, int]] = set()
    paths: list[list[tuple[int, int]]] = []
    attempts = 0
    while len(paths) < count and attempts < count * 8:
        attempts += 1
        target = rng.randint(THERMO_MIN_LEN, THERMO_MAX_LEN)
        p = _random_path(rng, shape, used, target)
        if p is None:
            continue
        paths.append(p)
        used.update(p)
    return paths


def _thermos_to_dict(thermos: list[list[tuple[int, int]]]) -> list[dict]:
    out: list[dict] = []
    for i, path in enumerate(thermos):
        out.append(
            {
                "id": f"t{i + 1}",
                "path": [{"r": r, "c": c} for r, c in path],
            }
        )
    return out


def generate_thermometer(
    count: int,
    difficulty: str,
    seed: int,
    shape: Shape = CLASSIC_9,
    symmetry: Symmetry = "none",
    grader: GraderBridge | None = None,
    progress_every: int = 10,
) -> Iterator[ThermometerPuzzle]:
    if difficulty not in THERMO_DIFFICULTY_BANDS:
        raise ValueError(f"unknown thermometer band: {difficulty}")
    se_lo, se_hi, max_removals = THERMO_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    if grader is None:
        raise ValueError("grader is required")

    emitted = 0
    attempts = 0
    while emitted < count:
        attempts += 1
        thermos = random_thermometers(rng, shape)
        if len(thermos) < THERMO_PATHS_PER_PUZZLE - 1:
            continue
        try:
            solved = random_solved(shape, rng, thermometers=thermos)
        except RuntimeError:
            continue
        dug = dig(
            solved,
            shape,
            rng,
            symmetry=symmetry,
            max_removals=max_removals,
            thermometers=thermos,
        )
        puzzle_str = grid_to_string(dug)
        thermo_dicts = _thermos_to_dict(thermos)
        result = grader.grade(
            puzzle_str, variant="thermometer", thermometers=thermo_dicts
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
                f"  [thermometer/{difficulty}] {emitted}/{count} (attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        base = GeneratedPuzzle(
            id=f"thermometer-{difficulty}-{seed}-{emitted:04d}",
            variant="thermometer",
            size=shape.size,
            givens=puzzle_str,
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
        yield ThermometerPuzzle(base=base, thermometers=thermo_dicts)
