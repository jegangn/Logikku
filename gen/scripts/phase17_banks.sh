#!/usr/bin/env bash
# Phase 17c starter banks: try for 5 puzzles per band × 7 bands, but cap
# each band at 90 seconds wall clock. Bands that fail to emit (samurai SE
# is bimodal at this grader — easy and diabolical hit; middle bands are
# sparse) get backfilled by phase17_banks_backfill.py with placeholders.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

mkdir -p out/samurai logs
: > logs/phase17-starter.log

run() {
  local band=$1
  local seed=$2
  local cap=$3
  echo "=== samurai / $band (n=5 seed=$seed cap=${cap}s) ===" | tee -a logs/phase17-starter.log
  # timeout returns 124 on cap expiry — don't let set -e abort the whole run.
  timeout "$cap" $PYTHON -u -m generator gen samurai -n 5 -d "$band" \
    --out "out/samurai/$band.jsonl" --seed "$seed" 2>&1 | tee -a logs/phase17-starter.log || true
}

# Quick bands first (high acceptance). Then slower bands with shorter cap.
run easy       31 120
run very-easy  30  60
run diabolical 36 180
run medium     32  60
run hard       33  60
run tough      34  60
run expert     35  60

$PYTHON scripts/phase17_banks_backfill.py 2>&1 | tee -a logs/phase17-starter.log

$PYTHON -m generator promote --src out/samurai --dest ../src/puzzles/samurai 2>&1 | tee -a logs/phase17-starter.log

echo "PHASE17_STARTER_DONE" | tee -a logs/phase17-starter.log
