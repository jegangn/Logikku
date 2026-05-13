#!/usr/bin/env bash
# Phase 11: Thermometer banks. Three bands gated by puzzle density.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

run() {
  local variant=$1 band=$2 n=$3 seed=$4
  echo "=== $variant / $band (n=$n seed=$seed) ==="
  $PYTHON -m generator gen "$variant" -n "$n" -d "$band" \
    --out "out/$variant/$band.jsonl" --seed "$seed"
}

run thermometer easy   40 42
run thermometer medium 35 42
run thermometer hard   25 42

echo "PHASE11_BANKS_DONE"
