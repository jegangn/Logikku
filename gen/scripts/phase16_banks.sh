#!/usr/bin/env bash
# Phase 16 Mega 16x16 bank generation.
#
# Bands tuned empirically (see gen/src/generator/mega.py for the rationale):
#   - very-easy: skipped (SE 1.0-1.4 is unreachable at N=16 — the grader's
#     hardSteps/12 ratio saturates instantly on 16x16 tier-1 puzzles).
#   - easy:   100% acceptance, ~1s per puzzle.
#   - medium: very low acceptance — minutes-to-hours per emit.
#   - hard:   even lower — may not emit within a single sitting.
#   - expert: lowest — same caveat.
#
# Phase 16 ships easy only. Other bands are wired but not generated;
# see docs/GOTCHAS.md for the band-tuning observations and follow-up plan.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

run() {
  local band=$1
  local n=$2
  local seed=$3
  echo "=== mega-16 / $band (n=$n seed=$seed) ==="
  $PYTHON -m generator gen mega-16 -n "$n" -d "$band" \
    --out "out/mega-16/$band.jsonl" --seed "$seed"
}

mkdir -p out/mega-16 logs

run easy 50 17
# Uncomment to attempt harder bands (expect long runs / low yield):
# run medium 30 18
# run hard 20 19
# run expert 10 20

echo "PHASE16_BANKS_DONE"
