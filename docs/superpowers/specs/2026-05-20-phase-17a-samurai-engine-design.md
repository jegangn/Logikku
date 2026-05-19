# Phase 17a — Samurai Engine + State Design

> **Status:** Approved 2026-05-20. Drives the implementation plan for Sub-project 17a.
> **Scope:** Engine and state-layer support for Samurai (5 overlapping 9×9 grids). No UI, no generator, no banks.
> **Part of:** Phase 17 (Samurai), decomposed into 17a (engine + state), 17b (cruciform UI), 17c (Python generator + banks + e2e).

## Goal

Build the engine and state foundations so a `SamuraiBoard` can be constructed, edited, validated, solved, graded, persisted, and restored. The deliverable proves correctness via vitest. There is no playable UI yet — that's 17b.

## Non-goals

- UI rendering of cruciform layout.
- Python generator or pre-generated banks.
- `tools/grade.ts` bridge dispatch for samurai variant.
- e2e specs.
- Variant select UI.
- Samurai with non-Classic sub-grids (e.g. Samurai-Killer).

## Scope decisions (locked)

| Decision | Choice |
|---|---|
| Solver strategy | Wrap existing `Grid`-only solver/grader with a Samurai-aware coordinator. Existing solver code stays untouched. |
| State shape | Discriminated union `state.board: { kind: 'grid', grid: Grid } \| { kind: 'samurai', board: SamuraiBoard } \| null`. |
| Sub-grid order | `grids[0]` = center, `grids[1..4]` = NW, NE, SW, SE. |
| Persistence | Same record, polymorphic payload. Legacy records without `kind` field default to `'grid'`. Schema bump to `version: 2` on write. |
| Shared-cell storage | Duplicate + sync. Each sub-grid stores the value locally; `setValueShared` propagates to all sub-grids containing the cell. |

## Architecture

```
┌─ NEW src/engine/samurai.ts ──────────────────────────────────┐
│  - SAMURAI_LAYOUT (const): 5-grid cruciform topology.        │
│  - createSamuraiBoard(): builds 5 Grid<9> + sharedCells map. │
│  - samuraiCellAt(board, gridIdx, coord): Cell pass-through.  │
│  - samuraiSharedLocations(board, gridIdx, coord):            │
│    returns all (grid, coord) pairs representing the same     │
│    global cell.                                              │
│  - setValueShared(board, gridIdx, coord, digit):             │
│    writes value to ALL sub-grids containing the cell.        │
│  - eraseShared(board, gridIdx, coord): inverse.              │
│  - samuraiIsComplete, samuraiCloneBoard,                     │
│    samuraiConsistencyCheck, samuraiConflicts.                │
│  - globalCoordKey(gridIdx, coord): "0,3,4" form.             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ NEW src/engine/solver/samuraiSolver.ts ─────────────────────┐
│  - samuraiTechniqueSolve(board, opts?): SamuraiSolveResult.  │
│    Loop: techniqueSolve per sub-grid; sync shared via        │
│    setValueShared; repeat until fixed point.                 │
│  - samuraiBacktrackingSolve(board, opts): SamuraiBacktrack-  │
│    Result. MRV across all sub-grids; recurse on candidates.  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ NEW src/engine/grader/samuraiGrader.ts ─────────────────────┐
│  - gradeSamurai(board): SamuraiGradeResult.                  │
│    SE = MAX across per-sub-grid SE. Falls back to backtrack  │
│    for solvability check; SE=9.0 if technique-unsolvable but │
│    backtrack-solvable.                                       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ src/engine/index.ts (modified, ~5 lines) ──────────────────┐
│  Re-exports new public surface from samurai*.ts.            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ src/state/gameStore.ts (modified, ~30 touchpoints) ─────────┐
│  state.board: GameBoard | null                               │
│  where GameBoard = { kind: 'grid', grid } | { kind:          │
│  'samurai', board }. All consumers switch on kind. New      │
│  history entry shape carries gridIdx + per-location          │
│  snapshots for undo across sub-grids.                        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ src/storage/games.ts (modified) ────────────────────────────┐
│  SavedGame.payload becomes tagged union. Legacy (no kind)    │
│  read as 'grid'. Schema bumped to version: 2 on write.       │
└──────────────────────────────────────────────────────────────┘
```

