import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid, parsePuzzle } from '../grid'
import { createClassicConstraint } from './classic'
import { createHyperConstraint, hyperRegions, HYPER_WINDOW_ORIGINS } from './hyper'

describe('createHyperConstraint', () => {
  it('exposes four window regions of 9 cells each at the expected origins', () => {
    const c = createHyperConstraint({ shape: CLASSIC_9 })
    expect(c.kind).toBe('hyper')
    expect(c.regions).toHaveLength(4)
    for (const region of c.regions) {
      expect(region.kind).toBe('window')
      expect(region.cells).toHaveLength(9)
    }
    const origins = c.regions.map((r) => `${r.cells[0]!.r},${r.cells[0]!.c}`).sort()
    expect(origins).toEqual(['1,1', '1,5', '5,1', '5,5'])
  })

  it('rejects unsupported grid shapes', () => {
    expect(() => hyperRegions({ size: 6, boxRows: 2, boxCols: 3 })).toThrow()
    expect(() => hyperRegions({ size: 16, boxRows: 4, boxCols: 4 })).toThrow()
  })

  it('window origins reference rows 2-4 and 6-8 (1-indexed) at corners', () => {
    expect(HYPER_WINDOW_ORIGINS).toEqual([
      [1, 1],
      [1, 5],
      [5, 1],
      [5, 5],
    ])
  })

  it('validate returns true on an empty grid', () => {
    const c = createHyperConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
  })

  it('validate detects duplicates within a window', () => {
    const c = createHyperConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 1, c: 1 }).value = 7
    cellAt(grid, { r: 3, c: 3 }).value = 7
    expect(c.validate(grid)).toBe(false)
  })

  it('validate ignores duplicates outside every window', () => {
    const c = createHyperConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 9
    cellAt(grid, { r: 8, c: 8 }).value = 9
    expect(c.validate(grid)).toBe(true)
  })

  it('propagate eliminates window-peer candidates of placed values', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const hyper = createHyperConstraint({ shape: CLASSIC_9 })
    const givens = '0'.repeat(11) + '5' + '0'.repeat(69)
    const grid = { ...parsePuzzle(givens, CLASSIC_9), constraints: [classic, hyper] }
    const result = hyper.propagate(grid)
    const fives = result.removals
      .filter((r) => r.digit === 5)
      .map((r) => `${r.coord.r},${r.coord.c}`)
      .sort()
    expect(fives).toContain('3,3')
    expect(fives).toContain('3,1')
    expect(fives).not.toContain('5,5')
  })

  it('propagate finds a hidden single inside a window', () => {
    const hyper = createHyperConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [hyper])
    const window = hyper.regions[0]!
    for (const coord of window.cells) {
      if (coord.r === 2 && coord.c === 2) continue
      cellAt(grid, coord).candidates.delete(4)
    }
    const result = hyper.propagate(grid)
    const placed = result.placements.find(
      (p) => p.digit === 4 && p.coord.r === 2 && p.coord.c === 2,
    )
    expect(placed).toBeDefined()
  })
})
