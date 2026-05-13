import { describe, it, expect } from 'vitest'
import { createThermometerConstraint } from './thermometer'
import { CLASSIC_9, createGrid, cellAt } from '../grid'

describe('createThermometerConstraint', () => {
  it('validates strictly-increasing values along the path', () => {
    const c = createThermometerConstraint({
      shape: CLASSIC_9,
      thermometers: [
        {
          id: 't1',
          path: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 2
    cellAt(grid, { r: 0, c: 1 }).value = 5
    cellAt(grid, { r: 0, c: 2 }).value = 7
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 2 }).value = 3
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate applies length-based bounds (cell k of L-length path is in [k+1, N-L+k+1])', () => {
    const c = createThermometerConstraint({
      shape: CLASSIC_9,
      thermometers: [
        {
          id: 't1',
          path: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
            { r: 0, c: 3 },
            { r: 0, c: 4 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    const elim = c.propagate(grid)
    // Bulb (k=0, L=5): allowed [1, 5]; 6-9 should be eliminated.
    const bulbRemovals = elim.removals.filter(
      (r) => r.coord.r === 0 && r.coord.c === 0,
    )
    const bulbForbidden = new Set(bulbRemovals.map((r) => r.digit))
    expect(bulbForbidden.has(6)).toBe(true)
    expect(bulbForbidden.has(9)).toBe(true)
    expect(bulbForbidden.has(5)).toBe(false)
    // Tip (k=4, L=5): allowed [5, 9]; 1-4 should be eliminated.
    const tipRemovals = elim.removals.filter(
      (r) => r.coord.r === 0 && r.coord.c === 4,
    )
    const tipForbidden = new Set(tipRemovals.map((r) => r.digit))
    expect(tipForbidden.has(1)).toBe(true)
    expect(tipForbidden.has(4)).toBe(true)
    expect(tipForbidden.has(5)).toBe(false)
  })

  it('propagate refines bounds from placed values along the path', () => {
    const c = createThermometerConstraint({
      shape: CLASSIC_9,
      thermometers: [
        {
          id: 't1',
          path: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 6
    const elim = c.propagate(grid)
    // (0,1) must be > 6 so {7, 8, 9} only (but length-bound says it's [2..8])
    // So {2..6} should be eliminated.
    const removals = elim.removals.filter(
      (r) => r.coord.r === 0 && r.coord.c === 1,
    )
    const removed = new Set(removals.map((r) => r.digit))
    for (let d = 1; d <= 6; d++) expect(removed.has(d)).toBe(true)
    expect(removed.has(7)).toBe(false)
  })

  it('findConflicts flags equal or descending pairs', () => {
    const c = createThermometerConstraint({
      shape: CLASSIC_9,
      thermometers: [
        {
          id: 't1',
          path: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
          ],
        },
      ],
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 3
    expect(c.findConflicts!(grid).length).toBe(2)
  })

  it('treats the path as a "no repeats" region for hidden-single', () => {
    const c = createThermometerConstraint({
      shape: CLASSIC_9,
      thermometers: [
        {
          id: 't1',
          path: [
            { r: 0, c: 0 },
            { r: 0, c: 1 },
            { r: 0, c: 2 },
          ],
        },
      ],
    })
    expect(c.regions).toHaveLength(1)
    expect(c.regions[0]!.kind).toBe('thermometer')
    expect(c.regions[0]!.cells).toHaveLength(3)
  })
})
