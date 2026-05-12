#!/usr/bin/env bash
# Phase 8 sequential bank generation. For each pair-inequality variant we
# ship three banks (easy / hard / expert). hard/expert are gated by hole
# count, not SE — see anti_knight.py docstring for the rationale.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

run() {
  local variant=$1
  local band=$2
  local n=$3
  local seed=$4
  echo "=== $variant / $band (n=$n seed=$seed) ==="
  $PYTHON -m generator gen "$variant" -n "$n" -d "$band" \
    --out "out/$variant/$band.jsonl" --seed "$seed"
}

run anti-knight     hard    50  42
run anti-knight     expert  50  42
run anti-king       hard    50  42
run anti-king       expert  50  42
run non-consecutive hard    50  42
run non-consecutive expert  50  42

echo "PHASE8_BANKS_DONE"
