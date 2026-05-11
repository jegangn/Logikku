# Phase 9 — Jigsaw + Even-Odd

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 7 Jigsaw, § 8 Even-Odd.
> Prereqs: Phase 8.

## Goal

Two variants that introduce per-puzzle structure data: Jigsaw needs a polyomino partition; Even-Odd needs cell parity markings.

## Deliverables

### Jigsaw

- `src/engine/constraints/jigsaw.ts` — accepts `regions: Region[]` (replaces the 9 default boxes).
- `gen/src/generator/jigsaw.py` — generate a 9-piece polyomino partition first (each piece 9 contiguous cells), then puzzle on it.
- Overlay `JigsawOverlay.tsx` — thicker borders along polyomino edges (compute from the regions).
- Puzzle JSON gains a `regions` field for Jigsaw.

### Even-Odd

- `src/engine/constraints/even-odd.ts` — per-cell parity restrictions.
- Generator: Classic + random parity markings; verify unique solution under the parity constraint.
- Overlay `EvenOddOverlay.tsx` — even cells: light grey rounded square behind digit; odd: light grey circle.

### Banks

- `src/puzzles/jigsaw/` and `src/puzzles/even-odd/`, all five difficulty bands.

### Tests

- Per variant: constraint, generator, overlay rendering, puzzle JSON schema covers `regions` / `parityMask`.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Jigsaw renders correctly with thick polyomino borders.
- [ ] Even-Odd visually distinguishes cells; entering a violating digit conflicts.
- [ ] No regression.

## Output format

Standard.
