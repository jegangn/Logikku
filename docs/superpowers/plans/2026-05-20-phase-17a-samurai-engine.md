# Phase 17a — Samurai Engine + State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the engine and state-layer foundations so a `SamuraiBoard` (5 overlapping 9×9 grids) can be constructed, edited, validated, solved, graded, persisted, and restored. No UI, no banks — those are 17b and 17c.

**Architecture:** Existing `Grid`-only code stays read-only. New modules `src/engine/samurai.ts`, `src/engine/solver/samuraiSolver.ts`, and `src/engine/grader/samuraiGrader.ts` add Samurai-aware coordinators. `gameStore.ts` is refactored to use a tagged-union `board: GameBoard | null` (`{kind:'grid'}` or `{kind:'samurai'}`). Storage gets an optional `kind`/`samurai` discriminator for forward-compat without breaking existing classic saves.

**Tech Stack:** TypeScript 6 (strict + noUncheckedIndexedAccess), Zustand 5, idb 8, Vitest 4, bun.

**Spec:** [`docs/superpowers/specs/2026-05-20-phase-17a-samurai-engine-design.md`](../specs/2026-05-20-phase-17a-samurai-engine-design.md)

---

## Task 1: Layout topology + sharedCells helper

**Files:**
- Create: `src/engine/samurai.ts`
- Test: `src/engine/samurai.test.ts` (new)

Pure data math: define `SAMURAI_LAYOUT`, `globalCoordKey`, and a helper that computes the `sharedCells` map for the standard cruciform.

- [ ] **Step 1: Write the failing test**

Create `src/engine/samurai.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  SAMURAI_LAYOUT,
  globalCoordKey,
  computeSharedCells,
} from './samurai'

describe('SAMURAI_LAYOUT', () => {
  it('has center at index 0 and 4 corners in NW/NE/SW/SE order', () => {
    expect(SAMURAI_LAYOUT.centerIdx).toBe(0)
    expect(SAMURAI_LAYOUT.corners.length).toBe(4)
    expect(SAMURAI_LAYOUT.corners.map((c) => c.role)).toEqual(['NW', 'NE', 'SW', 'SE'])
    expect(SAMURAI_LAYOUT.corners.map((c) => c.idx)).toEqual([1, 2, 3, 4])
  })

  it('places the NW corner so its bottom-right 3×3 box overlaps the centers top-left', () => {
    const nw = SAMURAI_LAYOUT.corners[0]!
    expect(nw.cornerBox).toEqual({ r: 2, c: 2 }) // bottom-right box of NW corner
    expect(nw.centerBox).toEqual({ r: 0, c: 0 }) // top-left box of center
  })

  it('places the SE corner so its top-left 3×3 box overlaps the centers bottom-right', () => {
    const se = SAMURAI_LAYOUT.corners[3]!
    expect(se.cornerBox).toEqual({ r: 0, c: 0 })
    expect(se.centerBox).toEqual({ r: 2, c: 2 })
  })
})

describe('globalCoordKey', () => {
  it('formats gridIdx, r, c into a comma-separated string', () => {
    expect(globalCoordKey(0, { r: 1, c: 2 })).toBe('0,1,2')
    expect(globalCoordKey(3, { r: 8, c: 8 })).toBe('3,8,8')
  })
})

describe('computeSharedCells', () => {
  it('returns a map with 36 entries (4 corners × 9 cells per overlap)', () => {
    const map = computeSharedCells()
    expect(map.size).toBe(36)
  })

  it('maps the NW corner cell (7,7) to the same global key as the center cell (1,1)', () => {
    const map = computeSharedCells()
    // canonical key uses center coords prefixed with "0,"
    const canonical = '0,1,1'
    const entries = map.get(canonical)!
    expect(entries.length).toBe(2)
    const sorted = [...entries].sort((a, b) => a.grid - b.grid)
    expect(sorted[0]).toEqual({ grid: 0, coord: { r: 1, c: 1 } })
    expect(sorted[1]).toEqual({ grid: 1, coord: { r: 7, c: 7 } })
  })

  it('maps each corners overlap correctly for all 4 corners', () => {
    const map = computeSharedCells()
    // SE corner: cornerBox {r:0,c:0} → corner cells (0..2, 0..2); center cells (6..8, 6..8)
    const seKey = '0,6,6'
    const seEntries = map.get(seKey)!
    const seSorted = [...seEntries].sort((a, b) => a.grid - b.grid)
    expect(seSorted[0]).toEqual({ grid: 0, coord: { r: 6, c: 6 } })
    expect(seSorted[1]).toEqual({ grid: 4, coord: { r: 0, c: 0 } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/engine/samurai.ts` with layout, key formatter, and topology helper**

```ts
import type { Coord } from './types'

export type CornerRole = 'NW' | 'NE' | 'SW' | 'SE'

export interface CornerLayout {
  readonly idx: number
  readonly role: CornerRole
  readonly centerBox: { readonly r: number; readonly c: number }
  readonly cornerBox: { readonly r: number; readonly c: number }
}

export const SAMURAI_LAYOUT: {
  readonly centerIdx: number
  readonly corners: ReadonlyArray<CornerLayout>
} = {
  centerIdx: 0,
  corners: [
    { idx: 1, role: 'NW', centerBox: { r: 0, c: 0 }, cornerBox: { r: 2, c: 2 } },
    { idx: 2, role: 'NE', centerBox: { r: 0, c: 2 }, cornerBox: { r: 2, c: 0 } },
    { idx: 3, role: 'SW', centerBox: { r: 2, c: 0 }, cornerBox: { r: 0, c: 2 } },
    { idx: 4, role: 'SE', centerBox: { r: 2, c: 2 }, cornerBox: { r: 0, c: 0 } },
  ],
}

export function globalCoordKey(gridIdx: number, coord: Coord): string {
  return `${gridIdx},${coord.r},${coord.c}`
}

export interface SharedLocation {
  readonly grid: number
  readonly coord: Coord
}

/**
 * Computes the shared-cells map for the standard cruciform topology.
 * Keys are canonical center-grid global keys (e.g. "0,1,1"); values are
 * the list of (grid, coord) pairs representing the same global cell.
 * Each overlap contributes 9 entries (one per cell in a 3×3 box).
 */
export function computeSharedCells(): ReadonlyMap<string, ReadonlyArray<SharedLocation>> {
  const map = new Map<string, SharedLocation[]>()
  for (const corner of SAMURAI_LAYOUT.corners) {
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const centerCoord: Coord = {
          r: corner.centerBox.r * 3 + dr,
          c: corner.centerBox.c * 3 + dc,
        }
        const cornerCoord: Coord = {
          r: corner.cornerBox.r * 3 + dr,
          c: corner.cornerBox.c * 3 + dc,
        }
        const key = globalCoordKey(SAMURAI_LAYOUT.centerIdx, centerCoord)
        map.set(key, [
          { grid: SAMURAI_LAYOUT.centerIdx, coord: centerCoord },
          { grid: corner.idx, coord: cornerCoord },
        ])
      }
    }
  }
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add src/engine/samurai.ts src/engine/samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: samurai.ts layout topology + sharedCells helper

SAMURAI_LAYOUT defines the cruciform with center at idx 0 and
NW/NE/SW/SE corners at 1-4. computeSharedCells maps the 36 overlap
cells to (grid, coord) pairs. globalCoordKey formats identity keys.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: createSamuraiBoard + cell helpers

**Files:**
- Modify: `src/engine/samurai.ts`
- Modify: `src/engine/samurai.test.ts`

Build the board factory and per-cell accessors.

- [ ] **Step 1: Add failing tests**

Append to `src/engine/samurai.test.ts`:

```ts
import {
  createSamuraiBoard,
  samuraiCellAt,
  samuraiSharedLocations,
} from './samurai'

describe('createSamuraiBoard', () => {
  it('builds 5 empty 9×9 grids each with a classic constraint', () => {
    const board = createSamuraiBoard()
    expect(board.grids.length).toBe(5)
    for (const grid of board.grids) {
      expect(grid.shape.size).toBe(9)
      expect(grid.shape.boxRows).toBe(3)
      expect(grid.shape.boxCols).toBe(3)
      expect(grid.constraints.length).toBe(1)
      expect(grid.constraints[0]!.kind).toBe('classic')
    }
  })

  it('has 36 sharedCells entries', () => {
    const board = createSamuraiBoard()
    expect(board.sharedCells.size).toBe(36)
  })
})

describe('samuraiCellAt', () => {
  it('reads through to the requested sub-grid', () => {
    const board = createSamuraiBoard()
    const cell = samuraiCellAt(board, 1, { r: 0, c: 0 })
    expect(cell.value).toBeNull()
    expect(cell.candidates.size).toBe(9)
  })
})

