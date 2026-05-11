# Generation Pipeline — Python + Z3

> **Status:** Stub. Phase 1 implements the Classic generator end-to-end; subsequent variant phases extend.

## Why offline?

Z3 SMT solving is heavyweight and inappropriate for a phone/iPad runtime. Pre-generated puzzles compress to small JSON (~200 bytes per Classic puzzle), and committing them to the repo means the app needs no network at all.

## Layout

```
gen/
  pyproject.toml          # python-z3-solver, pytest, click (CLI)
  README.md
  src/
    generator/
      __init__.py
      classic.py          # base Classic generator
      registry.py         # variant → generator function map
      cli.py              # `python -m generator.cli classic --count 100 --difficulty medium`
      constraints/        # one file per variant, mirrors src/engine/constraints/
      digger.py           # symmetric digging strategy
      grader_bridge.py    # calls into TS grader via Node subprocess
    fixtures/             # canonical seed puzzles for tests
  out/
    classic/
      easy.json
      medium.json
      hard.json
      expert.json
      diabolical.json
    killer/
      easy.json
      …
```

Generated files copied into `src/puzzles/` of the app.

## Pipeline (Classic)

1. **Random solved grid.** Z3 finds a satisfying assignment with random seed. Filtered for global symmetry break (anchor cell forced to 1).
2. **Dig.** Remove cells in a symmetry-respecting order (rotational by default; configurable). After each removal, check that the puzzle still has a unique solution (Z3 with `solver.check()` twice, blocking the first solution).
3. **Grade.** Run the TS technique solver via a Node subprocess (or a Python port — TBD in Phase 1) to compute SE rating. If outside target band, undo the last dig and try another cell.
4. **Output.** Emit `{ id, variant, size, givens: "...", difficulty: "medium", se: 3.8, generatedAt }` to `out/<variant>/<difficulty>.json` (one object per line; JSON-Lines).

## Variant extension

Each variant phase adds:
- `gen/src/generator/constraints/<variant>.py` — Z3 constraint generator (parallels the TS Constraint)
- `gen/src/generator/<variant>.py` — variant-specific pipeline (e.g. cage partitioning for Killer)
- Entry in `registry.py`

Generators always start from a solved Classic grid (or solved jigsaw / mega / samurai) and add variant clues / structures on top.

## Targets

| Variant | Puzzles per difficulty | Time/puzzle (rough) |
|---|---|---|
| Classic | 200 | ~1 s |
| 9×9 variants | 100 | 1–10 s |
| Mini 6×6 | 100 | <1 s |
| Mega 16×16 | 30 | minutes |
| Samurai | 30 | minutes |

Generation runs locally on a dev box, not in CI. Output JSON is committed.

## Determinism

Each generator run takes `--seed N`. Same seed = same puzzles. CI can verify a small fixture set hasn't drifted.

## CLI sketch

```
python -m generator.cli classic --count 200 --difficulty medium --seed 42 --out out/classic/medium.jsonl
python -m generator.cli killer  --count 100 --difficulty hard   --seed 1
python -m generator.cli all     --difficulty easy --count 50    # all 23 variants
```

## Grader bridge

Phase 1 decision: Python re-implementation of the TS grader, or Node subprocess?
- **Subprocess:** single source of truth, slower (Node startup ~100ms × thousands of puzzles).
- **Reimpl:** faster, but two graders to keep in sync — risk of drift.

Default: subprocess. Revisit if generation times become unacceptable. Subprocess invokes a small `tools/grade.mjs` that loads the TS engine and prints `{ se, difficulty, techniques: [...] }` per stdin puzzle.

## Validation

Every generated puzzle must, before being written:
- Have exactly one solution (Z3 uniqueness check).
- Solve fully using the technique solver (no backtracking required).
- Have its computed SE rating fall in the target difficulty band.

Failures are discarded silently and retried.
