#!/usr/bin/env bash
# Phase 16 follow-up: fill in medium/hard/expert bands.
# Per GOTCHAS, at N=16 the grader takes minutes per call at max_removals>=140
# and acceptance into target SE bands is single-digit percent. Counts are
# trimmed to realistic targets; bands run sequentially so ctrl-C leaves
# earlier output intact.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

run() {
  local band=$1
  local n=$2
  local seed=$3
  echo "=== mega-16 / $band (n=$n seed=$seed) ===" | tee -a logs/mega16-followup.log
  $PYTHON -u -m generator gen mega-16 -n "$n" -d "$band" \
    --out "out/mega-16/$band.jsonl" --seed "$seed" 2>&1 | tee -a logs/mega16-followup.log
}

mkdir -p out/mega-16 logs
: > logs/mega16-followup.log

run medium 20 18
run hard   15 19
run expert 10 20

echo "PHASE16_FOLLOWUP_DONE" | tee -a logs/mega16-followup.log
