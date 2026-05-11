# Phase 17 — Samurai

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md` § Variable topology (Samurai), `docs/VARIANTS.md` § 23 Samurai.
> Prereqs: Phase 16.

## Goal

Five overlapping 9×9 grids in a cruciform: center plus four corner grids sharing the corner 3×3 box with the center. The most structurally exotic variant.

## Deliverables

### Type system materialization

- Implement `SamuraiBoard` from Phase 0 type. Holds 5 × `Grid<9>` plus a shared-cell map keyed by absolute `(grid, r, c)`.
- Edits to a shared cell propagate to all grids that contain it (or store once and resolve via the map).

### Constraint composition

- Each sub-grid carries its own constraint set (Classic, by default; other variants on sub-grids are out of scope for Phase 17).
- Conflict check runs over each sub-grid; shared-cell conflicts appear in multiple sub-grids' validate.

### Generator

- `gen/src/generator/samurai.py` — generate center grid first; constrain each corner grid's shared box to match; solve uniqueness across the 369 cells.
- Banks at `src/puzzles/samurai/` — ≥ 30 per band.

### UI

- `Board.tsx` extended (or wrapped) to render Samurai layout: cruciform with one center 9×9 and four corner 9×9s, shared boxes drawn once.
- Touch + keyboard input on the full Samurai board.
- Render in landscape only — document the orientation lock.

### Tests

- Shared-cell consistency, conflict propagation across sub-grids, generator emits valid+unique boards.

## Out of scope

- Samurai with non-Classic sub-grids (e.g. Samurai-Killer). Future phase if ever.
- Variant select UI.

## Acceptance criteria

- [ ] Samurai renders correctly with shared boxes drawn once.
- [ ] Entering a digit in a shared cell updates all sub-grids' conflict state.
- [ ] Banks gradable.
- [ ] No regression in any prior phase.

## Output format

Standard plus screenshots of Samurai on iPad landscape; flag any place where assumptions of "one grid per game" had to change.
