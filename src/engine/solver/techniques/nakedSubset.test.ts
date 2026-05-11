import { describe, it, expect } from 'vitest'
import { nakedPair, nakedTriple, nakedQuad } from './nakedSubset'
import { createGrid, cellAt, CLASSIC_9 } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

describe('nakedPair', () => {
  it('finds a naked pair in a row and eliminates digits from other cells', () => {
    const grid = makeGrid()
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set([3, 7])
    cellAt(grid, { r: 0, c: 1 }).candidates = new Set([3, 7])

    const step = nakedPair.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('naked-pair')
    expect(step!.tier).toBe(3)

    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([3, 7]).toContain(removal.digit)
      expect(removal.coord.r).toBe(0)
      expect([0, 1]).not.toContain(removal.coord.c)
    }
    const removed3 = removals.filter((rm) => rm.digit === 3).map((rm) => rm.coord.c).sort((a, b) => a - b)
    const removed7 = removals.filter((rm) => rm.digit === 7).map((rm) => rm.coord.c).sort((a, b) => a - b)
    expect(removed3).toEqual([2, 3, 4, 5, 6, 7, 8])
    expect(removed7).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it('returns null when no naked pair exists', () => {
    const grid = makeGrid()
    const step = nakedPair.apply(grid)
    expect(step).toBeNull()
  })

  it('explanation references region, cells, and digits', () => {
    const grid = makeGrid()
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set([3, 7])
    cellAt(grid, { r: 0, c: 1 }).candidates = new Set([3, 7])

    const step = nakedPair.apply(grid)
    expect(step!.explanation).toContain('row-0')
    expect(step!.explanation).toContain('r1c1')
    expect(step!.explanation).toContain('r1c2')
    expect(step!.explanation).toContain('3')
    expect(step!.explanation).toContain('7')
  })
})

describe('nakedTriple', () => {
  it('finds a naked triple in a column', () => {
    const grid = makeGrid()
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set([2, 5, 8])
    cellAt(grid, { r: 1, c: 0 }).candidates = new Set([2, 5, 8])
    cellAt(grid, { r: 2, c: 0 }).candidates = new Set([2, 5, 8])

    const step = nakedTriple.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('naked-triple')
    expect(step!.tier).toBe(3)

    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([2, 5, 8]).toContain(removal.digit)
      expect(removal.coord.c).toBe(0)
      expect([0, 1, 2]).not.toContain(removal.coord.r)
    }
  })

  it('handles a triple where one cell has only 2 of the 3 digits (subset, not exact match)', () => {
    const grid = makeGrid()
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set([1, 4, 9])
    cellAt(grid, { r: 0, c: 1 }).candidates = new Set([1, 4, 9])
    cellAt(grid, { r: 0, c: 2 }).candidates = new Set([1, 9])

    const step = nakedTriple.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('naked-triple')
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([1, 4, 9]).toContain(removal.digit)
      expect(removal.coord.r).toBe(0)
      expect([0, 1, 2]).not.toContain(removal.coord.c)
    }
  })

  it('returns null when no naked triple exists', () => {
    const grid = makeGrid()
    const step = nakedTriple.apply(grid)
    expect(step).toBeNull()
  })
})

describe('nakedQuad', () => {
  it('finds a naked quad in a box', () => {
    const grid = makeGrid()
    // Box at top-left: rows 0-2, cols 0-2
    cellAt(grid, { r: 0, c: 0 }).candidates = new Set([1, 2, 3, 4])
    cellAt(grid, { r: 0, c: 1 }).candidates = new Set([1, 2, 3, 4])
    cellAt(grid, { r: 1, c: 0 }).candidates = new Set([1, 2, 3, 4])
    cellAt(grid, { r: 1, c: 1 }).candidates = new Set([1, 2, 3, 4])

    const step = nakedQuad.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('naked-quad')
    expect(step!.tier).toBe(3)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([1, 2, 3, 4]).toContain(removal.digit)
    }
  })
})
