# Phase 11 — Thermometer

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 13 Thermometer.
> Prereqs: Phase 10.

## Goal

Path-based variant: each "thermometer" is an ordered cell path from bulb to tip; values must strictly increase along the path.

## Deliverables

- `src/engine/constraints/thermometer.ts` — one constraint per thermometer; `propagate` eliminates candidates that violate the monotonicity bound (e.g. cell k of a length-L thermo can only hold digits in `[k+1, N-(L-1-k)]` in the simplest case; refine with neighbors).
- `gen/src/generator/thermometer.py` — generate thermometers as random monotone paths of length 3–8; verify unique under all of them.
- Puzzle JSON: `{ ..., thermometers: Thermometer[] }` where each is `{ id, path: Coord[] }`.
- `src/ui/board/overlays/ThermometerOverlay.tsx` — SVG: a filled circle at the bulb, a thick line through the cell centers along the path.
- Solver technique: "Thermometer Bound" — refine candidates based on path position; sometimes interacts with classic techniques.
- Tests, banks, overlay rendering.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Thermometers render correctly even when they bend.
- [ ] Banks generated; some require backtracking-free human-technique solve.
- [ ] No regression.

## Output format

Standard.
