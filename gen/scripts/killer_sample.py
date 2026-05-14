"""Sample killer puzzle SE distribution across various max_removals."""

from __future__ import annotations

import random
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from generator.digger import dig
from generator.grader_bridge import GraderBridge
from generator.grid import CLASSIC_9, grid_to_string
from generator.killer import partition_into_cages
from generator.solver import random_solved


def main() -> None:
    rng = random.Random(2026)
    samples_per_removal = 12
    removal_counts = [40, 50, 60, 70, 80]
    with GraderBridge() as grader:
        for nrem in removal_counts:
            ses = []
            for i in range(samples_per_removal):
                solved = random_solved(CLASSIC_9, rng)
                cages = partition_into_cages(rng, solved, CLASSIC_9)
                cage_dicts = [
                    {
                        "id": f"k{j+1}",
                        "sum": sum(solved[r][c] for r, c in cells),
                        "cells": [{"r": r, "c": c} for r, c in cells],
                    }
                    for j, cells in enumerate(cages)
                ]
                dug = dig(solved, CLASSIC_9, rng, symmetry="none", max_removals=nrem)
                puz = grid_to_string(dug)
                result = grader.grade(puz, variant="killer", cages=cage_dicts)
                if not result.get("ok"):
                    continue
                if not result.get("techniqueOnly") or not result.get("unique"):
                    continue
                ses.append(round(float(result["se"]), 1))
            hist = Counter(ses)
            print(f"removals={nrem:>2}: n={len(ses):>2} SE histogram={dict(sorted(hist.items()))}")


if __name__ == "__main__":
    main()
