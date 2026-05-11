# Phase 13 — Killer Sudoku (largest phase)

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/VARIANTS.md` § 15 Killer.
> Prereqs: Phase 12.

## Goal

The biggest variant. Cells partitioned into "cages" (irregular polyominoes); each cage shows a target sum; no digit repeats in a cage. Cages do not respect box boundaries.

## Deliverables

### Constraint (`src/engine/constraints/killer.ts`)

- Accepts `cages: Cage[]` where `Cage = { id, cells: Coord[], sum: number }`.
- `validate`: for each cage, sum of values must equal target AND digits within the cage are distinct.
- `propagate` implements:
  - Naked-cage subsets (impossible digit combinations eliminated).
  - "Cage minimum/maximum" digit-bound propagation.

### Techniques (`src/engine/solver/techniques/killer/`)

- **Cage 45 rule** — sum of any row / column / box = 45 (9×9); use to derive "innies" and "outies" of unions of cages.
- **Innie / Outie** — cells that protrude or are missing from a cage union vs a row/col/box.
- **Locked-Cage Subset** — pencil-mark eliminations from forced digit subsets.

### Generator (`gen/src/generator/killer.py`)

- Start from solved Classic grid.
- Partition into cages: random-walk polyominoes of size 1–9 with greedy growth and rebalancing.
- Compute cage sums.
- Verify the puzzle is uniquely solvable using *technique-only* solving (no backtracking) under the cage constraints; if not, repartition or relax.
- Banks at `src/puzzles/killer/` — easy/medium/hard/expert/diabolical, ≥ 100 per band.

### Overlay (`src/ui/board/overlays/KillerOverlay.tsx`)

- Dashed cage borders (inset 4px).
- Cage sum number in top-left of leftmost-then-topmost cell of each cage.
- Distinct cage tint colors (cycle a 6-color palette with a graph-coloring constraint so adjacent cages never share).

### Tests

- Cage-validation, propagation, each technique with positive + negative fixtures.
- Generator: seed determinism, every emitted puzzle solves technique-only.
- Overlay: snapshot of a small fixture rendering.

## Out of scope

Variant select UI; per-variant onboarding (Phase 18).

## Acceptance criteria

- [ ] Killer banks gradable, all technique-only solvable.
- [ ] Overlay renders correctly with cage dashes + sum labels + no-adjacent-tint coloring.
- [ ] Cage-45 deduction works in the demo solver trace.
- [ ] No regression across the 14 prior variants.

## Output format

Standard plus: generator wall-clock per band, count of techniques exercised in the corpus, and any cage-partitioning heuristics that needed tuning.
