# Phase 7 — Hyper / Windoku Variant

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 3 Hyper / Windoku.
> Prereqs: Phase 6.

## Goal

Implement Hyper (also called Windoku): Classic plus four extra 3×3 "windows".

## Deliverables

- `src/engine/constraints/hyper.ts` — full impl. (Single kind; `windoku` is an alias to keep `docs/VARIANTS.md` honest.)
- Generator at `gen/src/generator/hyper.py`; banks at `gen/out/hyper/` → `src/puzzles/hyper/`.
- Overlay `HyperOverlay.tsx` — four lightly-tinted boxes.
- Solver picks up the new regions automatically; no new techniques required (existing locked-candidate / pair logic generalizes to any region set).
- Tests: constraint, generator, overlay.

## Out of scope

Same as Phase 6 (variant UI defers to Phase 18).

## Acceptance criteria

- [ ] Banks generated, gradable.
- [ ] Conflict highlighting respects the four hyper windows.
- [ ] No regression in Phase 6 X / Classic tests.

## Output format

Standard (see Phase 6).