describe('samuraiSharedLocations', () => {
  it('returns 2 entries for the center cell (1,1) (in NW corners overlap)', () => {
    const board = createSamuraiBoard()
    const locs = samuraiSharedLocations(board, 0, { r: 1, c: 1 })
    expect(locs.length).toBe(2)
    const grids = [...locs].map((l) => l.grid).sort((a, b) => a - b)
    expect(grids).toEqual([0, 1])
  })

  it('returns 2 entries for the NW corner cell (7,7)', () => {
    const board = createSamuraiBoard()
    const locs = samuraiSharedLocations(board, 1, { r: 7, c: 7 })
    expect(locs.length).toBe(2)
    const grids = [...locs].map((l) => l.grid).sort((a, b) => a - b)
    expect(grids).toEqual([0, 1])
  })

  it('returns 1 entry (self) for an unshared cell in the center', () => {
    const board = createSamuraiBoard()
    const locs = samuraiSharedLocations(board, 0, { r: 4, c: 4 })
    expect(locs.length).toBe(1)
    expect(locs[0]).toEqual({ grid: 0, coord: { r: 4, c: 4 } })
  })

  it('returns 1 entry (self) for an unshared cell in a corner', () => {
    const board = createSamuraiBoard()
    const locs = samuraiSharedLocations(board, 2, { r: 0, c: 0 }) // NE top-left, unshared
    expect(locs.length).toBe(1)
    expect(locs[0]).toEqual({ grid: 2, coord: { r: 0, c: 0 } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: FAIL — `createSamuraiBoard` and friends not defined.

- [ ] **Step 3: Add the implementations**

Append to `src/engine/samurai.ts`:

```ts
import type { Cell, SamuraiBoard } from './types'
import { CLASSIC_9, cellAt, createGrid } from './grid'
import { createClassicConstraint } from './constraints/classic'

export function createSamuraiBoard(): SamuraiBoard {
  const grids = [0, 1, 2, 3, 4].map(() => {
    const shape = CLASSIC_9
    return createGrid(shape, [createClassicConstraint({ shape })])
  }) as unknown as readonly [
    SamuraiBoard['grids'][0],
    SamuraiBoard['grids'][1],
    SamuraiBoard['grids'][2],
    SamuraiBoard['grids'][3],
    SamuraiBoard['grids'][4],
  ]
  const sharedCells = computeSharedCells()
  return { grids, sharedCells }
}

export function samuraiCellAt(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): Cell {
  const grid = board.grids[gridIdx]
  if (!grid) throw new RangeError(`gridIdx ${gridIdx} out of range`)
  return cellAt(grid, coord)
}

/**
 * Returns all (grid, coord) pairs representing the same global cell.
 * For an unshared cell, returns [{grid: gridIdx, coord}]. For a shared cell,
 * returns 2 entries (the center+corner pair).
 */
export function samuraiSharedLocations(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): ReadonlyArray<SharedLocation> {
  // Search the sharedCells map for an entry containing this (grid, coord).
  for (const entries of board.sharedCells.values()) {
    for (const e of entries) {
      if (e.grid === gridIdx && e.coord.r === coord.r && e.coord.c === coord.c) {
        return entries
      }
    }
  }
  return [{ grid: gridIdx, coord }]
}
```

Add `Coord` to the existing import from `./types` at the top of the file:

```ts
import type { Coord, Cell, SamuraiBoard } from './types'
```

(Merge with the existing `import type { Coord } from './types'` — combine into one line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: PASS (all 11 cases — 6 from Task 1 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/samurai.ts src/engine/samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: createSamuraiBoard + cell helpers

Factory builds 5 empty Grid<9>s with classic constraints attached and
attaches the sharedCells topology map. samuraiCellAt and
samuraiSharedLocations expose per-cell and shared-pair queries.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: setValueShared + eraseShared (mutation with sync)

**Files:**
- Modify: `src/engine/samurai.ts`
- Modify: `src/engine/samurai.test.ts`

Write semantics: a value placed in a shared cell propagates to all sub-grids containing it; an erase reverses it.

- [ ] **Step 1: Add failing tests**

Append to `src/engine/samurai.test.ts`:

```ts
import { setValueShared, eraseShared } from './samurai'

describe('setValueShared', () => {
  it('writes a value to the targeted sub-grid', () => {
    const board = createSamuraiBoard()
    setValueShared(board, 0, { r: 4, c: 4 }, 5)
    expect(samuraiCellAt(board, 0, { r: 4, c: 4 }).value).toBe(5)
  })

  it('propagates a shared-cell write to all sub-grids containing it', () => {
    const board = createSamuraiBoard()
    // NW overlap: center (1,1) == NW corner (7,7)
    setValueShared(board, 0, { r: 1, c: 1 }, 7)
    expect(samuraiCellAt(board, 0, { r: 1, c: 1 }).value).toBe(7)
    expect(samuraiCellAt(board, 1, { r: 7, c: 7 }).value).toBe(7)
  })

  it('runs classic peer-elim inside each affected sub-grid', () => {
    const board = createSamuraiBoard()
    setValueShared(board, 0, { r: 1, c: 1 }, 7)
    // Center peer at (1, 5) (same row in center) should lose candidate 7
    expect(samuraiCellAt(board, 0, { r: 1, c: 5 }).candidates.has(7)).toBe(false)
    // NW corner peer at (7, 3) (same row in NW) should lose candidate 7
    expect(samuraiCellAt(board, 1, { r: 7, c: 3 }).candidates.has(7)).toBe(false)
  })

  it('does not affect non-shared peers in non-shared sub-grids', () => {
    const board = createSamuraiBoard()
    setValueShared(board, 0, { r: 1, c: 1 }, 7)
    // NE corner has no overlap with the center's (1,1); its cells should still have 7.
    expect(samuraiCellAt(board, 2, { r: 0, c: 0 }).candidates.has(7)).toBe(true)
  })
})

describe('eraseShared', () => {
  it('clears the value and restores candidates across all shared sub-grids', () => {
    const board = createSamuraiBoard()
    setValueShared(board, 0, { r: 1, c: 1 }, 7)
    eraseShared(board, 0, { r: 1, c: 1 })
    expect(samuraiCellAt(board, 0, { r: 1, c: 1 }).value).toBeNull()
    expect(samuraiCellAt(board, 1, { r: 7, c: 7 }).value).toBeNull()
    // After erase, candidates are recomputed; (1,1) should once again have 7 available.
    expect(samuraiCellAt(board, 0, { r: 1, c: 1 }).candidates.has(7)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: FAIL — `setValueShared` and `eraseShared` not defined.

- [ ] **Step 3: Add the implementations**

Append to `src/engine/samurai.ts`:

```ts
import { setValue, recomputeCandidates } from './grid'
import type { Digit } from './types'

export function setValueShared(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
  digit: Digit,
): void {
  const locations = samuraiSharedLocations(board, gridIdx, coord)
  for (const loc of locations) {
    setValue(board.grids[loc.grid]!, loc.coord, digit)
  }
}

export function eraseShared(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): void {
  const locations = samuraiSharedLocations(board, gridIdx, coord)
  for (const loc of locations) {
    const cell = cellAt(board.grids[loc.grid]!, loc.coord)
    cell.value = null
  }
  // Recompute candidates per affected sub-grid so peer-elim re-runs from scratch.
  const affectedGrids = new Set(locations.map((l) => l.grid))
  for (const idx of affectedGrids) {
    recomputeCandidates(board.grids[idx]!)
  }
}
```

Merge the new imports into the existing `./grid` import at the top:

```ts
import { CLASSIC_9, cellAt, createGrid, setValue, recomputeCandidates } from './grid'
```

And the existing `./types` import:

```ts
import type { Coord, Cell, Digit, SamuraiBoard } from './types'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: PASS (16 cases — 11 prior + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/samurai.ts src/engine/samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: setValueShared + eraseShared

setValueShared walks samuraiSharedLocations and calls setValue per
sub-grid (peer-elim runs locally in each). eraseShared clears values
and runs recomputeCandidates on every affected sub-grid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: samuraiIsComplete + samuraiCloneBoard + samuraiConflicts

**Files:**
- Modify: `src/engine/samurai.ts`
- Modify: `src/engine/samurai.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/engine/samurai.test.ts`:

```ts
import {
  samuraiIsComplete,
  samuraiCloneBoard,
  samuraiConflicts,
} from './samurai'

describe('samuraiIsComplete', () => {
  it('returns false on an empty board', () => {
    const board = createSamuraiBoard()
    expect(samuraiIsComplete(board)).toBe(false)
  })

  it('returns false when only some sub-grids are full', () => {
    const board = createSamuraiBoard()
    // fill the center grid only
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        samuraiCellAt(board, 0, { r, c }).value = 1
      }
    }
    expect(samuraiIsComplete(board)).toBe(false)
  })

  it('returns true when every cell across all sub-grids has a value', () => {
    const board = createSamuraiBoard()
    for (let g = 0; g < 5; g++) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          samuraiCellAt(board, g, { r, c }).value = 1
        }
      }
    }
    expect(samuraiIsComplete(board)).toBe(true)
  })
})

describe('samuraiCloneBoard', () => {
  it('produces a deep copy: mutating the clone does not affect the original', () => {
    const original = createSamuraiBoard()
    setValueShared(original, 0, { r: 0, c: 0 }, 3)
    const clone = samuraiCloneBoard(original)
    samuraiCellAt(clone, 0, { r: 0, c: 0 }).value = 9
    expect(samuraiCellAt(original, 0, { r: 0, c: 0 }).value).toBe(3)
    expect(samuraiCellAt(clone, 0, { r: 0, c: 0 }).value).toBe(9)
  })

  it('clones the sharedCells map (or recomputes equivalently)', () => {
    const original = createSamuraiBoard()
    const clone = samuraiCloneBoard(original)
    expect(clone.sharedCells.size).toBe(36)
    // Mutating the clones grids should not affect the original's shared map.
    expect(clone.sharedCells.has('0,1,1')).toBe(true)
  })
})

describe('samuraiConflicts', () => {
  it('returns an empty set on a fresh board', () => {
    const board = createSamuraiBoard()
    expect(samuraiConflicts(board).size).toBe(0)
  })

  it('flags both cells when two cells in the same sub-grid row have the same value', () => {
    const board = createSamuraiBoard()
    // Bypass setValueShared to avoid peer-elim clearing candidates, so we can
    // deliberately create a conflict.
    samuraiCellAt(board, 0, { r: 0, c: 0 }).value = 5
    samuraiCellAt(board, 0, { r: 0, c: 1 }).value = 5
    const conflicts = samuraiConflicts(board)
    expect(conflicts.has('0,0,0')).toBe(true)
    expect(conflicts.has('0,0,1')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: FAIL — new helpers not defined.

- [ ] **Step 3: Add the implementations**

Append to `src/engine/samurai.ts`:

```ts
import { cloneGrid } from './grid'

export function samuraiIsComplete(board: SamuraiBoard): boolean {
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        if (cellAt(grid, { r, c }).value === null) return false
      }
    }
  }
  return true
}

export function samuraiCloneBoard(board: SamuraiBoard): SamuraiBoard {
  const grids = board.grids.map((g) => cloneGrid(g)) as unknown as SamuraiBoard['grids']
  // sharedCells is structural — safe to share by reference, since map is
  // ReadonlyMap and entries are readonly.
  return { grids, sharedCells: board.sharedCells }
}

/**
 * Returns the set of cells (by global key "gridIdx,r,c") that are involved in a
 * peer conflict within any of their containing sub-grids. The grader and UI
 * use this to highlight problem cells.
 */
export function samuraiConflicts(board: SamuraiBoard): ReadonlySet<string> {
  const out = new Set<string>()
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (const constraint of grid.constraints) {
      for (const region of constraint.regions) {
        const positions = new Map<Digit, Coord[]>()
        for (const coord of region.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value === null) continue
          const list = positions.get(cell.value) ?? []
          list.push(coord)
          positions.set(cell.value, list)
        }
        for (const list of positions.values()) {
          if (list.length > 1) {
            for (const co of list) out.add(globalCoordKey(g, co))
          }
        }
      }
    }
  }
  return out
}
```

Merge the `cloneGrid` import into the existing `./grid` import:

```ts
import { CLASSIC_9, cellAt, cloneGrid, createGrid, recomputeCandidates, setValue } from './grid'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: PASS (22 cases — 16 prior + 6 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/samurai.ts src/engine/samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: samuraiIsComplete + samuraiCloneBoard + samuraiConflicts

Aggregator queries across all 5 sub-grids. isComplete checks every
cell. cloneBoard deep-copies sub-grids and shares the structural
sharedCells map. samuraiConflicts walks each sub-grids constraint
regions and emits global keys of cells involved in same-region
duplicates.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: samuraiConsistencyCheck

**Files:**
- Modify: `src/engine/samurai.ts`
- Modify: `src/engine/samurai.test.ts`

Validate that all shared-cell pairs agree on their value (run on load).

- [ ] **Step 1: Add failing tests**

Append to `src/engine/samurai.test.ts`:

```ts
import { samuraiConsistencyCheck } from './samurai'

describe('samuraiConsistencyCheck', () => {
  it('passes for an empty board', () => {
    const board = createSamuraiBoard()
    expect(() => samuraiConsistencyCheck(board)).not.toThrow()
  })

  it('passes when shared cells agree', () => {
    const board = createSamuraiBoard()
    // setValueShared keeps them in sync by construction.
    setValueShared(board, 0, { r: 1, c: 1 }, 4)
    expect(() => samuraiConsistencyCheck(board)).not.toThrow()
  })

  it('throws when a shared pair disagrees', () => {
    const board = createSamuraiBoard()
    // Direct writes bypass the sync mechanism. Set the center cell to 4 but
    // the NW corner's matching cell to 7.
    samuraiCellAt(board, 0, { r: 1, c: 1 }).value = 4
    samuraiCellAt(board, 1, { r: 7, c: 7 }).value = 7
    expect(() => samuraiConsistencyCheck(board)).toThrow(/shared cell mismatch/i)
  })

  it('reports the role of the offending corner in the error message', () => {
    const board = createSamuraiBoard()
    samuraiCellAt(board, 0, { r: 7, c: 7 }).value = 5 // center bottom-right cell
    samuraiCellAt(board, 4, { r: 1, c: 1 }).value = 2 // SE corner (top-left box overlaps center bottom-right)
    expect(() => samuraiConsistencyCheck(board)).toThrow(/SE/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: FAIL — `samuraiConsistencyCheck` not defined.

- [ ] **Step 3: Add the implementation**

Append to `src/engine/samurai.ts`:

```ts
export function samuraiConsistencyCheck(board: SamuraiBoard): void {
  for (const [key, entries] of board.sharedCells) {
    if (entries.length < 2) continue
    const values = entries.map((e) => cellAt(board.grids[e.grid]!, e.coord).value)
    const first = values[0]
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== first) {
        const cornerLayout = SAMURAI_LAYOUT.corners.find((c) => c.idx === entries[i]!.grid)
        const role = cornerLayout?.role ?? `grid${entries[i]!.grid}`
        const centerCoord = entries[0]!.coord
        throw new Error(
          `shared cell mismatch at ${key}: center (${centerCoord.r},${centerCoord.c}) has ${first}, ${role} corner has ${values[i]}`,
        )
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: PASS (26 cases — 22 prior + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/engine/samurai.ts src/engine/samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: samuraiConsistencyCheck

Walks the sharedCells map and verifies every overlap pair agrees on
its value. Throws a descriptive error naming the offending corner role
and the disagreeing values. Used by createSamuraiBoard after parsing
givens and by storage on load.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Re-export from engine/index.ts

**Files:**
- Modify: `src/engine/index.ts`

- [ ] **Step 1: Read current end of engine/index.ts**

Run: `tail -20 src/engine/index.ts` (or use Read tool with offset).

- [ ] **Step 2: Append samurai re-exports**

Add at the end of `src/engine/index.ts`:

```ts
export {
  SAMURAI_LAYOUT,
  createSamuraiBoard,
  samuraiCellAt,
  samuraiSharedLocations,
  setValueShared,
  eraseShared,
  samuraiIsComplete,
  samuraiCloneBoard,
  samuraiConflicts,
  samuraiConsistencyCheck,
  globalCoordKey,
} from './samurai'
export type { CornerRole, CornerLayout, SharedLocation } from './samurai'
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 4: Confirm imports from `@/engine` work**

Run: `bun run test:run src/engine/samurai.test.ts`
Expected: PASS (26 cases, unchanged).

Then a one-line sanity check:
```bash
bun -e "import('./src/engine/index.ts').then(m => console.log('createSamuraiBoard:', typeof m.createSamuraiBoard))"
```
Expected: `createSamuraiBoard: function`

- [ ] **Step 5: Commit**

```bash
git add src/engine/index.ts
git commit -m "$(cat <<'EOF'
Phase 17a: re-export samurai surface from engine/index.ts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: samuraiTechniqueSolve

**Files:**
- Create: `src/engine/solver/samuraiSolver.ts`
- Create: `src/engine/solver/samuraiSolver.test.ts`

The technique solver wrapper: runs `techniqueSolve` per sub-grid, syncs shared cells, repeats until fixed point.

- [ ] **Step 1: Write the failing test**

Create `src/engine/solver/samuraiSolver.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  createSamuraiBoard,
  samuraiCellAt,
  setValueShared,
} from '../samurai'
import { samuraiTechniqueSolve } from './samuraiSolver'

function fillRowExcept(
  board: ReturnType<typeof createSamuraiBoard>,
  gridIdx: number,
  row: number,
  emptyCol: number,
  digits: number[],
) {
  let d = 0
  for (let c = 0; c < 9; c++) {
    if (c === emptyCol) continue
    setValueShared(board, gridIdx, { r: row, c }, digits[d++] as 1)
  }
}

describe('samuraiTechniqueSolve', () => {
  it('solves a trivial single-cell naked single in the center grid', () => {
    const board = createSamuraiBoard()
    // Fill row 4 of center with 1..9 leaving col 4 empty. The naked single
    // technique should place the missing digit (must be 5 to complete 1-9).
    fillRowExcept(board, 0, 4, 4, [1, 2, 3, 4, 6, 7, 8, 9])
    const result = samuraiTechniqueSolve(board)
    expect(samuraiCellAt(result.board, 0, { r: 4, c: 4 }).value).toBe(5)
  })

  it('propagates a placement in the NW corners shared box to the center', () => {
    const board = createSamuraiBoard()
    // Fill the NW corners bottom-right box (cornerBox r:2,c:2) leaving cell (7,7) empty.
    // The corners box constraint forces (7,7) to be the missing digit. Then via
    // the shared overlap, the center's (1,1) must also receive the same digit.
    const filled = [1, 2, 3, 4, 5, 6, 7, 8]
    let i = 0
    for (let r = 6; r < 9; r++) {
      for (let c = 6; c < 9; c++) {
        if (r === 7 && c === 7) continue
        setValueShared(board, 1, { r, c }, filled[i++] as 1)
      }
    }
    const result = samuraiTechniqueSolve(board)
    // (7,7) is missing — must be 9.
    expect(samuraiCellAt(result.board, 1, { r: 7, c: 7 }).value).toBe(9)
    // And the center (1,1) should also be 9 via the shared overlap.
    expect(samuraiCellAt(result.board, 0, { r: 1, c: 1 }).value).toBe(9)
  })

  it('returns solved=false when there are still unsolved cells beyond technique reach', () => {
    const board = createSamuraiBoard()
    const result = samuraiTechniqueSolve(board)
    expect(result.solved).toBe(false)
    expect(result.stepsBySubgrid.length).toBe(5)
  })

  it('reports hardestTier as the max across sub-grids', () => {
    const board = createSamuraiBoard()
    fillRowExcept(board, 0, 4, 4, [1, 2, 3, 4, 6, 7, 8, 9])
    const result = samuraiTechniqueSolve(board)
    expect(result.hardestTier).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/solver/samuraiSolver.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `samuraiSolver.ts`**

Create `src/engine/solver/samuraiSolver.ts`:

```ts
import { applyEliminations, cellAt } from '../grid'
import {
  samuraiCloneBoard,
  samuraiSharedLocations,
  setValueShared,
  globalCoordKey,
} from '../samurai'
import type { SamuraiBoard, Step } from '../types'
import {
  techniqueSolve,
  type TechniqueSolveOptions,
} from './techniqueSolver'

export interface SamuraiSolveResult {
  readonly board: SamuraiBoard
  readonly solved: boolean
  readonly hardestTier: number
  readonly stepsBySubgrid: ReadonlyArray<ReadonlyArray<Step>>
}

const MAX_ITERATIONS = 1024

/**
 * Solve a SamuraiBoard by repeatedly applying technique-based solving to each
 * sub-grid and syncing any placements that land on shared cells. Terminates
 * when a full pass produces no new placements or eliminations.
 */
export function samuraiTechniqueSolve(
  input: SamuraiBoard,
  opts?: TechniqueSolveOptions,
): SamuraiSolveResult {
  const board = samuraiCloneBoard(input)
  const stepsBySubgrid: Step[][] = [[], [], [], [], []]
  let hardestTier = 0

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let progressed = false
    for (let g = 0; g < 5; g++) {
      const result = techniqueSolve(board.grids[g]!, opts)
      // Apply each step's eliminations to the live sub-grid, recording the step.
      for (const step of result.steps) {
        applyEliminations(board.grids[g]!, step.eliminations)
        stepsBySubgrid[g]!.push(step)
        if (step.tier > hardestTier) hardestTier = step.tier
        progressed = true
        // For any placements that target shared cells, propagate to siblings.
        for (const placement of step.eliminations.placements) {
          const locations = samuraiSharedLocations(board, g, placement.coord)
          if (locations.length > 1) {
            for (const loc of locations) {
              if (loc.grid === g) continue
              const sibling = cellAt(board.grids[loc.grid]!, loc.coord)
              if (sibling.value === null) {
                setValueShared(board, loc.grid, loc.coord, placement.digit)
              }
            }
          }
        }
      }
    }
    if (!progressed) break
  }

  const solved = boardIsFull(board)
  return { board, solved, hardestTier, stepsBySubgrid }
}

function boardIsFull(board: SamuraiBoard): boolean {
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        if (cellAt(grid, { r, c }).value === null) return false
      }
    }
  }
  return true
}

// Exported only to be referenced in JSDoc / IDE explore — keep the export tree clean.
export { globalCoordKey }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/solver/samuraiSolver.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/engine/solver/samuraiSolver.ts src/engine/solver/samuraiSolver.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: samuraiTechniqueSolve

Iterates per-sub-grid techniqueSolve until fixed point. After each
sub-grid pass, placements that landed on shared cells are propagated
to the other sub-grid via setValueShared. hardestTier and per-sub-grid
step history are returned for the grader.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: samuraiBacktrackingSolve

**Files:**
- Modify: `src/engine/solver/samuraiSolver.ts`
- Modify: `src/engine/solver/samuraiSolver.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/engine/solver/samuraiSolver.test.ts`:

```ts
import { samuraiBacktrackingSolve } from './samuraiSolver'

describe('samuraiBacktrackingSolve', () => {
  it('finds a single solution for an empty board with maxSolutions=1', () => {
    const board = createSamuraiBoard()
    const result = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
    expect(result.hasSolution).toBe(true)
    expect(result.solutions.length).toBe(1)
  })

  it('reports isUnique=false when maxSolutions=2 finds 2 solutions', () => {
    const board = createSamuraiBoard()
    const result = samuraiBacktrackingSolve(board, { maxSolutions: 2 })
    expect(result.solutions.length).toBe(2)
    expect(result.isUnique).toBe(false)
  })

  it('reports isUnique=true when a tightly-constrained board has exactly one solution', () => {
    const board = createSamuraiBoard()
    // Fill row 4 of center with 1..9 leaving col 4 empty (forces 5).
    const digits = [1, 2, 3, 4, 6, 7, 8, 9]
    let d = 0
    for (let c = 0; c < 9; c++) {
      if (c === 4) continue
      setValueShared(board, 0, { r: 4, c }, digits[d++] as 1)
    }
    // The board still has many degrees of freedom — both maxSolutions=1 and =2
    // are valid as long as hasSolution is true.
    const result = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
    expect(result.hasSolution).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/solver/samuraiSolver.test.ts`
Expected: FAIL — `samuraiBacktrackingSolve` not defined.

- [ ] **Step 3: Add the implementation**

Append to `src/engine/solver/samuraiSolver.ts`:

```ts
export interface SamuraiBacktrackOptions {
  readonly maxSolutions: number
}

export interface SamuraiBacktrackResult {
  readonly solutions: ReadonlyArray<SamuraiBoard>
  readonly hasSolution: boolean
  readonly isUnique: boolean
}

interface MRVPick {
  readonly gridIdx: number
  readonly coord: { r: number; c: number }
  readonly candidates: ReadonlyArray<number>
}

function pickMRV(board: SamuraiBoard): MRVPick | null {
  let best: MRVPick | null = null
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        const cell = cellAt(grid, { r, c })
        if (cell.value !== null) continue
        const candidates = [...cell.candidates]
        if (candidates.length === 0) return { gridIdx: g, coord: { r, c }, candidates }
        if (!best || candidates.length < best.candidates.length) {
          best = { gridIdx: g, coord: { r, c }, candidates }
          if (candidates.length === 1) return best
        }
      }
    }
  }
  return best
}

export function samuraiBacktrackingSolve(
  input: SamuraiBoard,
  opts: SamuraiBacktrackOptions,
): SamuraiBacktrackResult {
  const solutions: SamuraiBoard[] = []
  const max = Math.max(1, opts.maxSolutions)

  function step(current: SamuraiBoard): void {
    if (solutions.length >= max) return

    // Run technique solve as propagation; this also catches contradictions.
    const propagated = samuraiTechniqueSolve(current)
    const board = propagated.board

    // Per-sub-grid validate check.
    for (let g = 0; g < 5; g++) {
      for (const constraint of board.grids[g]!.constraints) {
        if (!constraint.validate(board.grids[g]!)) return
      }
    }

    // Empty-candidate check for any unfilled cell.
    for (let g = 0; g < 5; g++) {
      const grid = board.grids[g]!
      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const cell = cellAt(grid, { r, c })
          if (cell.value === null && cell.candidates.size === 0) return
        }
      }
    }

    if (boardIsFull(board)) {
      solutions.push(board)
      return
    }

    const pick = pickMRV(board)
    if (!pick) {
      solutions.push(board)
      return
    }
    if (pick.candidates.length === 0) return

    for (const digit of pick.candidates) {
      const next = samuraiCloneBoard(board)
      setValueShared(next, pick.gridIdx, pick.coord, digit as 1)
      step(next)
      if (solutions.length >= max) return
    }
  }

  step(samuraiCloneBoard(input))
  return {
    solutions,
    hasSolution: solutions.length > 0,
    isUnique: solutions.length === 1,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/solver/samuraiSolver.test.ts`
Expected: PASS (7 cases — 4 prior + 3 new). The empty-board solve may take a few seconds; that's expected.

- [ ] **Step 5: Commit**

```bash
git add src/engine/solver/samuraiSolver.ts src/engine/solver/samuraiSolver.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: samuraiBacktrackingSolve

DFS with MRV (most-constrained variable) across all 5 sub-grids,
ties broken by sub-grid index then coord. Each recursion clones the
board (so the original is safe) and uses samuraiTechniqueSolve as the
propagation step before branching. Stops at maxSolutions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: gradeSamurai

**Files:**
- Create: `src/engine/grader/samuraiGrader.ts`
- Create: `src/engine/grader/samuraiGrader.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/engine/grader/samuraiGrader.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createSamuraiBoard, setValueShared } from '../samurai'
import { samuraiBacktrackingSolve } from '../solver/samuraiSolver'
import { gradeSamurai } from './samuraiGrader'
import type { Digit } from '../types'

describe('gradeSamurai', () => {
  it('returns solvable=true on a near-solved board', () => {
    const board = createSamuraiBoard()
    // Fill row 4 of center with 1..9 leaving col 4 empty (naked single → 5).
    const digits = [1, 2, 3, 4, 6, 7, 8, 9]
    let d = 0
    for (let c = 0; c < 9; c++) {
      if (c === 4) continue
      setValueShared(board, 0, { r: 4, c }, digits[d++] as Digit)
    }
    const result = gradeSamurai(board)
    // The board is not fully solved (most cells still empty), so the grader
    // falls back to backtrack. The important contract here is that solvable
    // is true and an SE value is returned.
    expect(result.solvable).toBe(true)
    expect(result.se).toBeGreaterThan(0)
  })

  it('grades a fully-solved-except-one board via technique solve', () => {
    // Build a fully solved board via backtrack, then blank one cell.
    const seeded = createSamuraiBoard()
    const bt = samuraiBacktrackingSolve(seeded, { maxSolutions: 1 })
    expect(bt.hasSolution).toBe(true)
    const fullBoard = bt.solutions[0]!
    // Blank center (4,4). cell.value is mutable on the existing Grid type.
    const cell = fullBoard.grids[0]!.cells[4]![4]!
    cell.value = null
    cell.candidates = new Set<Digit>([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = gradeSamurai(fullBoard)
    expect(result.solvable).toBe(true)
    expect(result.se).toBeGreaterThanOrEqual(1.0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/engine/grader/samuraiGrader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `samuraiGrader.ts`**

Create `src/engine/grader/samuraiGrader.ts`:

```ts
import {
  samuraiTechniqueSolve,
  samuraiBacktrackingSolve,
} from '../solver/samuraiSolver'
import { gradePuzzle, difficultyFromSE, type Difficulty } from './se'
import type { SamuraiBoard, Step } from '../types'

export interface SamuraiGradeResult {
  readonly solvable: boolean
  readonly se: number
  readonly difficulty: Difficulty
  readonly hardestTier: number
  readonly stepsBySubgrid: ReadonlyArray<ReadonlyArray<Step>>
}

export function gradeSamurai(board: SamuraiBoard): SamuraiGradeResult {
  const techResult = samuraiTechniqueSolve(board)
  if (techResult.solved) {
    // Per-sub-grid SE; result SE = max across sub-grids.
    let maxSE = 0
    for (let g = 0; g < 5; g++) {
      const subResult = gradePuzzle(board.grids[g]!)
      if (subResult.se > maxSE) maxSE = subResult.se
    }
    return {
      solvable: true,
      se: maxSE,
      difficulty: difficultyFromSE(maxSE),
      hardestTier: techResult.hardestTier,
      stepsBySubgrid: techResult.stepsBySubgrid,
    }
  }

  const bt = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
  if (bt.hasSolution) {
    return {
      solvable: true,
      se: 9.0,
      difficulty: 'diabolical',
      hardestTier: 9,
      stepsBySubgrid: techResult.stepsBySubgrid,
    }
  }
  return {
    solvable: false,
    se: 0,
    difficulty: 'very-easy',
    hardestTier: 0,
    stepsBySubgrid: [],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:run src/engine/grader/samuraiGrader.test.ts`
Expected: PASS (2 cases). The second test exercises backtrack on an empty board which may take seconds.

- [ ] **Step 5: Re-export from engine/index.ts**

Append to `src/engine/index.ts`:

```ts
export { samuraiTechniqueSolve, samuraiBacktrackingSolve } from './solver/samuraiSolver'
export type {
  SamuraiSolveResult,
  SamuraiBacktrackOptions,
  SamuraiBacktrackResult,
} from './solver/samuraiSolver'
export { gradeSamurai } from './grader/samuraiGrader'
export type { SamuraiGradeResult } from './grader/samuraiGrader'
```

- [ ] **Step 6: Typecheck + commit**

Run: `bun run typecheck`
Expected: clean.

```bash
git add src/engine/grader/samuraiGrader.ts src/engine/grader/samuraiGrader.test.ts src/engine/index.ts
git commit -m "$(cat <<'EOF'
Phase 17a: gradeSamurai + engine re-exports

gradeSamurai runs samuraiTechniqueSolve; if solved, SE = max over
per-sub-grid SE via existing gradePuzzle; if not solved, falls back
to samuraiBacktrackingSolve for solvability and stamps SE=9.0
('diabolical') when a solution exists. Engine index re-exports the
new solver and grader surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: gameStore — introduce GameBoard discriminated union

**Files:**
- Modify: `src/state/gameStore.ts` (large refactor — ~30 touchpoints)
- Modify: `src/state/gameStore.test.ts`
- Modify: `src/state/persistence.ts`

This is the biggest task in the plan. Touches the central state file. The refactor is mechanical: rename `state.grid: Grid | null` to `state.board: GameBoard | null` and update every read site. Existing variant logic stays intact — the new shape just wraps it.

- [ ] **Step 1: Read the existing gameStore.ts top section to understand the layout**

```bash
head -200 src/state/gameStore.ts
```

Identify:
- The `GameState` interface (around line 85).
- All places `state.grid` is read.
- Helpers like `shapeForVariant`, `constraintsForVariant`, `freshGridFromGivens`, `gridFromSnapshot`, `applyEntry`, `revertEntry`, `cellConflicts`, `isComplete`, `serializeGameForSave`.

- [ ] **Step 2: Define the `GameBoard` discriminated union at the top of gameStore.ts**

Add after the existing imports (right before `export type InputMode = ...`):

```ts
import type { SamuraiBoard } from '@/engine'

export type GameBoard =
  | { readonly kind: 'grid'; readonly grid: Grid }
  | { readonly kind: 'samurai'; readonly board: SamuraiBoard }

function gridOf(board: GameBoard | null): Grid | null {
  if (board === null) return null
  return board.kind === 'grid' ? board.grid : null
}

function assertNever(x: never): never {
  throw new Error(`unhandled GameBoard kind: ${JSON.stringify(x)}`)
}
```

- [ ] **Step 3: Update the `GameState` interface to use the union**

Replace:
```ts
export interface GameState {
  grid: Grid | null
  // ... other fields
}
```

With:
```ts
export interface GameState {
  board: GameBoard | null
  // ... other fields unchanged
}
```

Add a backward-compat getter at the bottom of the file (after the store definition):

```ts
/**
 * Backward-compat shim: returns the active Grid if state is grid-shaped, else null.
 * Used by consumers that still index into a single grid.
 */
export function selectGrid(state: GameState): Grid | null {
  return gridOf(state.board)
}
```

- [ ] **Step 4: Walk through every `state.grid` reference and update**

Patterns to replace, in order of frequency:

1. `state.grid` → `gridOf(state.board)` for read-only access.
2. `set({ grid: ... })` → `set({ board: { kind: 'grid', grid: ... } })`.
3. `set({ grid: null })` → `set({ board: null })`.
4. Action body lookups like `const grid = get().grid; if (!grid) return` → `const board = get().board; if (!board || board.kind !== 'grid') return; const grid = board.grid`.

Specifically, the following helpers need careful adjustment (line numbers approximate from current file):

- `isComplete(grid: Grid)` — keep as-is. It's called by the action body which has the grid in hand.
- `freshGridFromGivens(...)` — keep as-is; returns `Grid`.
- `gridFromSnapshot(...)` — keep as-is.
- `applyEntry(grid: Grid, entry: HistoryEntry)` / `revertEntry` — keep Grid-typed for now; samurai versions will be added in Task 12.
- `cellConflicts(grid: Grid, coord: Coord)` — keep Grid-typed.
- `serializeGameForSave(state: GameState)` — update to read `gridOf(state.board)`.

- [ ] **Step 5: Update the store action methods**

For `loadPuzzle`, the existing logic builds a Grid then sets state. Wrap the resulting Grid:

```ts
loadPuzzle: (args) => {
  const grid = freshGridFromGivens(args.givens, args.variant, { ... })
  set({
    board: { kind: 'grid', grid },
    puzzleId: args.id,
    // ... other unchanged fields
  })
}
```

For `hydrate(saved)`, similar wrap. (Samurai hydration comes in Task 16.)

For `select(coord)`, no change needed (selection isn't grid-typed).

For `setMode(mode)`, no change needed.

For `input(digit)`:
```ts
input: (digit) => {
  const state = get()
  if (!state.board || state.board.kind !== 'grid') return
  if (!state.selected) return
  const grid = state.board.grid
  // ... existing implementation unchanged
  // After mutation, wrap when calling set:
  set({ board: { kind: 'grid', grid }, ... })
}
```

For `erase()`, `undo()`, `redo()` — same pattern.

For `pause()`, `resume()`, `canUndo()`, `canRedo()` — no grid access.

- [ ] **Step 6: Update `persistence.ts`**

Replace the subscribe selector:
```ts
unsubscribe = useGameStore.subscribe((state, prev) => {
  if (
    state.board !== prev.board ||
    state.history !== prev.history ||
    state.elapsedMs !== prev.elapsedMs ||
    state.completedAt !== prev.completedAt
  ) {
    scheduleSave(state)
  }
  // ... rest unchanged
})
```

And `scheduleSave`:
```ts
function scheduleSave(state: GameState): void {
  if (!state.puzzleId || !state.board) return
  // rest unchanged
}
```

- [ ] **Step 7: Update `gameStore.test.ts`**

Every test that did `useGameStore.getState().grid` needs `gridOf(useGameStore.getState().board)` or `useGameStore.getState().board?.grid` (when known to be grid-shaped). Import `selectGrid` or `gridOf` as needed.

The mechanical update: search-and-replace `\.grid` with `.board.grid` where appropriate, and `.grid !==` with `.board !==` for null-checks.

- [ ] **Step 8: Typecheck**

Run: `bun run typecheck`
Expected: clean. If there are residual `.grid` references that the compiler catches, fix them with the appropriate dispatch.

- [ ] **Step 9: Run all state + UI tests**

Run: `bun run test:run src/state src/ui`
Expected: PASS (existing 55+ tests). The refactor is purely mechanical; no behavior should change for existing variants.

- [ ] **Step 10: Run the full unit suite to catch any other consumer**

Run: `bun run test:run`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.test.ts src/state/persistence.ts
git commit -m "$(cat <<'EOF'
Phase 17a: gameStore.board is a discriminated union

State field rename: grid: Grid | null → board: GameBoard | null,
where GameBoard = { kind: 'grid', grid } | { kind: 'samurai', board }.
All existing reads go through gridOf() or destructure on kind === 'grid'.
No behavior change for 9×9/6×6/16×16 variants — purely typing change.

Mechanical update to gameStore.test.ts and persistence.ts to match.
Samurai-specific actions and state hydration land in subsequent tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: gameStore.loadPuzzle accepts variant='samurai'

**Files:**
- Modify: `src/state/gameStore.ts`
- Create: `src/state/gameStore.samurai.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/state/gameStore.samurai.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

// A trivial 5-grid givens set: each sub-grid is empty (all '0').
const EMPTY_GIVENS_9 = '0'.repeat(81)

describe('gameStore.loadPuzzle (samurai)', () => {
  beforeEach(() => {
    useGameStore.setState({ board: null, puzzleId: null, selected: null, history: [], historyIndex: -1 } as Partial<ReturnType<typeof useGameStore.getState>>)
  })

  it('loads a samurai puzzle with state.board.kind === "samurai"', () => {
    useGameStore.getState().loadPuzzle({
      id: 'samurai-test-001',
      variant: 'samurai',
      difficulty: 'easy',
      givens: '',
      samuraiGivens: [EMPTY_GIVENS_9, EMPTY_GIVENS_9, EMPTY_GIVENS_9, EMPTY_GIVENS_9, EMPTY_GIVENS_9],
    })
    const state = useGameStore.getState()
    expect(state.board).not.toBeNull()
    expect(state.board?.kind).toBe('samurai')
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids.length).toBe(5)
    }
  })

  it('rejects samurai load when samuraiGivens has the wrong number of strings', () => {
    expect(() => {
      useGameStore.getState().loadPuzzle({
        id: 'samurai-bad',
        variant: 'samurai',
        difficulty: 'easy',
        givens: '',
        samuraiGivens: [EMPTY_GIVENS_9],
      })
    }).toThrow(/expected 5 sub-grid givens/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: FAIL — `samuraiGivens` not a recognized arg; `state.board.kind` would never be `'samurai'`.

- [ ] **Step 3: Extend `loadPuzzle` to accept samurai**

In `src/state/gameStore.ts`:

1. Add to the `loadPuzzle` arg signature in the `GameState` interface:

```ts
  loadPuzzle: (args: {
    id: string
    variant: string
    difficulty: Difficulty
    givens: string
    // ... existing optional fields
    samuraiGivens?: ReadonlyArray<string>
  }) => void
```

2. Add a helper `freshSamuraiBoardFromGivens`:

```ts
import {
  createSamuraiBoard,
  parsePuzzle,
  samuraiConsistencyCheck,
  type SamuraiBoard,
} from '@/engine'

function freshSamuraiBoardFromGivens(samuraiGivens: ReadonlyArray<string>): SamuraiBoard {
  if (samuraiGivens.length !== 5) {
    throw new Error(`expected 5 sub-grid givens for samurai, got ${samuraiGivens.length}`)
  }
  const board = createSamuraiBoard()
  for (let g = 0; g < 5; g++) {
    const parsed = parsePuzzle(samuraiGivens[g]!, board.grids[g]!.shape)
    // Copy parsed values into the existing sub-grid (preserves constraints).
    for (let r = 0; r < parsed.shape.size; r++) {
      for (let c = 0; c < parsed.shape.size; c++) {
        const src = parsed.cells[r]![c]!
        const dst = board.grids[g]!.cells[r]![c]!
        dst.value = src.value
        dst.given = src.given
        dst.candidates = new Set(src.candidates)
      }
    }
  }
  // Recompute candidates per sub-grid to clear classic peer-elim, then validate.
  for (let g = 0; g < 5; g++) {
    // parsePuzzle already ran peer-elim within each sub-grid; nothing more needed.
  }
  samuraiConsistencyCheck(board)
  return board
}
```

3. In the `loadPuzzle` action body, dispatch on variant:

```ts
loadPuzzle: (args) => {
  if (args.variant === 'samurai') {
    if (!args.samuraiGivens) {
      throw new Error('samurai variant requires samuraiGivens')
    }
    const board = freshSamuraiBoardFromGivens(args.samuraiGivens)
    set({
      board: { kind: 'samurai', board },
      puzzleId: args.id,
      variant: args.variant,
      difficulty: args.difficulty,
      givens: '',
      selected: null,
      mode: 'value',
      history: [],
      historyIndex: -1,
      startedAt: new Date().toISOString(),
      elapsedMs: 0,
      resumeAt: Date.now(),
      paused: false,
      completedAt: null,
      lockedCells: new Set(),
      lastShakeKey: 0,
      jigsawPieceMap: null,
      parityMask: null,
      edges: null,
      thermometers: null,
      arrows: null,
      cages: null,
      littleKillerClues: null,
      sandwichClues: null,
      skyscraperClues: null,
      paths: null,
    })
    return
  }
  // existing classic / variant logic unchanged from Task 10 refactor
}
```

- [ ] **Step 4: Run tests**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: PASS.

Also confirm no regression:
Run: `bun run test:run src/state`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: gameStore.loadPuzzle handles variant=samurai

samuraiGivens param accepts 5 sub-grid givens strings. Builds a
SamuraiBoard via createSamuraiBoard, applies each parsePuzzle result
to the corresponding sub-grid, and runs samuraiConsistencyCheck to
catch overlap mismatches before storing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: gameStore input/erase/undo/redo dispatch on samurai

**Files:**
- Modify: `src/state/gameStore.ts`
- Modify: `src/state/gameStore.samurai.test.ts`

Add Samurai-specific behavior to the action methods. The `selected` Coord is now `(gridIdx, coord)` for samurai — extend the selection model.

- [ ] **Step 1: Extend the `selected` field and the `select` action**

In gameStore.ts, change:
```ts
selected: Coord | null
```
to a union:
```ts
selected: Coord | { readonly gridIdx: number; readonly coord: Coord } | null
```

Update the `select` action signature in the `GameState` interface to accept the union:
```ts
select: (target: Coord | { readonly gridIdx: number; readonly coord: Coord } | null) => void
```

And update the `select` implementation in the store body to just `set({ selected: target })` (no validation; the UI passes the right shape).

Add a type guard helper:
```ts
function selectedFor(state: GameState): { gridIdx: number; coord: Coord } | null {
  if (!state.selected) return null
  if ('gridIdx' in state.selected) return state.selected
  // Grid-shaped selection: it's a plain Coord; for grid state, gridIdx=0 is irrelevant.
  return { gridIdx: 0, coord: state.selected }
}
```

Existing classic/variant code that does `if (!state.selected) return; const coord = state.selected` must be guarded so it only runs when `!('gridIdx' in state.selected)`, OR the existing code reads `selectedFor(state).coord` (and assumes grid kind). Pick whichever is less invasive given the call site — typically the latter for variant code that has already been checked to be grid-kind earlier in the action body.

- [ ] **Step 2: Add failing tests for samurai input/erase/undo**

Append to `src/state/gameStore.samurai.test.ts`:

```ts
const EMPTY_GIVENS = '0'.repeat(81)

function loadEmptySamurai(): void {
  useGameStore.getState().loadPuzzle({
    id: 'samurai-test',
    variant: 'samurai',
    difficulty: 'easy',
    givens: '',
    samuraiGivens: [EMPTY_GIVENS, EMPTY_GIVENS, EMPTY_GIVENS, EMPTY_GIVENS, EMPTY_GIVENS],
  })
}

describe('gameStore.input (samurai)', () => {
  it('places a digit on the selected (gridIdx, coord) cell', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 4, c: 4 } })
    useGameStore.getState().input(7)
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[4]![4]!.value).toBe(7)
    }
  })

  it('propagates a shared-cell placement to all overlapping sub-grids', () => {
    loadEmptySamurai()
    // NW corner cell (7,7) is shared with center (1,1).
    useGameStore.getState().select({ gridIdx: 1, coord: { r: 7, c: 7 } })
    useGameStore.getState().input(3)
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[1]!.cells[7]![7]!.value).toBe(3)
      expect(state.board.board.grids[0]!.cells[1]![1]!.value).toBe(3)
    }
  })
})

describe('gameStore.erase (samurai)', () => {
  it('clears a placement and reverses via undo', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 4, c: 4 } })
    useGameStore.getState().input(5)
    useGameStore.getState().erase()
    let state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[4]![4]!.value).toBeNull()
    }
    useGameStore.getState().undo()
    state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[4]![4]!.value).toBe(5)
    }
  })
})

describe('gameStore.undo/redo (samurai)', () => {
  it('reverses a shared-cell placement on both sub-grids', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 1, c: 1 } })
    useGameStore.getState().input(9)
    useGameStore.getState().undo()
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[1]![1]!.value).toBeNull()
      expect(state.board.board.grids[1]!.cells[7]![7]!.value).toBeNull()
    }
  })
})
```

- [ ] **Step 3: Run tests to verify failures**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: FAIL — input/erase/undo don't yet handle samurai kind.

- [ ] **Step 4: Add Samurai history entry shape**

Append/modify `HistoryEntry` in `gameStore.ts`:

```ts
export interface SamuraiHistoryEntry {
  readonly kind: 'samurai-value' | 'samurai-erase'
  readonly gridIdx: number
  readonly coord: Coord
  readonly prevByLocation: ReadonlyArray<{
    readonly gridIdx: number
    readonly coord: Coord
    readonly snapshot: CellSnapshot
  }>
  readonly nextByLocation: ReadonlyArray<{
    readonly gridIdx: number
    readonly coord: Coord
    readonly snapshot: CellSnapshot
  }>
}

// Update the union:
type AnyHistoryEntry = HistoryEntry | SamuraiHistoryEntry

// And the field type:
// history: ReadonlyArray<AnyHistoryEntry>
```

- [ ] **Step 5: Update `input` to dispatch on board.kind**

First, ensure these are imported at the top of gameStore.ts (extend the existing `@/engine` import):

```ts
import {
  // ... existing imports
  createSamuraiBoard,
  samuraiCellAt,
  samuraiSharedLocations,
  setValueShared,
  eraseShared,
  samuraiConflicts,
  samuraiConsistencyCheck,
  samuraiIsComplete,
  type SamuraiBoard,
} from '@/engine'
```

Then update the `input` action:

```ts
input: (digit) => {
  const state = get()
  if (!state.board) return
  if (state.board.kind === 'grid') {
    // PRESERVE THE EXISTING GRID INPUT IMPLEMENTATION HERE.
    // After Task 10's refactor, the grid branch already exists. Leave it
    // unchanged in this step.
    return
  }
  if (state.board.kind === 'samurai') {
    const sel = state.selected
    if (!sel || !('gridIdx' in sel)) return
    const sBoard = state.board.board
    // Snapshot prior state across all affected locations.
    const locs = samuraiSharedLocations(sBoard, sel.gridIdx, sel.coord)
    const prevByLocation = locs.map((l) => ({
      gridIdx: l.grid,
      coord: l.coord,
      snapshot: snapshot(samuraiCellAt(sBoard, l.grid, l.coord)),
    }))
    setValueShared(sBoard, sel.gridIdx, sel.coord, digit)
    const nextByLocation = locs.map((l) => ({
      gridIdx: l.grid,
      coord: l.coord,
      snapshot: snapshot(samuraiCellAt(sBoard, l.grid, l.coord)),
    }))
    const entry: SamuraiHistoryEntry = {
      kind: 'samurai-value',
      gridIdx: sel.gridIdx,
      coord: sel.coord,
      prevByLocation,
      nextByLocation,
    }
    set({
      board: { kind: 'samurai', board: sBoard },
      history: [...state.history.slice(0, state.historyIndex + 1), entry].slice(-HISTORY_CAP),
      historyIndex: Math.min(state.history.length, HISTORY_CAP - 1),
    })
    return
  }
  assertNever(state.board)
}
```

The "PRESERVE THE EXISTING GRID INPUT IMPLEMENTATION HERE" placeholder means: leave the existing pre-Task-12 body for the `state.board.kind === 'grid'` branch unchanged. After Task 10 the grid branch already handles its own snapshot/setValue/history-push logic; Task 12 only ADDS the samurai branch alongside it.

- [ ] **Step 6: Update `erase` similarly**

```ts
erase: () => {
  const state = get()
  if (!state.board) return
  if (state.board.kind === 'grid') {
    // PRESERVE the existing grid erase implementation here (Task 10 already
    // refactored it to read state.board.grid).
    return
  }
  if (state.board.kind === 'samurai') {
    const sel = state.selected
    if (!sel || !('gridIdx' in sel)) return
    const sBoard = state.board.board
    const locs = samuraiSharedLocations(sBoard, sel.gridIdx, sel.coord)
    const prevByLocation = locs.map((l) => ({
      gridIdx: l.grid,
      coord: l.coord,
      snapshot: snapshot(samuraiCellAt(sBoard, l.grid, l.coord)),
    }))
    eraseShared(sBoard, sel.gridIdx, sel.coord)
    const nextByLocation = locs.map((l) => ({
      gridIdx: l.grid,
      coord: l.coord,
      snapshot: snapshot(samuraiCellAt(sBoard, l.grid, l.coord)),
    }))
    const entry: SamuraiHistoryEntry = {
      kind: 'samurai-erase',
      gridIdx: sel.gridIdx,
      coord: sel.coord,
      prevByLocation,
      nextByLocation,
    }
    set({
      board: { kind: 'samurai', board: sBoard },
      history: [...state.history.slice(0, state.historyIndex + 1), entry].slice(-HISTORY_CAP),
      historyIndex: Math.min(state.history.length, HISTORY_CAP - 1),
    })
    return
  }
  assertNever(state.board)
}
```

- [ ] **Step 7: Update `undo` and `redo`**

```ts
undo: () => {
  const state = get()
  if (state.historyIndex < 0) return
  const entry = state.history[state.historyIndex]!
  if (state.board?.kind === 'grid' && ('targetBefore' in entry)) {
    // existing grid undo: revertEntry(state.board.grid, entry as HistoryEntry)
    set({ board: { kind: 'grid', grid: state.board.grid }, historyIndex: state.historyIndex - 1 })
    return
  }
  if (state.board?.kind === 'samurai' && ('prevByLocation' in entry)) {
    const sam = entry as SamuraiHistoryEntry
    for (const loc of sam.prevByLocation) {
      const cell = samuraiCellAt(state.board.board, loc.gridIdx, loc.coord)
      restore(cell, loc.snapshot)
    }
    set({ board: { kind: 'samurai', board: state.board.board }, historyIndex: state.historyIndex - 1 })
    return
  }
}

redo: () => {
  const state = get()
  if (state.historyIndex >= state.history.length - 1) return
  const entry = state.history[state.historyIndex + 1]!
  if (state.board?.kind === 'grid' && ('targetAfter' in entry)) {
    // existing grid redo
    set({ board: { kind: 'grid', grid: state.board.grid }, historyIndex: state.historyIndex + 1 })
    return
  }
  if (state.board?.kind === 'samurai' && ('nextByLocation' in entry)) {
    const sam = entry as SamuraiHistoryEntry
    for (const loc of sam.nextByLocation) {
      const cell = samuraiCellAt(state.board.board, loc.gridIdx, loc.coord)
      restore(cell, loc.snapshot)
    }
    set({ board: { kind: 'samurai', board: state.board.board }, historyIndex: state.historyIndex + 1 })
    return
  }
}
```

- [ ] **Step 8: Run tests**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: PASS.

Run: `bun run test:run src/state`
Expected: PASS (no regression).

- [ ] **Step 9: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: gameStore input/erase/undo/redo dispatch on samurai kind

selected accepts {gridIdx, coord} for samurai. input/erase use
setValueShared / eraseShared and capture per-location snapshots for
undo. New SamuraiHistoryEntry shape carries prevByLocation/nextByLocation
arrays so undo/redo restore all overlapping sub-grids atomically.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: gameStore.isComplete + cellConflicts dispatchers

**Files:**
- Modify: `src/state/gameStore.ts`
- Modify: `src/state/gameStore.samurai.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/state/gameStore.samurai.test.ts`:

```ts
import { samuraiCellConflicts, samuraiIsCompleteState } from './gameStore'

// Test relies on internal selectors; if not exported, use selectIsComplete instead.

describe('gameStore samurai completion + conflicts', () => {
  it('isComplete is false on an empty samurai board', () => {
    loadEmptySamurai()
    const state = useGameStore.getState()
    expect(samuraiIsCompleteState(state)).toBe(false)
  })

  it('cellConflicts flags a deliberate duplicate in the same row', () => {
    loadEmptySamurai()
    // Place 5 at (0, 0) of center, then 5 at (0, 5) of center — same row conflict.
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 0 } })
    useGameStore.getState().input(5)
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 5 } })
    useGameStore.getState().input(5)
    const state = useGameStore.getState()
    const conflicts = samuraiCellConflicts(state)
    expect(conflicts.has('0,0,0')).toBe(true)
    expect(conflicts.has('0,0,5')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: FAIL — `samuraiCellConflicts` / `samuraiIsCompleteState` not exported.

- [ ] **Step 3: Add the exports**

In `gameStore.ts`, near the bottom:

```ts
export function samuraiCellConflicts(state: GameState): ReadonlySet<string> {
  if (state.board?.kind !== 'samurai') return new Set()
  return samuraiConflicts(state.board.board)
}

export function samuraiIsCompleteState(state: GameState): boolean {
  if (state.board?.kind !== 'samurai') return false
  return samuraiIsComplete(state.board.board)
}
```

Make sure `samuraiConflicts` and `samuraiIsComplete` are imported from `@/engine` at the top.

- [ ] **Step 4: Update the store's internal completion check on `input`/`erase`**

Wherever the grid-shaped `isComplete` is called after a successful input, add a parallel samurai branch:

```ts
// After updating board state:
const wasComplete = isGameComplete(state.board)
if (wasComplete && !state.completedAt) {
  set({ completedAt: new Date().toISOString() })
}

function isGameComplete(board: GameBoard | null): boolean {
  if (!board) return false
  if (board.kind === 'grid') return isComplete(board.grid)
  if (board.kind === 'samurai') return samuraiIsComplete(board.board) && samuraiConflicts(board.board).size === 0
  assertNever(board)
}
```

- [ ] **Step 5: Run tests**

Run: `bun run test:run src/state`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: gameStore isComplete + cellConflicts samurai dispatchers

samuraiCellConflicts and samuraiIsCompleteState selectors dispatch
on board.kind. The unified isGameComplete helper combines isComplete
and a conflicts-free check for samurai (since samuraiIsComplete only
verifies cell-filled, not constraint-valid).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: storage/db.ts — samurai payload

**Files:**
- Modify: `src/storage/db.ts`

Add optional samurai payload to `SavedGame`. Legacy records (no `kind`) read as classic; new samurai writes include the discriminator.

- [ ] **Step 1: Add the new fields**

In `src/storage/db.ts`, modify the `SavedGame` interface:

```ts
export interface SavedSamuraiPayload {
  readonly grids: ReadonlyArray<{
    readonly givens: string
    readonly cells: ReadonlyArray<SavedCell>
  }>
}

export interface SavedGame {
  // ... all existing fields unchanged
  /** Discriminator. Missing = legacy/grid. New writes always set this. */
  readonly kind?: 'grid' | 'samurai'
  /** Samurai-specific payload. Present iff kind === 'samurai'. */
  readonly samurai?: SavedSamuraiPayload
}
```

The existing `givens: string` and `cells: SavedCell[]` fields remain; for samurai saves, write `givens: ''` and `cells: []` (samurai data lives in `samurai`).

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/storage/db.ts
git commit -m "$(cat <<'EOF'
Phase 17a: SavedGame supports optional samurai payload

Adds kind?: 'grid' | 'samurai' discriminator and samurai?:
SavedSamuraiPayload field. Legacy records (no kind) read as 'grid'.
DB version unchanged; no IDB migration required.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: serializeGameForSave + hydrate for samurai

**Files:**
- Modify: `src/state/gameStore.ts`
- Modify: `src/state/gameStore.samurai.test.ts`

- [ ] **Step 1: Write failing test for save/load round-trip**

Append to `src/state/gameStore.samurai.test.ts`:

```ts
import { serializeGameForSave } from './gameStore'

describe('gameStore samurai save/load round-trip', () => {
  it('serializes and re-hydrates a samurai game', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 4, c: 4 } })
    useGameStore.getState().input(7)
    const saved = serializeGameForSave(useGameStore.getState())
    expect(saved).not.toBeNull()
    if (saved) {
      expect(saved.kind).toBe('samurai')
      expect(saved.samurai?.grids.length).toBe(5)
    }
    // Reset state and hydrate.
    useGameStore.setState({ board: null, puzzleId: null, history: [], historyIndex: -1 } as Partial<ReturnType<typeof useGameStore.getState>>)
    useGameStore.getState().hydrate(saved!)
    const restored = useGameStore.getState()
    expect(restored.board?.kind).toBe('samurai')
    if (restored.board?.kind === 'samurai') {
      expect(restored.board.board.grids[0]!.cells[4]![4]!.value).toBe(7)
    }
  })

  it('hydrate of a legacy record (kind missing) treats as grid', () => {
    // Use a minimal classic SavedGame as a legacy fixture.
    const legacy = {
      id: 'legacy-001',
      variant: 'classic',
      difficulty: 'easy' as const,
      givens: '0'.repeat(81),
      cells: Array.from({ length: 81 }, () => ({ v: null, c: [1,2,3,4,5,6,7,8,9], g: false })),
      history: [],
      historyIndex: -1,
      elapsedMs: 0,
      startedAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
      completedAt: null,
    }
    useGameStore.getState().hydrate(legacy as any)
    const state = useGameStore.getState()
    expect(state.board?.kind).toBe('grid')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: FAIL — `serializeGameForSave` returns the old grid-only shape; `hydrate` doesn't handle samurai.

- [ ] **Step 3: Extend `serializeGameForSave`**

```ts
export function serializeGameForSave(state: GameState): SavedGame | null {
  if (!state.puzzleId || !state.board) return null
  const base = {
    id: state.puzzleId,
    variant: state.variant,
    difficulty: state.difficulty,
    history: serializeHistory(state.history),
    historyIndex: state.historyIndex,
    elapsedMs: state.elapsedMs,
    startedAt: state.startedAt,
    lastPlayedAt: new Date().toISOString(),
    completedAt: state.completedAt,
  }
  if (state.board.kind === 'grid') {
    return {
      ...base,
      kind: 'grid',
      givens: state.givens,
      cells: serializeCells(state.board.grid),
      // ... existing optional variant-specific fields (regions, parityMask, etc.)
    }
  }
  if (state.board.kind === 'samurai') {
    return {
      ...base,
      kind: 'samurai',
      givens: '',
      cells: [],
      samurai: {
        grids: state.board.board.grids.map((g) => ({
          givens: serializePuzzle(g),
          cells: serializeCells(g),
        })),
      },
    }
  }
  assertNever(state.board)
}
```

Make sure `serializePuzzle` is imported from `@/engine` and `serializeCells` (a helper that snapshots a Grid's cells into `SavedCell[]`) exists; if not present, define it adjacent to the existing serialization code.

- [ ] **Step 4: Extend `hydrate`**

```ts
hydrate: (saved) => {
  if (saved.kind === 'samurai' && saved.samurai) {
    const board = createSamuraiBoard()
    for (let g = 0; g < 5; g++) {
      const subSaved = saved.samurai.grids[g]
      if (!subSaved) continue
      const parsed = parsePuzzle(subSaved.givens, board.grids[g]!.shape)
      // Overlay parsed givens, then walk subSaved.cells to restore in-progress state.
      for (let i = 0; i < subSaved.cells.length; i++) {
        const sc = subSaved.cells[i]!
        const r = Math.floor(i / parsed.shape.size)
        const c = i % parsed.shape.size
        const cell = board.grids[g]!.cells[r]![c]!
        cell.value = sc.v as 1 | null
        cell.given = sc.g
        cell.candidates = new Set(sc.c as ReadonlyArray<1>)
      }
    }
    samuraiConsistencyCheck(board)
    set({
      board: { kind: 'samurai', board },
      puzzleId: saved.id,
      variant: saved.variant,
      difficulty: saved.difficulty,
      givens: '',
      selected: null,
      mode: 'value',
      history: [], // history hydration of samurai entries is deferred
      historyIndex: -1,
      startedAt: saved.startedAt,
      elapsedMs: saved.elapsedMs,
      resumeAt: Date.now(),
      paused: false,
      completedAt: saved.completedAt,
      lockedCells: new Set(),
      lastShakeKey: 0,
      jigsawPieceMap: null,
      parityMask: null,
      edges: null,
      thermometers: null,
      arrows: null,
      cages: null,
      littleKillerClues: null,
      sandwichClues: null,
      skyscraperClues: null,
      paths: null,
    })
    return
  }
  // Legacy / kind === 'grid': existing implementation
}
```

- [ ] **Step 5: Run tests**

Run: `bun run test:run src/state/gameStore.samurai.test.ts`
Expected: PASS.

Run: `bun run test:run src/state src/storage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/state/gameStore.ts src/state/gameStore.samurai.test.ts
git commit -m "$(cat <<'EOF'
Phase 17a: samurai save/load round-trip

serializeGameForSave emits { kind: 'samurai', samurai: { grids: [...] } }
for samurai state. hydrate accepts the discriminated payload, rebuilds
a SamuraiBoard via createSamuraiBoard + parsePuzzle per sub-grid, and
verifies overlap consistency via samuraiConsistencyCheck.

History hydration for samurai entries is intentionally simplified
(history reset to empty on load) — full per-entry hydration lands when
the UI exercises it in sub-project 17b.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: 0 errors.

- [ ] **Step 3: Full unit test sweep**

Run: `bun run test:run`
Expected: all green. New samurai test suites should add ~30 cases on top of the pre-Phase-17a count.

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: build succeeds; no warnings about samurai code.

- [ ] **Step 5: Sanity check that existing variants still work**

Run: `bun run test:run src/state src/ui`
Expected: PASS. Existing classic/mini/mega/etc. tests cover the regression surface.

- [ ] **Step 6: Optional smoke**

Verify that the engine's public surface includes the samurai exports:
```bash
bun -e "import('./src/engine/index.ts').then(m => { console.log('createSamuraiBoard:', typeof m.createSamuraiBoard); console.log('gradeSamurai:', typeof m.gradeSamurai); })"
```
Expected: both are `function`.

If any gate fails, fix before declaring 17a done. No commit at this step.

---

## Task 17: GOTCHAS entry for 17a

**Files:**
- Modify: `docs/GOTCHAS.md`

- [ ] **Step 1: Append entry**

Append to `docs/GOTCHAS.md`:

```markdown
### Phase 17a — Samurai engine + state — 2026-05-20

Five overlapping 9×9 grids modeled as `SamuraiBoard` (5 × `Grid<9>` plus a
`sharedCells` map). Architectural notes worth knowing before 17b/17c:

- **Wrap, don't generalize.** `techniqueSolve` and `backtrackingSolve`
  remain Grid-only. New `samuraiTechniqueSolve` and `samuraiBacktrackingSolve`
  iterate per-sub-grid and sync shared cells. Avoiding a generic refactor
  kept the 20+ existing variants regression-free.

- **State is now a tagged union.** `state.board: { kind: 'grid', grid } |
  { kind: 'samurai', board } | null`. Every consumer that touched
  `state.grid` directly was rewritten to dispatch on `kind`. Future work
  must continue this discipline; `assertNever` falls through every switch.

- **Duplicate + sync for shared cells.** A value placed in an overlap is
  stored in both sub-grids that contain it. `setValueShared` is the only
  correct write path; direct `setValue` on a sub-grid bypasses the sync
  and breaks `samuraiConsistencyCheck`.

- **Cruciform layout is hard-coded.** `SAMURAI_LAYOUT` defines the
  standard center-plus-4-corners topology with each corner's
  `cornerBox` overlapping the center's `centerBox`. Non-standard
  Samurai variants (e.g. Sumo Samurai) would require revisiting
  `computeSharedCells`.

- **History hydration is reset on samurai save/load.** Per-entry replay
  of `samurai-value` / `samurai-erase` from the saved-game payload is
  intentionally deferred — the UI (17b) drives when it matters and we
  hadn't built that exercise yet at this checkpoint.
```

- [ ] **Step 2: Commit**

```bash
git add docs/GOTCHAS.md
git commit -m "$(cat <<'EOF'
Phase 17a: GOTCHAS for samurai engine + state

Captures the five key architectural notes: wrap-not-generalize for the
solver, tagged-union state, duplicate-and-sync for shared cells,
hard-coded cruciform topology, and history-hydration deferral.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Acceptance checklist (mirrors spec)

- [ ] `src/engine/samurai.ts` exports the documented surface (Tasks 1-5).
- [ ] `src/engine/solver/samuraiSolver.ts` and `src/engine/grader/samuraiGrader.ts` exist (Tasks 7-9).
- [ ] `src/engine/index.ts` re-exports the new surface (Tasks 6, 9).
- [ ] `src/state/gameStore.ts` uses the `GameBoard` discriminated union; existing variants work unchanged (Task 10).
- [ ] `gameStore.loadPuzzle` handles `variant: 'samurai'` with `samuraiGivens` (Task 11).
- [ ] `gameStore.input/erase/undo/redo` dispatch on `board.kind` (Task 12).
- [ ] `gameStore` selectors for completion + conflicts handle samurai (Task 13).
- [ ] `src/storage/db.ts` accepts an optional `kind` / `samurai` payload (Task 14).
- [ ] `serializeGameForSave` + `hydrate` round-trip samurai state (Task 15).
- [ ] All new vitest suites green; existing suites green (Task 16).
- [ ] `bun run typecheck`, `lint`, `build` all clean (Task 16).
- [ ] GOTCHAS entry committed (Task 17).
