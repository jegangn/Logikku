import { describe, it, expect } from 'vitest'
import {
  SAMURAI_LAYOUT,
  globalCoordKey,
  computeSharedCells,
  createSamuraiBoard,
  samuraiCellAt,
  samuraiSharedLocations,
  setValueShared,
  eraseShared,
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
    expect(nw.cornerBox).toEqual({ r: 2, c: 2 })
    expect(nw.centerBox).toEqual({ r: 0, c: 0 })
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
    const canonical = '0,1,1'
    const entries = map.get(canonical)!
    expect(entries.length).toBe(2)
    const sorted = [...entries].sort((a, b) => a.grid - b.grid)
    expect(sorted[0]).toEqual({ grid: 0, coord: { r: 1, c: 1 } })
    expect(sorted[1]).toEqual({ grid: 1, coord: { r: 7, c: 7 } })
  })

  it('maps each corners overlap correctly for all 4 corners', () => {
    const map = computeSharedCells()
    const seKey = '0,6,6'
    const seEntries = map.get(seKey)!
    const seSorted = [...seEntries].sort((a, b) => a.grid - b.grid)
    expect(seSorted[0]).toEqual({ grid: 0, coord: { r: 6, c: 6 } })
    expect(seSorted[1]).toEqual({ grid: 4, coord: { r: 0, c: 0 } })
  })
})

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
    const locs = samuraiSharedLocations(board, 2, { r: 0, c: 0 })
    expect(locs.length).toBe(1)
    expect(locs[0]).toEqual({ grid: 2, coord: { r: 0, c: 0 } })
  })
})

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
