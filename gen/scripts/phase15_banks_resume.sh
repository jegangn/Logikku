#!/usr/bin/env bash
# Phase 15 resume: skip bands that already meet target counts.
# Palindrome is the slow one (digger over-removes; 0.02-0.1% accept on hard+),
# so we ship 110/110/50/30/20 across easy/medium/hard/expert/diabolical.
# Renban and Whispers get the full 110 across all bands.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

run() {
  local variant=$1 band=$2 n=$3 seed=$4
  local out="out/$variant/$band.jsonl"
  if [ -f "$out" ]; then
    local existing
    existing=$(wc -l < "$out")
    if [ "$existing" -ge "$n" ]; then
      echo "=== $variant / $band: already has $existing >= $n; skipping ==="
      return 0
    fi
    rm "$out"
  fi
  echo "=== $variant / $band (n=$n seed=$seed) ==="
  $PYTHON -m generator gen "$variant" -n "$n" -d "$band" \
    --out "$out" --seed "$seed"
}

run palindrome easy 110 42
run palindrome medium 110 42
run palindrome hard 50 42
run palindrome expert 30 99
run palindrome diabolical 20 99

for variant in renban german-whispers; do
  for band in easy medium hard expert diabolical; do
    run "$variant" "$band" 110 42
  done
done

echo "PHASE15_BANKS_DONE"
