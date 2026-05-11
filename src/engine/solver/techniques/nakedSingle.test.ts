import { describe, it, expect } from 'vitest'
import { nakedSingle } from './nakedSingle'
import { createGrid, cellAt, CLASSIC_9, setValue } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

describe('nakedSingle', () => {
  it('finds a cell with exactly one candidate', () => {
    const grid = makeGrid()
    const cell = cellAt(grid, { r: 0, c: 0 })
    cell.candidates = new Set([7])
    const step = nakedSingle.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.tier).toBe(1)
    expect(step!.technique).toBe('naked-single')
    expect(step!.eliminations.placements).toHaveLength(1)
    expect(step!.eliminations.placements[0]).toEqual({ coord: { r: 0, c: 0 }, digit: 7 })
  })

  it('returns null when no naked single exists', () => {
    const grid = makeGrid()
    const step = nakedSingle.apply(grid)
    expect(step).toBeNull()
  })

  it('skips cells that already have a value', () => {
    const grid = makeGrid()
    setValue(grid, { r: 0, c: 0 }, 5)
    const step = nakedSingle.apply(grid)
    expect(step).toBeNull()
  })

  it('explanation references the cell and digit in r#c# format', () => {
    const grid = makeGrid()
    cellAt(grid, { r: 4, c: 3 }).candidates = new Set([9])
    const step = nakedSingle.apply(grid)
    expect(step!.explanation).toContain('r5c4')
    expect(step!.explanation).toContain('9')
  })
})
