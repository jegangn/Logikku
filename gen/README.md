# Logikku Puzzle Generator

Offline generator for the puzzle banks committed under `../src/puzzles/`. Pure Python; no service runs at app runtime.

## Why not Z3?

The architecture envisioned Z3 (SAT) for generation. In practice, for plain Classic Sudoku on 9×9, hand-written backtracking with peer-elimination is 5–10× faster than Z3 and ships with the Python stdlib only. Z3 will be introduced when a variant genuinely needs SAT-style constraint encoding — Killer cages and Skyscraper visibility are likely first candidates. `z3-solver` is listed as an optional extra in `pyproject.toml` to keep that door open.

## Setup

```bash
python -m venv .venv
# Windows (git-bash):
source .venv/bin/activate
# Or PowerShell:
# .\.venv\Scripts\Activate.ps1
pip install -e ".[test]"
```

## Generate banks

```bash
# One band:
python -m generator.cli classic --count 200 --difficulty easy   --seed 42 --out out/classic/easy.jsonl
python -m generator.cli classic --count 200 --difficulty medium --seed 42 --out out/classic/medium.jsonl

# All five Classic bands at once:
python -m generator.cli classic --all --count 200 --seed 42 --out-dir out/classic
```

## Promote to app

```bash
# From the project root:
cp -r gen/out/classic src/puzzles/
bun run test:run  # validates the new banks
```

## Grader bridge

The CLI grades each candidate puzzle by piping it to `bun ../tools/grade.ts` (a long-running Node-runtime subprocess that loads the TS engine and emits SE scores). Cold-start cost is paid once per CLI invocation; per-puzzle grade is <20ms.

## Determinism

`--seed N` makes the run reproducible: same seed → byte-identical output. CI may verify a small fixture set hasn't drifted.

## Tests

```bash
pytest
```
