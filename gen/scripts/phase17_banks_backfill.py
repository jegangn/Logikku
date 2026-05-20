"""Backfill empty samurai bank JSONL files with a placeholder record so the
runtime doesn't throw `no bank found` on bands the generator couldn't hit.

The placeholder is a degenerate samurai with a single digit at the dead-middle
cell (4,4) of each sub-grid — same pattern as the Phase 17b hand-crafted demo,
and trivially passes samuraiConsistencyCheck.

Run this AFTER `python -m generator gen samurai ...` for each band, BEFORE
`promote`. It only touches JSONLs that are missing or empty; non-empty bands
are left alone.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

BANDS = ("very-easy", "easy", "medium", "hard", "tough", "expert", "diabolical")
PLACEHOLDER_DIGITS = {
    "very-easy": "1",
    "easy": "2",
    "medium": "3",
    "hard": "4",
    "tough": "5",
    "expert": "6",
    "diabolical": "7",
}

OUT_DIR = Path(__file__).resolve().parent.parent / "out" / "samurai"


def placeholder_givens(digit: str) -> list[str]:
    s = "0" * 40 + digit + "0" * 40
    return [s, s, s, s, s]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for band in BANDS:
        path = OUT_DIR / f"{band}.jsonl"
        existing = []
        if path.exists():
            existing = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        if existing:
            print(f"  [backfill] {band}: {len(existing)} records present, skipping.")
            continue
        digit = PLACEHOLDER_DIGITS[band]
        record = {
            "id": f"samurai-{band}-placeholder-0001",
            "variant": "samurai",
            "size": 9,
            "givens": "",
            "samuraiGivens": placeholder_givens(digit),
            "difficulty": band,
            "se": 1.0,
            "hardestTier": 0,
            "steps": 0,
            "generatedAt": timestamp,
        }
        with path.open("w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(record, separators=(",", ":")) + "\n")
        print(f"  [backfill] {band}: wrote placeholder record.")


if __name__ == "__main__":
    main()
