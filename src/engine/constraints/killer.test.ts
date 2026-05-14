import { describe, it, expect } from 'vitest'
import { cagesOf, createKillerConstraint } from './killer'
import { CLASSIC_9, cellAt, createGrid } from '../grid'

describe('createKillerConstraint', () => {
  it('validate accepts a fully placed cage whose digits sum to target', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 10,
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
    cellAt(grid, { r: 0, c: 2 }).value = 5
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 2 }).value = 6
    expect(c.validate(grid)).toBe(false)
  })

  it('validate rejects repeated digits within a cage', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 10,
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate eliminates impossible cage candidates (cage sum=3, 2 cells)', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 3,
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    const elim = c.propagate(grid)
    // Only {1,2} works. So both cells should have everything except {1,2} removed.
    const cell00Removals = elim.removals.filter(
      (r) => r.coord.r === 0 && r.coord.c === 0,
    )
    const cell01Removals = elim.removals.filter(
      (r) => r.coord.r === 0 && r.coord.c === 1,
    )
    const removed00 = new Set(cell00Removals.map((r) => r.digit))
    const removed01 = new Set(cell01Removals.map((r) => r.digit))
    for (const d of [3, 4, 5, 6, 7, 8, 9]) {
      expect(removed00.has(d)).toBe(true)
      expect(removed01.has(d)).toBe(true)
    }
    expect(removed00.has(1)).toBe(false)
    expect(removed00.has(2)).toBe(false)
  })

  it('propagate eliminates already-placed cage digits from other cage cells', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 15,
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 9
    const elim = c.propagate(grid)
    const removed01 = new Set(
      elim.removals
        .filter((r) => r.coord.r === 0 && r.coord.c === 1)
        .map((r) => r.digit),
    )
    const removed02 = new Set(
      elim.removals
        .filter((r) => r.coord.r === 0 && r.coord.c === 2)
        .map((r) => r.digit),
    )
    expect(removed01.has(9)).toBe(true)
    expect(removed02.has(9)).toBe(true)
  })

  it('findConflicts flags a cage whose digits repeat', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 10,
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 5
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(2)
  })

  it('findConflicts flags a fully placed cage whose total does not match target', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 10,
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 1
    cellAt(grid, { r: 0, c: 1 }).value = 2
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(2)
  })

  it('cagesOf returns the registered cages from the grid', () => {
    const c = createKillerConstraint({
      shape: CLASSIC_9,
      cages: [
        {
          id: 'c1',
          sum: 17,
          cells: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    const cages = cagesOf(grid)
    expect(cages.length).toBe(1)
    expect(cages[0]!.sum).toBe(17)
    expect(cages[0]!.cells.length).toBe(2)
  })
})
