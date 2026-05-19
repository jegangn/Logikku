import { describe, it, expect } from 'vitest'
import { createRenbanConstraint } from './renban'
import { CLASSIC_9, cellAt, createGrid, recomputeCandidates } from '../grid'
import { createClassicConstraint } from './classic'

describe('createRenbanConstraint', () => {
  it('validates a fully placed consecutive set', () => {
    const c = createRenbanConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'r1',
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 3
    cellAt(grid, { r: 0, c: 2 }).value = 4
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 2 }).value = 7
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate restricts candidates to the union of feasible windows', () => {
    const c = createRenbanConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'r1',
          cells: [
            { r: 0, c: 0 },
            { r: 1, c: 0 },
            { r: 2, c: 0 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [createClassicConstraint({}), c])
    recomputeCandidates(grid)
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set()
    const elim = c.propagate(grid)
    // length 3 path containing a 5 → windows are 3..5, 4..6, 5..7. Allowed
    // digits in the other cells: 3..7 (minus the placed 5).
    const removedAt10 = new Set(
      elim.removals
        .filter((r) => r.coord.r === 1 && r.coord.c === 0)
        .map((r) => r.digit),
    )
    expect(removedAt10.has(1)).toBe(true)
    expect(removedAt10.has(2)).toBe(true)
    expect(removedAt10.has(5)).toBe(true) // no-repeat
    expect(removedAt10.has(8)).toBe(true)
    expect(removedAt10.has(9)).toBe(true)
    expect(removedAt10.has(3)).toBe(false)
    expect(removedAt10.has(4)).toBe(false)
    expect(removedAt10.has(6)).toBe(false)
    expect(removedAt10.has(7)).toBe(false)
  })

  it('flags conflicts when placed digits are not a consecutive set', () => {
    const c = createRenbanConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'r1',
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 1
    cellAt(grid, { r: 0, c: 1 }).value = 4
    cellAt(grid, { r: 0, c: 2 }).value = 9
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(3)
  })
})
