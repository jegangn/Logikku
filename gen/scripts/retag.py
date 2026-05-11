"""One-off: re-classify tough.jsonl records by SE under the new tough/expert
boundary (6.5). SE >= 6.5 records get retagged as 'expert' and moved.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    out_dir = Path(__file__).resolve().parents[1] / "out" / "classic"
    tough = out_dir / "tough.jsonl"
    expert = out_dir / "expert.jsonl"

    if not tough.exists():
        print(f"no tough.jsonl at {tough}", file=sys.stderr)
        return 1

    new_tough: list[dict] = []
    moved: list[dict] = []
    for raw in tough.read_text(encoding="utf-8").splitlines():
        raw = raw.strip()
        if not raw:
            continue
        rec = json.loads(raw)
        if rec["se"] >= 6.5:
            rec["difficulty"] = "expert"
            moved.append(rec)
        else:
            new_tough.append(rec)

    existing_expert: list[dict] = []
    if expert.exists():
        for raw in expert.read_text(encoding="utf-8").splitlines():
            raw = raw.strip()
            if raw:
                existing_expert.append(json.loads(raw))

    combined_expert = existing_expert + moved
    seen_ids: set[str] = set()
    deduped_expert: list[dict] = []
    for rec in combined_expert:
        if rec["id"] in seen_ids:
            continue
        seen_ids.add(rec["id"])
        deduped_expert.append(rec)

    with tough.open("w", encoding="utf-8", newline="\n") as f:
        for rec in new_tough:
            f.write(json.dumps(rec, separators=(",", ":")) + "\n")
    with expert.open("w", encoding="utf-8", newline="\n") as f:
        for rec in deduped_expert:
            f.write(json.dumps(rec, separators=(",", ":")) + "\n")

    print(f"tough:  {len(new_tough)} records (SE 6.0-6.4)")
    print(f"expert: {len(deduped_expert)} records (SE 6.5-7.9; {len(moved)} moved from tough)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
