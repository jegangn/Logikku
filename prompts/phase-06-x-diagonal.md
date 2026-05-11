# Phase 6 — X / Diagonal Variant

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/VARIANTS.md` § 2 X / Diagonal.
> Prereqs: Phase 5 (so the variant ships installable).

## Goal

Implement the X-Sudoku variant end-to-end: constraint, solver-technique extensions, generator, UI overlay, puzzle bank.

## Deliverables

- `src/engine/constraints/x-diagonal.ts` — full implementation replacing the Phase-0 stub. Adds NW-SE and NE-SW regions.
- Diagonal-aware technique: a "Diagonal Hidden Single" deduction in the solver (`src/engine/solver/techniques/diagonalHiddenSingle.ts`).
- Grader picks up the new technique automatically via the registry.
- `gen/src/generator/constraints/x_diagonal.py` + `gen/src/generator/x_diagonal.py` — extends classic with diagonal Z3 clauses.
- Five difficulty banks at `gen/out/x-diagonal/` → committed to `src/puzzles/x-diagonal/` (≥ 50 per band; X is rare in the wild, smaller bank acceptable).
- `src/ui/board/overlays/XDiagonalOverlay.tsx` — subtle tinted diagonals.
- Variant registration wired so `/play?variant=x-diagonal` works.
- Tests: constraint, technique, generator, overlay rendering.

## Out of scope

- Variant select UI — Phase 18.
- Onboarding rules screen — Phase 18.

## Acceptance criteria

- [ ] X-Sudoku banks generated, validated unique, gradable.
- [ ] Loading an X puzzle in `/play?variant=x-diagonal` shows the diagonals; conflict check respects them.
- [ ] All Phase-0 Classic tests still green (no regression).
- [ ] Tests green; build green.

## Output format

Files added/modified, test counts, sample puzzle screenshot, any new gotchas, open questions.
