#!/usr/bin/env bash
# Phase 10: Mini 6x6 + Kropki + XV + Greater-Than banks.
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

# Mini 6x6.
run mini-6 easy   50 42
run mini-6 medium 40 42
run mini-6 hard   25 42

# Kropki.
run kropki easy   40 42
run kropki medium 40 42
run kropki hard   25 42
run kropki tough  15 42
run kropki expert 12 42

# XV.
run xv easy   40 42
run xv medium 40 42
run xv hard   25 42
run xv tough  15 42
run xv expert 12 42

# Greater Than.
run greater-than easy   40 42
run greater-than medium 40 42
run greater-than hard   25 42
run greater-than tough  15 42
run greater-than expert 12 42

echo "PHASE10_BANKS_DONE"
