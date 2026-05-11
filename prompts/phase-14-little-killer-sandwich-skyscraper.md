# Phase 14 — Little Killer + Sandwich + Skyscraper (bundle)

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 16 Little Killer, § 17 Sandwich, § 18 Skyscraper.
> Prereqs: Phase 13.

## Goal

Three "outside-the-grid clue" variants. Bundled because they share the outside-clue rendering and the same puzzle-JSON extension.

## Deliverables

- `src/engine/constraints/{little-killer,sandwich,skyscraper}.ts`. Each accepts `clues: OutsideClue[]` keyed by side (top/bottom/left/right) and row/column index.
- Puzzle JSON: `{ ..., outsideClues: OutsideClue[] }`.
- Shared overlay `OutsideClueOverlay.tsx` — renders clue labels in margins. Variant-specific glyph (Little Killer: diagonal arrow with sum; Sandwich: plain number between 1 and 9; Skyscraper: number outside row/col).
- Generators in `gen/src/generator/` per variant.
- Banks at `src/puzzles/<variant>/`.
- Solver techniques:
  - Little Killer: "Diagonal Sum Bound".
  - Sandwich: "Sandwich Bound" — pre-compute which `(positionOf1, positionOf9)` pairs sum to the clue.
  - Skyscraper: "Visibility Counting" — eliminate digits violating the visibility count.
- Tests per variant.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Outside clues render at correct margin positions on all four sides.
- [ ] Banks gradable.
- [ ] No regression.

## Output format

Standard.
