# Phase 12 — Arrow

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 14 Arrow.
> Prereqs: Phase 11.

## Goal

A circled "head" cell equals the sum of digits along the arrow's tail path.

## Deliverables

- `src/engine/constraints/arrow.ts` — one constraint per arrow; `validate` checks `head = sum(tail)`; `propagate` enforces digit bounds on tail from head, and vice versa.
- Multi-digit heads supported (two adjacent cells forming a 2-digit number) — common in CTC-style Arrow puzzles. Configurable via `head: Coord[]`.
- `gen/src/generator/arrow.py` — generate arrows of length 2–6 (tail) with single- or double-digit heads.
- Puzzle JSON: `{ ..., arrows: Arrow[] }` with `{ id, head: Coord[], tail: Coord[] }`.
- `src/ui/board/overlays/ArrowOverlay.tsx` — SVG arrow with terminal circle.
- Solver technique: "Arrow Bound" — refine candidates from the sum equation.
- Tests, banks, rendering.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Single- and double-digit heads render correctly.
- [ ] Banks generated; conflict check respects the sum rule.
- [ ] No regression.

## Output format

Standard.