Three guiding principles:

1. **Existing engine is read-only.** `techniqueSolve`, `backtrackingSolve`, `gradePuzzle`, `cellAt`, `parsePuzzle`, all constraint files — none change. They're called by the Samurai wrappers.
2. **Duplicate + sync is the storage rule.** When a shared cell's value is set, every sub-grid containing it gets the same value. Each sub-grid stays internally consistent and can be solved/graded as a standalone 9×9 by existing code.
3. **Tagged-union discipline in state.** TS strict mode + `assertNever` exhaustiveness catches every missing-kind branch. Adding a third kind later (e.g. composite multi-Samurai) is a compile error until handled.

## Components

### 2.1 `src/engine/samurai.ts` (new)

Centralizes the cruciform topology. The `sharedCells` map is computed once in `createSamuraiBoard` from `SAMURAI_LAYOUT` and never mutates afterward (it's structural, not stateful).

```ts
export const SAMURAI_LAYOUT = {
  centerIdx: 0,
  corners: [
    { idx: 1, role: 'NW', centerBox: { r: 0, c: 0 }, cornerBox: { r: 2, c: 2 } },
    { idx: 2, role: 'NE', centerBox: { r: 0, c: 2 }, cornerBox: { r: 2, c: 0 } },
    { idx: 3, role: 'SW', centerBox: { r: 2, c: 0 }, cornerBox: { r: 0, c: 2 } },
    { idx: 4, role: 'SE', centerBox: { r: 2, c: 2 }, cornerBox: { r: 0, c: 0 } },
  ],
} as const

export type CornerRole = 'NW' | 'NE' | 'SW' | 'SE'

export function createSamuraiBoard(): SamuraiBoard
export function samuraiCellAt(board: SamuraiBoard, gridIdx: number, coord: Coord): Cell
export function samuraiSharedLocations(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): ReadonlyArray<{ readonly grid: number; readonly coord: Coord }>
export function setValueShared(board: SamuraiBoard, gridIdx: number, coord: Coord, digit: Digit): void
export function eraseShared(board: SamuraiBoard, gridIdx: number, coord: Coord): void
export function samuraiIsComplete(board: SamuraiBoard): boolean
export function samuraiCloneBoard(board: SamuraiBoard): SamuraiBoard
export function samuraiConsistencyCheck(board: SamuraiBoard): void
export function samuraiConflicts(board: SamuraiBoard): ReadonlySet<string>
export function globalCoordKey(gridIdx: number, coord: Coord): string
```

`centerBox` and `cornerBox` are 3×3 box positions in box-units (each axis 0..2). For each corner sub-grid, the 9 cells in its `cornerBox` are the same global cells as the 9 cells in the center grid's `centerBox`.

- **NW corner:** its bottom-right box (cornerBox `{r:2,c:2}` → cells (6,6)-(8,8)) overlaps the center's top-left box (centerBox `{r:0,c:0}` → cells (0,0)-(2,2)).
- **NE corner:** bottom-left ↔ center's top-right.
- **SW corner:** top-right ↔ center's bottom-left.
- **SE corner:** top-left ↔ center's bottom-right.

Within each pair, cells map by offset: corner `(cornerBox.r*3 + dr, cornerBox.c*3 + dc)` ↔ center `(centerBox.r*3 + dr, centerBox.c*3 + dc)` for `(dr, dc)` in 0..2 × 0..2.

The `sharedCells` map keys are global cell IDs (using center coords as the canonical reference, e.g. `"0,1,1"` for center row 1 col 1) and values are arrays of `(grid, coord)` pairs.

### 2.2 `src/engine/solver/samuraiSolver.ts` (new)

```ts
export interface SamuraiSolveResult {
  readonly board: SamuraiBoard
  readonly solved: boolean
  readonly hardestTier: number
  readonly stepsBySubgrid: ReadonlyArray<ReadonlyArray<Step>>
}

export function samuraiTechniqueSolve(
  input: SamuraiBoard,
  opts?: TechniqueSolveOptions,
): SamuraiSolveResult

export interface SamuraiBacktrackOptions {
  readonly maxSolutions: number
}

export interface SamuraiBacktrackResult {
  readonly solutions: ReadonlyArray<SamuraiBoard>
  readonly hasSolution: boolean
  readonly isUnique: boolean
}

export function samuraiBacktrackingSolve(
  input: SamuraiBoard,
  opts: SamuraiBacktrackOptions,
): SamuraiBacktrackResult
```

Algorithm (technique solve):
1. Clone board.
2. For each sub-grid `i`: call `techniqueSolve(board.grids[i], opts)`. Apply its eliminations to `grids[i]`. Collect placements.
3. For every placement that lands on a shared cell, call `setValueShared(board, i, coord, digit)`. This propagates the value to other sub-grids; their candidates get pruned locally on the next pass.
4. Loop steps 2-3 until a full pass produces zero new placements AND zero new eliminations.
5. `solved = samuraiIsComplete(board)`.
6. `hardestTier = max` across sub-grids; `stepsBySubgrid` records per-grid step history.

Bounded by `maxIterations` (default 1024, mirroring `techniqueSolve`).

Algorithm (backtrack solve):
1. Run `samuraiTechniqueSolve` as a propagation step.
2. If full board solved, push to `solutions`.
3. Pick the unsolved cell with fewest candidates across all sub-grids (MRV). Ties broken by sub-grid index then coord.
4. For each candidate digit at that cell: clone board, `setValueShared`, recurse. Prune via per-sub-grid `validate()` checks.
5. Stop when `len(solutions) >= maxSolutions`.

### 2.3 `src/engine/grader/samuraiGrader.ts` (new)

```ts
export interface SamuraiGradeResult {
  readonly solvable: boolean
  readonly se: number
  readonly difficulty: Difficulty
  readonly hardestTier: number
  readonly stepsBySubgrid: ReadonlyArray<ReadonlyArray<Step>>
}

export function gradeSamurai(board: SamuraiBoard): SamuraiGradeResult
```

Algorithm:
1. Call `samuraiTechniqueSolve`.
2. If `solved`: for each sub-grid, call existing `computeSE(hardestTier_i, steps_i)`. Result SE = max across sub-grids. Difficulty = `difficultyFromSE(SE)`.
3. If not solved: try `samuraiBacktrackingSolve({ maxSolutions: 1 })`. If has solution: SE=9.0, difficulty='diabolical'. Else: solvable=false, SE=0, difficulty='very-easy' (existing convention).

**SE = max rationale:** A Samurai is as hard as its hardest sub-grid. This matches player intuition and avoids inventing a new SE function for the composite.

### 2.4 `src/engine/index.ts` (modified)

Adds re-exports for the new public surface:

```ts
export {
  createSamuraiBoard, setValueShared, eraseShared,
  samuraiCellAt, samuraiSharedLocations, samuraiIsComplete,
  samuraiCloneBoard, samuraiConsistencyCheck, samuraiConflicts,
  globalCoordKey, SAMURAI_LAYOUT,
} from './samurai'
export type { CornerRole } from './samurai'
export { samuraiTechniqueSolve, samuraiBacktrackingSolve } from './solver/samuraiSolver'
export type { SamuraiSolveResult, SamuraiBacktrackOptions, SamuraiBacktrackResult } from './solver/samuraiSolver'
export { gradeSamurai } from './grader/samuraiGrader'
export type { SamuraiGradeResult } from './grader/samuraiGrader'
```

### 2.5 `src/state/gameStore.ts` (modified)

```ts
export type GameBoard =
  | { readonly kind: 'grid'; readonly grid: Grid }
  | { readonly kind: 'samurai'; readonly board: SamuraiBoard }

// state field rename:
//   grid: Grid | null   →   board: GameBoard | null
```

All ~30 read sites switch on `state.board?.kind`. Helpers (`input`, `erase`, `undo`, `redo`, `isComplete`, `cellConflicts`) dispatch on kind. `shapeForVariant('samurai')` returns `CLASSIC_9` (each sub-grid is 9×9). `loadPuzzle` accepts `variant === 'samurai'` with givens as an array of 5 strings, builds the board via `createSamuraiBoard` + `parsePuzzle` per sub-grid + `samuraiConsistencyCheck`.

History entry shape (extension):

```ts
type HistoryEntry =
  | {
      kind: 'place' | 'erase'
      // existing grid-only fields when state is { kind: 'grid' }
      coord: Coord
      prevValue: Digit | null
      // NEW: optional samurai fields
      gridIdx?: number
      prevCandidatesByLocation?: ReadonlyArray<{
        gridIdx: number
        coord: Coord
        candidates: ReadonlySet<Digit>
        value: Digit | null
      }>
    }
```

Each `setValueShared` call produces ONE entry. Undo walks `samuraiSharedLocations`, restores per-sub-grid candidates and values from the snapshot.

### 2.6 `src/storage/games.ts` (modified)

```ts
export interface SavedGame {
  // unchanged metadata: id, variant, difficulty, startedAt, elapsedMs, etc.
  readonly version: 1 | 2
  readonly payload:
    | { readonly kind: 'grid'; /* existing serialized Grid fields */ }
    | {
        readonly kind: 'samurai'
        readonly grids: readonly SavedGrid[]
        readonly cells: readonly SavedCell[][]
      }
}
```

Migration: on read, records lacking `payload.kind` are treated as `{ kind: 'grid' }`. On write, all records get `kind` and `version: 2`. Backup/restore (in `persistence.ts`) round-trips the polymorphic payload as-is — no per-variant logic in the envelope.

### Deliberately NOT components

- No new constraint kind. Samurai is composed from 5 instances of `createClassicConstraint`; cruciform coupling lives in `samurai.ts`.
- No solver-technique edits.
- No grader-bridge (`tools/grade.ts`) wiring — 17c.
- No UI changes — 17b.
- No `Play.tsx` variant routing or keyboard work — 17b.

## Data flow

### Construct a SamuraiBoard

```
gameStore.loadPuzzle({ variant: 'samurai', regions: [...] })
        │
        ▼
shapeForVariant('samurai') → CLASSIC_9
constraintsForVariant('samurai') → []
        │
        ▼
createSamuraiBoard()
        │
        ├── for i in 0..4: grids[i] = createGrid(CLASSIC_9, [classic])
        ├── sharedCells = computeSharedCells(SAMURAI_LAYOUT)
        └── return SamuraiBoard
        │
        ▼  apply givens
for i in 0..4: parse givens[i] into grids[i]
samuraiConsistencyCheck(board)  // throws on shared-cell mismatch
        │
        ▼
state.board = { kind: 'samurai', board }
```

The givens generator (17c) is responsible for producing consistent givens. Consistency check is loud — it throws on mismatch.

### Edit a cell (shared or unshared)

```
User taps cell at (gridIdx=1, coord={r:7,c:7})  // NW corner, bottom-right
gameStore.input(5)
        │
        ▼
state.board.kind === 'samurai' →
  setValueShared(board, 1, {r:7,c:7}, 5)
        │
        ├── locations = samuraiSharedLocations(board, 1, {r:7,c:7})
        │   → [{grid:1, coord:{r:7,c:7}}, {grid:0, coord:{r:1,c:1}}]
        │
        └── for each {grid, coord}: setValue(grids[grid], coord, 5)
        │
        ▼
history.push({ kind: 'place', gridIdx: 1, coord: {r:7,c:7},
               prevValue: null, prevCandidatesByLocation: [...] })
        │
        ▼
re-render uses new board state
```

Undo: `revertEntry` reads `entry.gridIdx + entry.coord`, walks `sharedLocations`, restores per-sub-grid candidates from the snapshot.

### Solve / grade a Samurai

```
gradeSamurai(board)
        │
        ▼
samuraiTechniqueSolve(board)
        │
        └── loop:
            for i in 0..4:
              result_i = techniqueSolve(grids[i])
              apply result_i.eliminations to grids[i]
              for each placement on a shared cell:
                setValueShared(board, i, coord, digit)
            stop when full pass produces no new placements/eliminations
        │
        ▼
if solved:
  per_sub_grid_SE_i = computeSE(grids[i].hardestTier, grids[i].steps)
  se = max(per_sub_grid_SE)
  difficulty = difficultyFromSE(se)
else:
  bt = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
  if bt.hasSolution: se=9.0, difficulty='diabolical'
  else: solvable=false, se=0, difficulty='very-easy'
```

### Storage round-trip

```
SAVE:
state.board.kind === 'samurai' →
  payload = { kind: 'samurai',
              grids: [serializePuzzle(grids[i]) for i in 0..4],
              cells: [snapshot per sub-grid] }
// sharedCells map NOT serialized — recomputed at load from SAMURAI_LAYOUT.

LOAD:
record.payload.kind === 'samurai' →
  board = createSamuraiBoard()
  for i in 0..4: apply serialized cells to board.grids[i]
  samuraiConsistencyCheck(board)
  state.board = { kind: 'samurai', board }

LEGACY (no payload.kind):
  treat as { kind: 'grid', ...existing fields }
  state.board = { kind: 'grid', grid: ... }
```

## Error handling

### Construct-time

- **Inconsistent givens across overlapping boxes.** `samuraiConsistencyCheck` throws with a descriptive error (`"shared cell mismatch: corner=NW, center coord (1,1), corner has 5, center has 7"`).
- **Topology assumptions.** `SAMURAI_LAYOUT` is a `const`. No parametric Samurai in this phase.
- **Custom constraints on sub-grids.** Rejected in 17a; only the default `createClassicConstraint` is allowed per sub-grid.

### Runtime — solver / grader

- **Infinite loop in `samuraiTechniqueSolve`.** Guarded by `maxIterations` cap (default 1024).
- **Backtracker explosion.** Accepted as a generator-side concern (17c). Tests use small fixtures.
- **Sub-grid inconsistency during solve.** Caught by per-sub-grid `validate()`. Treated as "not solvable" — same as a contradictory classic puzzle.

### Runtime — state mutations

- **Editing a cell on a non-samurai board with Samurai-only actions.** Silent no-op — matches existing invalid-input convention.
- **Undo across `setValueShared` group.** ONE history entry per call; snapshot enough to fully reverse.
- **Tagged-union exhaustiveness.** Every `switch(board.kind)` ends with `assertNever` fallthrough.

### Storage

- **Loading a SamuraiBoard whose grids disagree.** Migrator runs `samuraiConsistencyCheck`; on failure, logs `console.error` and discards the save (matches existing corrupted-save behavior).
- **Schema version mismatch.** Records lacking `payload.kind` treated as `'grid'`; re-stamped to `version: 2` on next write.
- **`hasBank('samurai', difficulty)` returns false.** No banks in 17a. Direct URL `/play?variant=samurai` would fail at `pickPuzzle` — acceptable since 17a doesn't ship a playable surface. 17b uses a hand-crafted fixture; 17c replaces with banks.

### Explicitly out of scope

- Network errors.
- Multi-tab concurrency.
- Solver-bridge dispatch for samurai (`tools/grade.ts`) — 17c.

## Testing

### Engine unit (vitest)

**`src/engine/samurai.test.ts` (new):**
- `createSamuraiBoard()` produces 5 `Grid<9>` with classic constraint; `sharedCells` has 36 entries (4 corners × 9 cells).
- `samuraiSharedLocations` returns 2 entries for overlapping cells, 1 for unshared.
- `setValueShared` writes to all shared sub-grids; peer-elim runs in each.
- `eraseShared` reverses; candidates restored.
- `samuraiIsComplete` true iff every cell across all sub-grids has a value.
- `samuraiCloneBoard` is a deep copy.
- `samuraiConsistencyCheck` throws on a hand-crafted inconsistent board.

**`src/engine/solver/samuraiSolver.test.ts` (new):**
- Near-solved board → `samuraiTechniqueSolve` returns `solved: true`.
- Unsolvable board (shared-cell conflict) → returns `solved: false`.
- Cross-grid propagation case: NW corner placement forces center placement via shared overlap; solver finds it.
- `samuraiBacktrackingSolve` on near-solved → `solutions.length === 1`, `isUnique: true`.
- `samuraiBacktrackingSolve` on under-constrained board with `maxSolutions: 2` → `isUnique: false`.

**`src/engine/grader/samuraiGrader.test.ts` (new):**
- Singles-only board → SE in `[1.0, 3.0]`, matching difficulty.
- Technique-unsolvable but backtrack-solvable → SE=9.0, difficulty='diabolical'.
- Asymmetric board (one sub-grid harder) → SE = max across sub-grids.

### State unit (vitest)

**`src/state/gameStore.samurai.test.ts` (new):**
- `loadPuzzle({ variant: 'samurai', ... })` sets `state.board.kind === 'samurai'`.
- `input(5)` on a shared cell updates all sub-grids containing it.
- `erase()` reverses; undo/redo round-trip across shared and unshared placements.
- `cellConflicts` returns true when any shared location has a peer conflict.
- `isComplete` returns true for fully-filled SamuraiBoard.

**`src/state/gameStore.test.ts` (modified):**
- Existing tests stay green after the discriminated-union refactor. Mechanical update: `state.grid` → `state.board.kind === 'grid' ? state.board.grid : null`.

### Storage unit (vitest)

**`src/storage/games.samurai.test.ts` (new):**
- Save → load round-trips a SamuraiBoard with all 5 sub-grids' values and candidates.
- Regression: a Grid save still round-trips after the schema bump.
- Legacy `version: 1` record without `payload.kind` is read as `'grid'` and re-stamped on write.
- Backup-then-restore an envelope with both a samurai and a classic game.

### Deliberately NOT tested in 17a

- UI rendering of SamuraiBoard (17b).
- Generator output (17c).
- E2E (17c).
- `tools/grade.ts` samurai dispatch (17c).
- Performance of `samuraiBacktrackingSolve` (generator-side concern).

### Verification gate for 17a

- [ ] `bun run typecheck` clean.
- [ ] `bun run lint` clean.
- [ ] `bun run test:run` green including new engine + state + storage suites.
- [ ] `bun run build` succeeds.
- [ ] No regression in any existing Grid-based variant (existing test suite is the proof).
- [ ] All ~30 touchpoints in gameStore reviewed and updated consistently.

The verification gate is intentionally lighter than Phase 16's because there is no playable UI yet. Full e2e verification is 17c's job.

## Acceptance criteria

- [ ] `src/engine/samurai.ts` exists and exports the documented surface.
- [ ] `src/engine/solver/samuraiSolver.ts` and `src/engine/grader/samuraiGrader.ts` exist.
- [ ] `src/engine/index.ts` re-exports the new public surface.
- [ ] `src/state/gameStore.ts` uses the `GameBoard` discriminated union; all consumers handle both `kind` values; existing 9×9 / 6×6 / 16×16 variants work unchanged.
- [ ] `src/storage/games.ts` accepts the polymorphic payload; legacy reads work; new writes use `version: 2`.
- [ ] All new vitest suites green; existing suite green (no regressions).
- [ ] `bun run typecheck`, `bun run lint`, `bun run build` all clean.
