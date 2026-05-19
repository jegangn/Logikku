#!/usr/bin/env bash
# Phase 15: Palindrome + Renban + German Whispers banks (5 bands each).
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

for variant in palindrome renban german-whispers; do
  for band in easy medium hard expert diabolical; do
    run "$variant" "$band" 110 42
  done
done

echo "PHASE15_BANKS_DONE"
