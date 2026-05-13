import { describe, it, expect } from 'vitest'
import { createGreaterThanConstraint } from './greater-than'
import { CLASSIC_9, createGrid, cellAt } from '../grid'

describe('createGreaterThanConstraint', () => {
  it('gt: from > to', () => {
    const c = createGreaterThanConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'gt' }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 7
    cellAt(grid, { r: 0, c: 1 }).value = 2
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 9
    expect(c.validate(grid)).toBe(false)
  })

  it('lt: from < to', () => {
    const c = createGreaterThanConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'lt' }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 2
    cellAt(grid, { r: 0, c: 1 }).value = 9
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 1
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate eliminates impossible candidates', () => {
    const c = createGreaterThanConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'gt' }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 3
    const elim = c.propagate(grid)
    // peer (0,1) must be < 3, so 1 or 2
    const allowed = new Set([1, 2])
    for (const r of elim.removals) {
      if (r.coord.r === 0 && r.coord.c === 1) expect(allowed.has(r.digit)).toBe(false)
    }
  })

  it('findConflicts flags violators', () => {
    const c = createGreaterThanConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'gt' }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 2
    cellAt(grid, { r: 0, c: 1 }).value = 8
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(2)
  })
})
