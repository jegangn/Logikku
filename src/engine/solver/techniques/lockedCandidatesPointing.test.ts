import { describe, it, expect } from 'vitest'
import { lockedCandidatesPointing } from './lockedCandidatesPointing'
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

describe('lockedCandidatesPointing', () => {
  it('detects pointing pair in a box pointing to a row', () => {
    const grid = makeGrid()
    clearDigit(grid, 4)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(4)
    cellAt(grid, { r: 0, c: 1 }).candidates.add(4)
    cellAt(grid, { r: 0, c: 5 }).candidates.add(4)
    cellAt(grid, { r: 0, c: 7 }).candidates.add(4)

    const step = lockedCandidatesPointing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('locked-candidates-pointing')
    expect(step!.tier).toBe(2)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect(removal.digit).toBe(4)
      expect(removal.coord.r).toBe(0)
      expect(removal.coord.c).toBeGreaterThanOrEqual(3)
    }
    const cols = removals.map((r) => r.coord.c).sort((a, b) => a - b)
    expect(cols).toEqual([5, 7])
  })

  it('detects pointing pair in a box pointing to a column', () => {
    const grid = makeGrid()
    clearDigit(grid, 6)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(6)
    cellAt(grid, { r: 2, c: 0 }).candidates.add(6)
    cellAt(grid, { r: 4, c: 0 }).candidates.add(6)
    cellAt(grid, { r: 7, c: 0 }).candidates.add(6)

    const step = lockedCandidatesPointing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('locked-candidates-pointing')
    expect(step!.tier).toBe(2)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect(removal.digit).toBe(6)
      expect(removal.coord.c).toBe(0)
      expect(removal.coord.r).toBeGreaterThanOrEqual(3)
    }
    const rows = removals.map((r) => r.coord.r).sort((a, b) => a - b)
    expect(rows).toEqual([4, 7])
  })

  it('returns null when no pointing pattern exists', () => {
    const grid = makeGrid()
    const step = lockedCandidatesPointing.apply(grid)
    expect(step).toBeNull()
  })

  it('explanation references the box, line and digit', () => {
    const grid = makeGrid()
    clearDigit(grid, 4)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(4)
    cellAt(grid, { r: 0, c: 1 }).candidates.add(4)
    cellAt(grid, { r: 0, c: 5 }).candidates.add(4)

    const step = lockedCandidatesPointing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.explanation).toContain('box-0-0')
    expect(step!.explanation).toContain('row-0')
    expect(step!.explanation).toContain('4')
  })
})
