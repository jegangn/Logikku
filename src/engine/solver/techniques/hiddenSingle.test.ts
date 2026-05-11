import { describe, it, expect } from 'vitest'
import { hiddenSingle } from './hiddenSingle'
import { createGrid, cellAt, CLASSIC_9, setValue } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

describe('hiddenSingle', () => {
  it('finds a hidden single in a row', () => {
    const grid = makeGrid()
    for (let c = 0; c < 9; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(7)
    }
    cellAt(grid, { r: 0, c: 5 }).candidates.add(7)

    const step = hiddenSingle.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('hidden-single')
    expect(step!.tier).toBe(1)
    expect(step!.eliminations.placements).toHaveLength(1)
    expect(step!.eliminations.placements[0]).toEqual({ coord: { r: 0, c: 5 }, digit: 7 })
  })

  it('finds a hidden single in a box', () => {
    const grid = makeGrid()
    for (let r = 3; r < 6; r++) {
      for (let c = 3; c < 6; c++) {
        cellAt(grid, { r, c }).candidates.delete(4)
      }
    }
    cellAt(grid, { r: 4, c: 4 }).candidates.add(4)

    const step = hiddenSingle.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('hidden-single')
    expect(step!.eliminations.placements).toHaveLength(1)
    expect(step!.eliminations.placements[0]).toEqual({ coord: { r: 4, c: 4 }, digit: 4 })
  })

  it('returns null when no hidden single exists', () => {
    const grid = makeGrid()
    const step = hiddenSingle.apply(grid)
    expect(step).toBeNull()
  })

  it('skips cells that already have a value', () => {
    const grid = makeGrid()
    for (let c = 0; c < 9; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(3)
    }
    setValue(grid, { r: 0, c: 2 }, 3)

    const step = hiddenSingle.apply(grid)
    if (step !== null) {
      expect(step.eliminations.placements[0]?.coord).not.toEqual({ r: 0, c: 2 })
    }
  })

  it('explanation includes the region label and digit', () => {
    const grid = makeGrid()
    for (let c = 0; c < 9; c++) {
      cellAt(grid, { r: 2, c }).candidates.delete(7)
    }
    cellAt(grid, { r: 2, c: 4 }).candidates.add(7)

    const step = hiddenSingle.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.explanation).toContain('row-2')
    expect(step!.explanation).toContain('r3c5')
    expect(step!.explanation).toContain('7')
  })
})
