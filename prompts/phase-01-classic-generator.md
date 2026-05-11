# Phase 1 — Classic Puzzle Generator (Python + Z3) + Grader Integration

> Read first: `CLAUDE.md`, `docs/GENERATION.md`, `docs/VARIANTS.md` § Classic.
> Prereqs: Phase 0 (the TS grader must exist for the bridge).

## Goal

Stand up the offline puzzle-generation pipeline in `gen/` and produce committed JSON banks of Classic puzzles across five difficulty bands.

## Deliverables

### Project setup

- `gen/pyproject.toml` (or `requirements.txt`) pinning `z3-solver`, `click`, `pytest`. Python ≥ 3.11.
- `gen/README.md` with run instructions.

### Generator (`gen/src/generator/`)

- `classic.py` — Z3-based generation per `docs/GENERATION.md`: random solved grid → symmetric dig → uniqueness check after each dig.
- `digger.py` — symmetric digging (180° rotational by default; pluggable strategies).
- `cli.py` — Click CLI: `python -m generator.cli classic --count N --difficulty <band> --seed S --out path.jsonl`.
- `grader_bridge.py` — invokes a Node subprocess that loads the TS engine and grades a puzzle. Subprocess script lives at `tools/grade.mjs`.
- `registry.py` — variant → generator function map. Only `classic` for this phase; entry stubs for the other 22.

### Grader bridge (`tools/grade.mjs`)

- Node script that reads puzzle strings from stdin, calls the Phase-0 grader, prints `{ se, difficulty, techniques }` per line on stdout.
- Cold-start cached: long-running mode that accepts a stream of puzzles, not one-shot per call.

### Puzzle banks (`gen/out/classic/`)

- `easy.jsonl`, `medium.jsonl`, `hard.jsonl`, `expert.jsonl`, `diabolical.jsonl`.
- ≥ 200 puzzles per band. Each line is one JSON object: `{ id, variant: "classic", size: 9, givens, difficulty, se, generatedAt }`.

### Repo import (`src/puzzles/`)

- `src/puzzles/index.ts` — exports a typed loader that imports the JSON banks as static assets.
- `src/puzzles/classic/` mirrors `gen/out/classic/`. (Commit the JSON.)
- Type guard ensures each loaded puzzle matches the schema.

### Tests

- `gen/tests/` — pytest covering: seeded determinism, uniqueness invariant after dig, grader-bridge round-trip.
- `src/puzzles/index.test.ts` — schema validation, count assertion per band.

## Out of scope

- Variant-specific generators (their own phases).
- UI integration.
- Performance work beyond "all banks generate in under 30 min on a dev laptop".

## Acceptance criteria

- [ ] `cd gen && pytest` green.
- [ ] `bun run test:run` includes the new puzzle-loader tests, all green.
- [ ] All five Classic banks exist, ≥ 200 puzzles each.
- [ ] Re-running with same `--seed` produces byte-identical output.
- [ ] No puzzle in any bank requires backtracking (technique solver alone solves it).

## Output format

Files added/modified, test counts, generation wall-clock per band, any drift in `docs/GENERATION.md`, open questions.
