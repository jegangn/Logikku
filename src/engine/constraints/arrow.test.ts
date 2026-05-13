import { describe, it, expect } from 'vitest'
import { createArrowConstraint } from './arrow'
import { CLASSIC_9, createGrid, cellAt } from '../grid'

describe('createArrowConstraint', () => {
  it('validates single-digit head = sum(tail)', () => {
    const c = createArrowConstraint({
      shape: CLASSIC_9,
      arrows: [
        {
          id: 'a1',
          head: [{ r: 0, c: 0 }],
          tail: [
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 7
    cellAt(grid, { r: 0, c: 1 }).value = 3
    cellAt(grid, { r: 0, c: 2 }).value = 4
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 2 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('validates double-digit head = sum(tail)', () => {
    const c = createArrowConstraint({
      shape: CLASSIC_9,
      arrows: [
        {
          id: 'a1',
          head: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
          tail: [
            { r: 1, c: 0 },
            { r: 1, c: 1 },
            { r: 1, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    // head = 1, 5 → value 15; tail = 4, 6, 5 → sum 15
    cellAt(grid, { r: 0, c: 0 }).value = 1
    cellAt(grid, { r: 0, c: 1 }).value = 5
    cellAt(grid, { r: 1, c: 0 }).value = 4
    cellAt(grid, { r: 1, c: 1 }).value = 6
    cellAt(grid, { r: 1, c: 2 }).value = 5
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 1, c: 2 }).value = 4 // tail sum = 14
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate eliminates impossible tail digits when head is placed', () => {
    const c = createArrowConstraint({
      shape: CLASSIC_9,
      arrows: [
        {
          id: 'a1',
          head: [{ r: 0, c: 0 }],
          tail: [
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    const elim = c.propagate(grid)
    // tail cells must sum to 5; each ≤ 4 (since other tail ≥ 1)
    const tailRemovals = elim.removals.filter(
      (r) => r.coord.r === 0 && (r.coord.c === 1 || r.coord.c === 2),
    )
    const removed = new Set(tailRemovals.map((r) => `${r.coord.c}:${r.digit}`))
    // 5, 6, 7, 8, 9 cannot appear in either tail cell
    for (const c of [1, 2]) {
      for (const d of [5, 6, 7, 8, 9]) {
        expect(removed.has(`${c}:${d}`)).toBe(true)
      }
    }
  })

  it('propagate eliminates head digits when tail sum range is tight', () => {
    const c = createArrowConstraint({
      shape: CLASSIC_9,
      arrows: [
        {
          id: 'a1',
          head: [{ r: 0, c: 0 }],
          tail: [
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 1 }).value = 3
    cellAt(grid, { r: 0, c: 2 }).value = 4
    const elim = c.propagate(grid)
    // head must be 7. So {1..6, 8, 9} eliminated.
    const headRemovals = elim.removals.filter(
      (r) => r.coord.r === 0 && r.coord.c === 0,
    )
    const removed = new Set(headRemovals.map((r) => r.digit))
    for (const d of [1, 2, 3, 4, 5, 6, 8, 9]) expect(removed.has(d)).toBe(true)
    expect(removed.has(7)).toBe(false)
  })

  it('findConflicts flags violators', () => {
    const c = createArrowConstraint({
      shape: CLASSIC_9,
      arrows: [
        {
          id: 'a1',
          head: [{ r: 0, c: 0 }],
          tail: [
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 9
    cellAt(grid, { r: 0, c: 1 }).value = 3
    cellAt(grid, { r: 0, c: 2 }).value = 4
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(3) // head + 2 tail cells flagged
  })
})
