import { describe, it, expect } from 'vitest'
import { createGermanWhispersConstraint } from './german-whispers'
import { CLASSIC_9, cellAt, createGrid, recomputeCandidates } from '../grid'
import { createClassicConstraint } from './classic'

describe('createGermanWhispersConstraint', () => {
  it('validates a fully placed path with adjacent differences ≥ 5', () => {
    const c = createGermanWhispersConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'w1',
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
    cellAt(grid, { r: 0, c: 1 }).value = 8
    cellAt(grid, { r: 0, c: 2 }).value = 2
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 2 }).value = 4
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate eliminates 5 from all path cells', () => {
    const c = createGermanWhispersConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'w1',
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
    const elim = c.propagate(grid)
    for (const co of [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
    ]) {
      const removed = new Set(
        elim.removals
          .filter((r) => r.coord.r === co.r && r.coord.c === co.c)
          .map((r) => r.digit),
      )
      expect(removed.has(5)).toBe(true)
    }
  })

  it('propagate forces the neighbour of a placed 1 to be in {6..9}', () => {
    const c = createGermanWhispersConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'w1',
          cells: [
            { r: 0, c: 0 },
            { r: 1, c: 0 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [createClassicConstraint({}), c])
    recomputeCandidates(grid)
    cellAt(grid, { r: 0, c: 0 }).value = 1
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set()
    const elim = c.propagate(grid)
    const removed = new Set(
      elim.removals
        .filter((r) => r.coord.r === 1 && r.coord.c === 0)
        .map((r) => r.digit),
    )
    for (const d of [1, 2, 3, 4, 5]) expect(removed.has(d)).toBe(true)
    for (const d of [6, 7, 8, 9]) expect(removed.has(d)).toBe(false)
  })

  it('flags conflicts when adjacent cells differ by less than 5', () => {
    const c = createGermanWhispersConstraint({
      shape: CLASSIC_9,
      paths: [
        {
          id: 'w1',
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 3
    cellAt(grid, { r: 0, c: 1 }).value = 6
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(2)
  })
})
