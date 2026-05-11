import { describe, it, expect } from 'vitest'
import { xWing, swordfish } from './fish'
import { createGrid, cellAt, CLASSIC_9 } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

function clearDigit(grid: ReturnType<typeof makeGrid>, digit: number) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cellAt(grid, { r, c }).candidates.delete(digit)
    }
  }
}

describe('xWing', () => {
  it('finds a row-based X-Wing and eliminates from the two columns', () => {
    const grid = makeGrid()
    clearDigit(grid, 5)
    // Two rows (r=1, r=4) with digit 5 appearing only in columns 2 and 7.
    cellAt(grid, { r: 1, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 1, c: 7 }).candidates.add(5)
    cellAt(grid, { r: 4, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 4, c: 7 }).candidates.add(5)
    // Add 5 to extra cells in columns 2 and 7 (placed in rows that have
    // ADDITIONAL columns with 5 too, so those rows themselves are NOT
    // bilocation candidates for an X-Wing).
    cellAt(grid, { r: 0, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 0, c: 3 }).candidates.add(5)
    cellAt(grid, { r: 6, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 6, c: 4 }).candidates.add(5)
    cellAt(grid, { r: 8, c: 7 }).candidates.add(5)
    cellAt(grid, { r: 8, c: 0 }).candidates.add(5)

    const step = xWing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('x-wing')
    expect(step!.tier).toBe(4)
    const removals = step!.eliminations.removals
    expect(removals.length).toBe(3)
    for (const removal of removals) {
      expect(removal.digit).toBe(5)
      expect([2, 7]).toContain(removal.coord.c)
      // not from the X-Wing's own rows
      expect([1, 4]).not.toContain(removal.coord.r)
    }
  })

  it('finds a column-based X-Wing and eliminates from the two rows', () => {
    const grid = makeGrid()
    clearDigit(grid, 3)
    // Two columns (c=0, c=5) with digit 3 only in rows 2 and 6.
    cellAt(grid, { r: 2, c: 0 }).candidates.add(3)
    cellAt(grid, { r: 6, c: 0 }).candidates.add(3)
    cellAt(grid, { r: 2, c: 5 }).candidates.add(3)
    cellAt(grid, { r: 6, c: 5 }).candidates.add(3)
    // Extra in rows 2 and 6 - should be eliminated.
    cellAt(grid, { r: 2, c: 3 }).candidates.add(3)
    cellAt(grid, { r: 2, c: 8 }).candidates.add(3)
    cellAt(grid, { r: 6, c: 2 }).candidates.add(3)
    cellAt(grid, { r: 6, c: 7 }).candidates.add(3)

    const step = xWing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('x-wing')
    const removals = step!.eliminations.removals
    expect(removals.length).toBe(4)
    for (const removal of removals) {
      expect(removal.digit).toBe(3)
      expect([2, 6]).toContain(removal.coord.r)
      expect([0, 5]).not.toContain(removal.coord.c)
    }
  })

  it('returns null when no X-Wing exists', () => {
    const grid = makeGrid()
    // Default full candidates - no X-Wing pattern.
    const step = xWing.apply(grid)
    expect(step).toBeNull()
  })

  it('explanation references the digit and the rows/columns', () => {
    const grid = makeGrid()
    clearDigit(grid, 5)
    cellAt(grid, { r: 1, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 1, c: 7 }).candidates.add(5)
    cellAt(grid, { r: 4, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 4, c: 7 }).candidates.add(5)
    cellAt(grid, { r: 0, c: 2 }).candidates.add(5)

    const step = xWing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.explanation).toContain('5')
    expect(step!.explanation.toLowerCase()).toContain('x-wing')
  })
})

describe('swordfish', () => {
  it('finds a row-based Swordfish and eliminates from the three columns', () => {
    const grid = makeGrid()
    clearDigit(grid, 7)
    // Three rows (r=0, r=3, r=6) whose 7-candidates lie within columns {1, 4, 8}.
    // Each row uses 2 of the 3 columns.
    cellAt(grid, { r: 0, c: 1 }).candidates.add(7)
    cellAt(grid, { r: 0, c: 4 }).candidates.add(7)
    cellAt(grid, { r: 3, c: 4 }).candidates.add(7)
    cellAt(grid, { r: 3, c: 8 }).candidates.add(7)
    cellAt(grid, { r: 6, c: 1 }).candidates.add(7)
    cellAt(grid, { r: 6, c: 8 }).candidates.add(7)
    // Extra 7s in those columns elsewhere - should be eliminated.
    cellAt(grid, { r: 2, c: 1 }).candidates.add(7)
    cellAt(grid, { r: 5, c: 4 }).candidates.add(7)
    cellAt(grid, { r: 8, c: 8 }).candidates.add(7)

    const step = swordfish.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('swordfish')
    expect(step!.tier).toBe(4)
    const removals = step!.eliminations.removals
    expect(removals.length).toBe(3)
    for (const removal of removals) {
      expect(removal.digit).toBe(7)
      expect([1, 4, 8]).toContain(removal.coord.c)
      expect([0, 3, 6]).not.toContain(removal.coord.r)
    }
  })

  it('finds a column-based Swordfish', () => {
    const grid = makeGrid()
    clearDigit(grid, 2)
    // Three columns (c=0, c=3, c=7) whose 2-candidates lie within rows {1, 4, 8}.
    cellAt(grid, { r: 1, c: 0 }).candidates.add(2)
    cellAt(grid, { r: 4, c: 0 }).candidates.add(2)
    cellAt(grid, { r: 4, c: 3 }).candidates.add(2)
    cellAt(grid, { r: 8, c: 3 }).candidates.add(2)
    cellAt(grid, { r: 1, c: 7 }).candidates.add(2)
    cellAt(grid, { r: 8, c: 7 }).candidates.add(2)
    // Extra 2s in those rows elsewhere - should be eliminated.
    cellAt(grid, { r: 1, c: 5 }).candidates.add(2)
    cellAt(grid, { r: 4, c: 6 }).candidates.add(2)
    cellAt(grid, { r: 8, c: 1 }).candidates.add(2)

    const step = swordfish.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('swordfish')
    const removals = step!.eliminations.removals
    expect(removals.length).toBe(3)
    for (const removal of removals) {
      expect(removal.digit).toBe(2)
      expect([1, 4, 8]).toContain(removal.coord.r)
      expect([0, 3, 7]).not.toContain(removal.coord.c)
    }
  })

  it('returns null when no Swordfish exists', () => {
    const grid = makeGrid()
    const step = swordfish.apply(grid)
    expect(step).toBeNull()
  })
})
