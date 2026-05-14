import { describe, it, expect } from 'vitest'
import {
  createLittleKillerConstraint,
  littleKillerCells,
} from './little-killer'
import { CLASSIC_9, cellAt, createGrid } from '../grid'

describe('createLittleKillerConstraint', () => {
  it('diagonal cells walk inward along the chosen direction', () => {
    const cells = littleKillerCells(
      {
        id: 'l1',
        side: 'top',
        index: 2,
        direction: 'SE',
        sum: 10,
      },
      CLASSIC_9,
    )
    expect(cells.map((c) => `${c.r},${c.c}`).join(' ')).toBe(
      '0,2 1,3 2,4 3,5 4,6 5,7 6,8',
    )
  })

  it('validates the sum of a fully-placed diagonal', () => {
    const c = createLittleKillerConstraint({
      shape: CLASSIC_9,
      clues: [
        {
          id: 'l1',
          side: 'top',
          index: 0,
          direction: 'SE',
          sum: 10,
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    // main NW-SE diagonal: 9 cells summing to 10? not feasible with distinct
    // 1..9 — but the constraint doesn't enforce distinctness within the
    // diagonal. We'll set the cells to a valid digit set summing to 10.
    const values = [1, 1, 1, 1, 1, 1, 1, 2, 1]
    let r = 0,
      cc = 0
    for (const v of values) {
      cellAt(grid, { r, c: cc }).value = v
      r++
      cc++
    }
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 0 }).value = 9
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate eliminates impossible cell digits given the diagonal sum', () => {
    // Short diagonal (3 cells) with sum = 6 → bounds: each cell ≤ 4.
    const c = createLittleKillerConstraint({
      shape: CLASSIC_9,
      clues: [
        {
          id: 'l1',
          side: 'top',
          index: 6,
          direction: 'SE',
          sum: 6,
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    const elim = c.propagate(grid)
    // Cell at (0, 6) candidates: with min total of (1+1) = 2 for the other
    // two cells and max total of (9+9) = 18, bounds for cell 0 are
    // [6 - 18, 6 - 2] = [-12, 4] → cap to [1, 4]. Eliminates 5..9.
    const removed = new Set(
      elim.removals
        .filter((r) => r.coord.r === 0 && r.coord.c === 6)
        .map((r) => r.digit),
    )
    for (const d of [5, 6, 7, 8, 9]) expect(removed.has(d)).toBe(true)
  })
})
