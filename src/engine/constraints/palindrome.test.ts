import { describe, it, expect } from 'vitest'
import { createPalindromeConstraint } from './palindrome'
import { CLASSIC_9, cellAt, createGrid, recomputeCandidates } from '../grid'
import { createClassicConstraint } from './classic'

describe('createPalindromeConstraint', () => {
  it('validates a fully placed palindromic path', () => {
    const c = createPalindromeConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'p1',
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 3
    cellAt(grid, { r: 0, c: 1 }).value = 7
    cellAt(grid, { r: 0, c: 2 }).value = 3
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 2 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate intersects candidates of mirrored cells', () => {
    const c = createPalindromeConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'p1',
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
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set([1, 2, 3])
    cellAt(grid, { r: 2, c: 0 }).candidates = new Set([2, 3, 4])
    const elim = c.propagate(grid)
    const removedAt00 = new Set(
      elim.removals
        .filter((r) => r.coord.r === 0 && r.coord.c === 0)
        .map((r) => r.digit),
    )
    const removedAt20 = new Set(
      elim.removals
        .filter((r) => r.coord.r === 2 && r.coord.c === 0)
        .map((r) => r.digit),
    )
    expect(removedAt00.has(1)).toBe(true)
    expect(removedAt20.has(4)).toBe(true)
  })

  it('flags conflicts when a mirrored pair holds different values', () => {
    const c = createPalindromeConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'p1',
          cells: [
            { r: 0, c: 0 },
            { r: 1, c: 0 },
            { r: 2, c: 0 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 4
    cellAt(grid, { r: 2, c: 0 }).value = 6
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(2)
  })
})
