import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../../grid'
import { createPairInequalityConstraint } from './pairInequality'

describe('createPairInequalityConstraint', () => {
  it('validates an empty grid as ok', () => {
    const c = createPairInequalityConstraint({
      kind: 'anti-knight',
      id: 'test',
      shape: CLASSIC_9,
      offsets: [
        [-1, 0],
        [1, 0],
      ],
      forbids: (a, b) => a === b,
    })
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
  })

  it('rejects pairs that the predicate forbids', () => {
    const c = createPairInequalityConstraint({
      kind: 'anti-knight',
      id: 'test',
      shape: CLASSIC_9,
      offsets: [
        [1, 0],
        [-1, 0],
      ],
      forbids: (a, b) => a === b,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 1, c: 0 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate removes forbidden candidates from offset peers', () => {
    const c = createPairInequalityConstraint({
      kind: 'anti-knight',
      id: 'test',
      shape: CLASSIC_9,
      offsets: [[1, 0]],
      forbids: (a, b) => a === b,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 3
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set()
    const result = c.propagate(grid)
    const removal = result.removals.find(
      (r) => r.coord.r === 1 && r.coord.c === 0 && r.digit === 3,
    )
    expect(removal).toBeDefined()
    expect(result.placements).toHaveLength(0)
  })

  it('findConflicts returns the coords participating in any forbidden pair', () => {
    const c = createPairInequalityConstraint({
      kind: 'non-consecutive',
      id: 'test',
      shape: CLASSIC_9,
      offsets: [
        [0, 1],
        [0, -1],
      ],
      forbids: (a, b) => Math.abs(a - b) === 1,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 6
    cellAt(grid, { r: 2, c: 2 }).value = 3
    cellAt(grid, { r: 2, c: 3 }).value = 7
    const conflicts = c.findConflicts!(grid)
    const keys = new Set(conflicts.map((co) => `${co.r},${co.c}`))
    expect(keys.has('0,0')).toBe(true)
    expect(keys.has('0,1')).toBe(true)
    expect(keys.has('2,2')).toBe(false)
    expect(keys.has('2,3')).toBe(false)
  })

  it('regions is empty (pair-inequality constraints have no cell-set regions)', () => {
    const c = createPairInequalityConstraint({
      kind: 'anti-knight',
      id: 'test',
      shape: CLASSIC_9,
      offsets: [[1, 0]],
      forbids: () => true,
    })
    expect(c.regions).toEqual([])
  })
})
