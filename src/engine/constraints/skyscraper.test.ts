import { describe, it, expect } from 'vitest'
import { createSkyscraperConstraint } from './skyscraper'
import { CLASSIC_9, cellAt, createGrid, recomputeCandidates } from '../grid'
import { createClassicConstraint } from './classic'

describe('createSkyscraperConstraint', () => {
  it('counts visible buildings on a fully-placed row', () => {
    const c = createSkyscraperConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 'k1', side: 'left', index: 0, count: 3 }],
    })
    const grid = createGrid(CLASSIC_9, [c])
    // 1 4 2 5 3 9 6 7 8 — running max bumps at 1, 4, 5, 9 → 4 visible.
    // Use 1 4 5 9 then arbitrary: 1 4 5 9 8 7 6 3 2  → visible = 4 (1, 4, 5, 9).
    const row = [1, 4, 5, 9, 8, 7, 6, 3, 2]
    for (let i = 0; i < 9; i++) cellAt(grid, { r: 0, c: i }).value = row[i]!
    expect(c.validate(grid)).toBe(false) // expected 3, actual 4
  })

  it('propagate forces the leading cell to size when count = 1', () => {
    const c = createSkyscraperConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 'k1', side: 'left', index: 0, count: 1 }],
    })
    const grid = createGrid(CLASSIC_9, [
      createClassicConstraint({}),
      c,
    ])
    recomputeCandidates(grid)
    const elim = c.propagate(grid)
    const removed = new Set(
      elim.removals
        .filter((r) => r.coord.r === 0 && r.coord.c === 0)
        .map((r) => r.digit),
    )
    for (const d of [1, 2, 3, 4, 5, 6, 7, 8]) expect(removed.has(d)).toBe(true)
    expect(removed.has(9)).toBe(false)
  })

  it('propagate forces strictly increasing values when count = size', () => {
    const c = createSkyscraperConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 'k1', side: 'top', index: 0, count: 9 }],
    })
    const grid = createGrid(CLASSIC_9, [
      createClassicConstraint({}),
      c,
    ])
    recomputeCandidates(grid)
    const elim = c.propagate(grid)
    // Column 0: cell (i, 0) must be i+1.
    for (let i = 0; i < 9; i++) {
      const removed = new Set(
        elim.removals
          .filter((r) => r.coord.r === i && r.coord.c === 0)
          .map((r) => r.digit),
      )
      for (let d = 1; d <= 9; d++) {
        if (d === i + 1) expect(removed.has(d)).toBe(false)
        else expect(removed.has(d)).toBe(true)
      }
    }
  })

  it('propagate eliminates n at the first (count-1) positions in the general case', () => {
    const c = createSkyscraperConstraint({
      shape: CLASSIC_9,
      clues: [{ id: 'k1', side: 'left', index: 0, count: 4 }],
    })
    const grid = createGrid(CLASSIC_9, [
      createClassicConstraint({}),
      c,
    ])
    recomputeCandidates(grid)
    const elim = c.propagate(grid)
    for (let i = 0; i < 3; i++) {
      const removed = new Set(
        elim.removals
          .filter((r) => r.coord.r === 0 && r.coord.c === i)
          .map((r) => r.digit),
      )
      expect(removed.has(9)).toBe(true)
    }
  })
})
