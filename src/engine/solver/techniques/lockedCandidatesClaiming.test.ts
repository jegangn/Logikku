import { describe, it, expect } from 'vitest'
import { lockedCandidatesClaiming } from './lockedCandidatesClaiming'
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

describe('lockedCandidatesClaiming', () => {
  it('detects claiming in a row pointing to a box', () => {
    const grid = makeGrid()
    clearDigit(grid, 5)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(5)
    cellAt(grid, { r: 0, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 1, c: 1 }).candidates.add(5)
    cellAt(grid, { r: 2, c: 2 }).candidates.add(5)

    const step = lockedCandidatesClaiming.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('locked-candidates-claiming')
    expect(step!.tier).toBe(2)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect(removal.digit).toBe(5)
      expect(removal.coord.r).toBeGreaterThanOrEqual(1)
      expect(removal.coord.r).toBeLessThanOrEqual(2)
      expect(removal.coord.c).toBeLessThanOrEqual(2)
    }
    const keys = removals.map((r) => `${r.coord.r},${r.coord.c}`).sort()
    expect(keys).toEqual(['1,1', '2,2'])
  })

  it('detects claiming in a column pointing to a box', () => {
    const grid = makeGrid()
    clearDigit(grid, 8)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(8)
    cellAt(grid, { r: 2, c: 0 }).candidates.add(8)
    cellAt(grid, { r: 1, c: 1 }).candidates.add(8)
    cellAt(grid, { r: 1, c: 2 }).candidates.add(8)
    cellAt(grid, { r: 1, c: 5 }).candidates.add(8)
    cellAt(grid, { r: 1, c: 7 }).candidates.add(8)

    const step = lockedCandidatesClaiming.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('locked-candidates-claiming')
    expect(step!.tier).toBe(2)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect(removal.digit).toBe(8)
      expect(removal.coord.c).toBeGreaterThanOrEqual(1)
      expect(removal.coord.c).toBeLessThanOrEqual(2)
      expect(removal.coord.r).toBeLessThanOrEqual(2)
    }
    const keys = removals.map((r) => `${r.coord.r},${r.coord.c}`).sort()
    expect(keys).toEqual(['1,1', '1,2'])
    expect(step!.explanation).toContain('col-0')
  })

  it('returns null when no claiming pattern exists', () => {
    const grid = makeGrid()
    const step = lockedCandidatesClaiming.apply(grid)
    expect(step).toBeNull()
  })

  it('explanation references the line, box and digit', () => {
    const grid = makeGrid()
    clearDigit(grid, 5)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(5)
    cellAt(grid, { r: 0, c: 2 }).candidates.add(5)
    cellAt(grid, { r: 1, c: 1 }).candidates.add(5)
    cellAt(grid, { r: 2, c: 2 }).candidates.add(5)

    const step = lockedCandidatesClaiming.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.explanation).toContain('row-0')
    expect(step!.explanation).toContain('box-0-0')
    expect(step!.explanation).toContain('5')
  })
})
