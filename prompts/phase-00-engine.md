# Phase 0 — Engine Core + Constraint Registry + Classic Solver

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/VARIANTS.md` § Classic.
> Prereqs: none (this is the foundation; every later phase depends on it).

## Goal

Build the pure-TS engine layer: type system, constraint registry with stubs for all 23 variant constraint kinds, a fully working Classic solver with techniques through Tier 4, an SE-style grader, and a comprehensive Vitest test suite. **No UI work in this phase.**

## Deliverables

### Type system (`src/engine/types.ts`)

- `Digit`, `Coord`, `Region` (readonly tuple of Coords).
- `Cell<N>` with `value`, `candidates`, `given`, `coord`.
- `Grid<N>` parametric over size `N`. Default N=9 but the engine MUST NOT hardcode 9.
- `ConstraintKind` discriminated union covering all 23 kinds listed in `docs/VARIANTS.md`.
- `Constraint` interface with `id`, `kind`, `regions`, `propagate(grid)`, `validate(grid)`, optional `techniques()`.
- `Eliminations` and `Placement` data structures used by propagators.
- `Technique` interface — `{ id, tier, apply(grid): Step | null }` returning a single deduction step or null.
- `Step` — `{ technique, eliminations, placements, explanation }` for replay/hints.
- `SamuraiBoard` type composing five `Grid<9>`s with a shared-cell map. Implementation deferred to Phase 17 but the type must exist now.

### Constraint registry (`src/engine/registry.ts`)

- `ConstraintRegistry.register(kind, factory)` and `.create(kind, params)`.
- All 23 kinds registered with **stub** constraint classes that throw `NotImplementedError` from `propagate`/`validate` (except `classic`, which is fully implemented).
- Each stub lives in `src/engine/constraints/<kind>.ts`.

### Classic constraint (`src/engine/constraints/classic.ts`)

- Full implementation: rows, columns, boxes for arbitrary `(N, boxRows, boxCols)`.
- `validate(grid)` checks no duplicate digits in any region.
- `propagate(grid)` returns elimination set from naked/hidden singles deductions on its regions.

### Solver (`src/engine/solver/`)

- `solver/techniques/` — one file per technique. Required for this phase:
  - **Tier 1:** Naked Single, Hidden Single (in row/col/box).
  - **Tier 2:** Locked Candidates (pointing pairs, claiming pairs).
  - **Tier 3:** Naked Pair, Naked Triple, Hidden Pair, Hidden Triple, Naked/Hidden Quad.
  - **Tier 4:** X-Wing, Swordfish, XY-Wing, Simple Coloring.
- `solver/techniqueSolver.ts` — applies techniques tier by tier until no progress; returns `{ solved, steps[] }`.
- `solver/backtrack.ts` — DFS fallback with constraint propagation; returns `{ solved, solutions, isUnique }`. Used by the grader for uniqueness checks and as final fallback.

### Grader (`src/engine/grader/`)

- `grader/se.ts` — runs `techniqueSolver`, records the hardest tier required, computes SE-style score per `docs/ARCHITECTURE.md` § Grader.
- Maps SE → difficulty label.

### Test suite (`src/engine/**/*.test.ts`)

- For every technique: at least 3 fixtures (positive case finds the deduction, negative case does not).
- Classic solver: solves a corpus of known puzzles (10 easy, 10 medium, 10 hard) committed to `src/engine/__fixtures__/classic/`.
- Grader: maps known SE puzzles to expected difficulty bands.
- Registry: all 23 kinds register; `.create()` round-trips parameters; stubs throw with a recognizable error.
- 100% line coverage on `solver/`, `grader/`, `registry.ts`, `constraints/classic.ts`. Other constraint stubs need not be covered.

## Out of scope

- Any UI, any React, any DOM access.
- Any variant beyond Classic — stubs only.
- Generation (Phase 1).
- Storage (Phase 3).
- Performance optimization beyond "completes the test suite in under 30s on a dev laptop".

## Acceptance criteria

- [ ] `bun run typecheck` green.
- [ ] `bun run test:run` green; coverage targets met.
- [ ] `bun run build` green.
- [ ] `src/engine/` directory contains **zero** React, DOM, or browser-globals imports (grep-able invariant).
- [ ] All 23 constraint kinds importable from the registry; 22 stubs throw, 1 (`classic`) works.
- [ ] Demo script `bun tsx src/engine/__demo__/solve.ts <puzzle-string>` prints the solution and the technique trace.

## Output format

Post a summary with:
- Files added/modified (counts).
- Test count, pass count, coverage %.
- Worst-case puzzle solve time observed.
- Any new entries appended to `docs/GOTCHAS.md`.
- Any deviation from `docs/ARCHITECTURE.md` (and why); update the doc rather than leaving drift.
- Open questions for the next phase.
