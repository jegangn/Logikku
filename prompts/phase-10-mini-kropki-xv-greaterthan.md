# Phase 10 — Mini 6×6 + Kropki + XV + Greater Than (bundle)

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 9 Mini, § 10 Kropki, § 11 XV, § 12 Greater Than.
> Prereqs: Phase 9.

## Goal

Four variants bundled because they share two themes:
- **Mini 6×6** validates the variable-grid-size invariant for real.
- **Kropki / XV / Greater Than** are "edge-constraint" variants — markings on cell boundaries — and share solver/render infrastructure.

## Deliverables

### Mini 6×6

- Verify `classic.ts` works at N=6 with 2×3 boxes. (Should already work since Phase 0 was parametric.)
- `gen/src/generator/classic.py` accepts `--size 6 --box-rows 2 --box-cols 3`. Add a flag to the CLI.
- Banks at `src/puzzles/mini-6/`.
- Input pad component adapts: 6-digit pad instead of 9.

### Edge-constraint variants

- `src/engine/constraints/_base/EdgeConstraint.ts` — abstract base for any constraint between two orthogonally-adjacent cells.
- `kropki.ts`, `xv.ts`, `greater-than.ts` — subclass. Use **strict** semantics for Kropki and XV (absence of mark = neither relation holds).
- Edge data structure: `{ from: Coord, to: Coord, kind: 'white-dot' | 'black-dot' | 'x' | 'v' | 'gt' | 'lt' }`.
- Puzzle JSON: `{ ..., edges: Edge[] }`.

### Overlays

- `EdgeMarkOverlay.tsx` — renders dots / X / V / arrows on shared cell borders. Single component handles all three variants via the `kind` discriminator.

### Generators

- One Python module per variant in `gen/src/generator/`. Each starts from a solved Classic grid, places marks based on the solution, then verifies uniqueness under strict-semantics.

### Tests

- Per variant. Plus a Mini 6×6 solver-fixture test that exercises the parametric grid path.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Mini 6×6 banks generated; UI renders a 6×6 grid with 6-digit input pad.
- [ ] Kropki / XV / Greater Than overlays render correctly; conflict check respects them.
- [ ] No regression in 9×9 variants.

## Output format

Standard. **Flag any place where 9 was hardcoded in earlier code** — Mini 6×6 is the canary.
