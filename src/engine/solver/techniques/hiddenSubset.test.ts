import { describe, it, expect } from 'vitest'
import { hiddenPair, hiddenTriple, hiddenQuad } from './hiddenSubset'
import { createGrid, cellAt, CLASSIC_9 } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

function clearDigitFromRegion(
  grid: ReturnType<typeof makeGrid>,
  digit: number,
  coords: ReadonlyArray<{ r: number; c: number }>,
) {
  for (const coord of coords) {
    cellAt(grid, coord).candidates.delete(digit)
  }
}

describe('hiddenPair', () => {
  it('finds a hidden pair in a row and eliminates other candidates from those cells', () => {
    const grid = makeGrid()
    // In row 0, digits 4 and 8 only appear in r0c0 and r0c1.
    // Both cells still hold all 9 candidates initially (1..9).
    // Remove 4 and 8 from all other cells in row 0.
    for (let c = 2; c < 9; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(4)
      cellAt(grid, { r: 0, c }).candidates.delete(8)
    }

    const step = hiddenPair.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('hidden-pair')
    expect(step!.tier).toBe(3)

    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([4, 8]).not.toContain(removal.digit)
      expect(removal.coord.r).toBe(0)
      expect([0, 1]).toContain(removal.coord.c)
    }
    const removedFromC0 = removals.filter((rm) => rm.coord.c === 0).map((rm) => rm.digit).sort((a, b) => a - b)
    const removedFromC1 = removals.filter((rm) => rm.coord.c === 1).map((rm) => rm.digit).sort((a, b) => a - b)
    expect(removedFromC0).toEqual([1, 2, 3, 5, 6, 7, 9])
    expect(removedFromC1).toEqual([1, 2, 3, 5, 6, 7, 9])
  })

  it('returns null when no hidden pair exists', () => {
    const grid = makeGrid()
    const step = hiddenPair.apply(grid)
    expect(step).toBeNull()
  })

  it('explanation references region, cells, and digits', () => {
    const grid = makeGrid()
    for (let c = 2; c < 9; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(4)
      cellAt(grid, { r: 0, c }).candidates.delete(8)
    }
    const step = hiddenPair.apply(grid)
    expect(step!.explanation).toContain('row-0')
    expect(step!.explanation).toContain('r1c1')
    expect(step!.explanation).toContain('r1c2')
    expect(step!.explanation).toContain('4')
    expect(step!.explanation).toContain('8')
  })
})

describe('hiddenTriple', () => {
  it('finds a hidden triple in a row', () => {
    const grid = makeGrid()
    // Digits 2, 5, 7 only appear in r0c0, r0c1, r0c2 within row 0.
    clearDigitFromRegion(grid, 2, [
      { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 },
      { r: 0, c: 6 }, { r: 0, c: 7 }, { r: 0, c: 8 },
    ])
    clearDigitFromRegion(grid, 5, [
      { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 },
      { r: 0, c: 6 }, { r: 0, c: 7 }, { r: 0, c: 8 },
    ])
    clearDigitFromRegion(grid, 7, [
      { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 },
      { r: 0, c: 6 }, { r: 0, c: 7 }, { r: 0, c: 8 },
    ])

    const step = hiddenTriple.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('hidden-triple')
    expect(step!.tier).toBe(3)

    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([2, 5, 7]).not.toContain(removal.digit)
      expect(removal.coord.r).toBe(0)
      expect([0, 1, 2]).toContain(removal.coord.c)
    }
  })
})

describe('hiddenQuad', () => {
  it('finds a hidden quad in a column', () => {
    const grid = makeGrid()
    // Digits 1, 3, 5, 9 only appear in r0c0..r3c0 within column 0.
    const otherCoords = [
      { r: 4, c: 0 }, { r: 5, c: 0 }, { r: 6, c: 0 },
      { r: 7, c: 0 }, { r: 8, c: 0 },
    ]
    for (const d of [1, 3, 5, 9]) {
      clearDigitFromRegion(grid, d, otherCoords)
    }

    const step = hiddenQuad.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('hidden-quad')
    expect(step!.tier).toBe(3)

    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect([1, 3, 5, 9]).not.toContain(removal.digit)
      expect(removal.coord.c).toBe(0)
      expect([0, 1, 2, 3]).toContain(removal.coord.r)
    }
  })

  it('eliminations remove OTHER candidates from the N cells (not the N digits from elsewhere)', () => {
    const grid = makeGrid()
    // Hidden pair {4,8} confined to r0c0, r0c1
    for (let c = 2; c < 9; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(4)
      cellAt(grid, { r: 0, c }).candidates.delete(8)
    }
    const step = hiddenPair.apply(grid)
    expect(step).not.toBeNull()
    for (const removal of step!.eliminations.removals) {
      // The removed digits are NOT 4 or 8 (those stay in the cells).
      expect(removal.digit).not.toBe(4)
      expect(removal.digit).not.toBe(8)
      // The removals are confined to the two cells in the hidden pair.
      expect(removal.coord.r).toBe(0)
      expect([0, 1]).toContain(removal.coord.c)
    }
  })
})
