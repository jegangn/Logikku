import { describe, it, expect } from 'vitest'
import { createClassicConstraint } from './classic'
import { CLASSIC_6, createGrid, cellAt, parsePuzzle } from '../grid'
import { backtrackingSolve } from '../solver/backtrack'

describe('Classic constraint at N=6 (Mini Sudoku)', () => {
  it('emits the expected row/col/box regions', () => {
    const c = createClassicConstraint({ shape: CLASSIC_6 })
    expect(c.regions).toHaveLength(6 + 6 + 6)
  })

  it('boxes are 2x3', () => {
    const c = createClassicConstraint({ shape: CLASSIC_6 })
    const boxes = c.regions.filter((r) => r.kind === 'box')
    expect(boxes).toHaveLength(6)
    for (const box of boxes) {
      expect(box.cells.length).toBe(6)
      // All cells within the same 2-row × 3-col block
      const rows = new Set(box.cells.map((co) => co.r))
      const cols = new Set(box.cells.map((co) => co.c))
      expect(rows.size).toBe(2)
      expect(cols.size).toBe(3)
    }
  })

  it('solves an empty 6x6 grid (returns at least one solution)', () => {
    const c = createClassicConstraint({ shape: CLASSIC_6 })
    const grid = createGrid(CLASSIC_6, [c])
    const result = backtrackingSolve(grid, { maxSolutions: 1 })
    expect(result.hasSolution).toBe(true)
  })

  it('parsePuzzle accepts a 36-char string for size=6', () => {
    const givens = '0'.repeat(36)
    const grid = parsePuzzle(givens, CLASSIC_6)
    expect(grid.shape.size).toBe(6)
    expect(grid.cells.length).toBe(6)
    expect(grid.cells[0]!.length).toBe(6)
  })

  it('detects conflicting placements via validate', () => {
    const c = createClassicConstraint({ shape: CLASSIC_6 })
    const grid = createGrid(CLASSIC_6, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 1
    cellAt(grid, { r: 0, c: 5 }).value = 1
    expect(c.validate(grid)).toBe(false)
  })
})
