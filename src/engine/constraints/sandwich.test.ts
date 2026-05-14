import { describe, it, expect } from 'vitest'
import { createSandwichConstraint } from './sandwich'
import { CLASSIC_9, cellAt, createGrid } from '../grid'

describe('createSandwichConstraint', () => {
  it('validates a fully placed row whose digits-between-1-and-9 sum match', () => {
    const c = createSandwichConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 's1', side: 'left', index: 0, sum: 17 }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    // row 0: 1, 5, 4, 8, 9, 2, 3, 6, 7  (1 at col 0, 9 at col 4; between = 5+4+8 = 17)
    const row = [1, 5, 4, 8, 9, 2, 3, 6, 7]
    for (let i = 0; i < 9; i++) cellAt(grid, { r: 0, c: i }).value = row[i]!
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 6
    cellAt(grid, { r: 0, c: 7 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('flags conflicts on a completed row whose sandwich sum mismatches', () => {
    const c = createSandwichConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 's1', side: 'left', index: 0, sum: 10 }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    const row = [1, 5, 4, 8, 9, 2, 3, 6, 7]
    for (let i = 0; i < 9; i++) cellAt(grid, { r: 0, c: i }).value = row[i]!
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(9)
  })

  it('returns no conflicts when the row is incomplete', () => {
    const c = createSandwichConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 's1', side: 'left', index: 0, sum: 17 }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 1
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(0)
  })
})
