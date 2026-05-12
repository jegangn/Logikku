#!/usr/bin/env bash
# Phase 9: Even-Odd banks. Jigsaw deferred (see GOTCHAS).
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

run even-odd hard    50  42
run even-odd medium  50  42
run even-odd tough   30  42

echo "PHASE9_BANKS_DONE"
