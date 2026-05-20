#!/usr/bin/env bash
# Phase 17c follow-up: fill banks to target counts. Appends to existing
# JSONLs from the starter run so a Ctrl-C-interrupted session leaves
# earlier output intact.
#
# Targets minus starter (5 already in each):
#   very-easy: 50 → +45
#   easy:      50 → +45
#   medium:    50 → +45
#   hard:      30 → +25
#   tough:     20 → +15
#   expert:    15 → +10
#   diabolical:10 → +5
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

mkdir -p out/samurai logs
: > logs/phase17-followup.log

run() {
  local band=$1
  local n=$2
  local seed=$3
  echo "=== samurai / $band (n=$n seed=$seed) ===" | tee -a logs/phase17-followup.log
  $PYTHON -u -m generator gen samurai -n "$n" -d "$band" \
    --out "out/samurai/$band.jsonl" --append --seed "$seed" 2>&1 | tee -a logs/phase17-followup.log
}

run very-easy  45 40
run easy       45 41
run medium     45 42
run hard       25 43
run tough      15 44
run expert     10 45
run diabolical  5 46

$PYTHON -m generator promote --src out/samurai --dest ../src/puzzles/samurai 2>&1 | tee -a logs/phase17-followup.log

echo "PHASE17_FOLLOWUP_DONE" | tee -a logs/phase17-followup.log
