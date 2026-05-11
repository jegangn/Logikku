# Phase 15 — Palindrome + Renban + German Whispers (bundle)

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 19 Palindrome, § 20 Renban, § 21 German Whispers.
> Prereqs: Phase 14.

## Goal

Three "marked path" variants that share path-rendering infrastructure with Thermometer (Phase 11).

## Deliverables

- `src/engine/constraints/{palindrome,renban,german-whispers}.ts`.
  - **Palindrome** — cells along the path mirror around the midpoint: `cells[i] == cells[L-1-i]`.
  - **Renban** — cells along the path form a consecutive-digit set (any order).
  - **German Whispers** — `|cells[i] - cells[i+1]| >= 5` along the path.
- Puzzle JSON: `{ ..., paths: VariantPath[] }` with `{ id, kind, cells: Coord[] }`. `kind` is the variant id.
- Shared overlay `PathOverlay.tsx` — draws a colored curve through the cells. Color per kind: palindrome = neutral grey, renban = purple, german-whispers = green.
- Generators per variant in `gen/src/generator/`.
- Banks per variant.
- Solver techniques:
  - Palindrome: pair equality (symmetric cells share candidates).
  - Renban: "Renban Set Reduction" — candidates restricted to consecutive runs of length L.
  - German Whispers: "Whisper Step" — alternating high/low bands.
- Tests per variant.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Path overlays render smoothly through cell centers; curves use SVG `<path>` with rounded line-joins.
- [ ] Banks gradable.
- [ ] No regression.

## Output format

Standard.
