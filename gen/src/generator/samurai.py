"""Samurai 5×9×9 cruciform generator.

Pipeline per puzzle: solve_samurai_empty → dig_samurai → grade_samurai →
SE-band + technique-mode filter → emit.
"""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .grader_bridge import GraderBridge
from .samurai_digger import dig_samurai


# Each tuple: (se_lo, se_hi, max_removals). max_removals empirically tuned
# during 17c starter run; cells = 405 across cruciform.
SAMURAI_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "very-easy": (0.0, 1.4, 200),
    "easy":      (1.5, 2.4, 230),
    "medium":    (2.5, 3.9, 260),
    "hard":      (4.0, 5.9, 285),
    "tough":     (6.0, 6.4, 295),
    "expert":    (6.5, 7.9, 305),
    "diabolical":(8.0, 99.9,320),
}


def generate_samurai(
    count: int,
    difficulty: str,
    seed: int,
    bridge: GraderBridge | None = None,
    progress_every: int = 1,
    **_ignored,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in SAMURAI_DIFFICULTY_BANDS:
        raise ValueError(f"unknown samurai band: {difficulty}")
    if bridge is None:
        raise ValueError("bridge is required for samurai generator")
    se_lo, se_hi, max_removals = SAMURAI_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    emitted = 0
    attempts = 0
    consecutive_failures = 0
    while emitted < count:
        attempts += 1
        try:
            solved = bridge.solve_samurai_empty(seed=rng.randint(0, 2**31 - 1))
            dug = dig_samurai(solved, rng, bridge, max_removals)
            result = bridge.grade_samurai(dug)
        except RuntimeError as err:
            consecutive_failures += 1
            if consecutive_failures > 100:
                raise RuntimeError(f"100 consecutive bridge failures: {err}")
            continue
        consecutive_failures = 0
        if not result.get("ok") or not result.get("unique"):
            continue
        se = float(result["se"])
        if difficulty == "diabolical":
            if result.get("techniqueOnly"):
                continue
        else:
            if not result.get("techniqueOnly"):
                continue
        if se < se_lo or se > se_hi:
            continue
        emitted += 1
        if emitted % progress_every == 0 or emitted == count:
            print(
                f"  [samurai/{difficulty}] {emitted}/{count} "
                f"(attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"samurai-{difficulty}-{seed}-{emitted:04d}",
            variant="samurai",
            size=9,
            givens="",
            samurai_givens=tuple(dug),
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
