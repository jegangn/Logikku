#!/usr/bin/env bash
# Phase 13: Killer cages. Five density-gated bands.
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

run killer easy       110 42
run killer medium     110 42
run killer hard       110 42
run killer expert     110 42
run killer diabolical 110 42

echo "PHASE13_BANKS_DONE"
