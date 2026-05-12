import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid, parsePuzzle } from '../grid'
import { createClassicConstraint } from './classic'
import {
  createXDiagonalConstraint,
  diagonalRegions,
  DIAGONAL_NE_SW_ID,
  DIAGONAL_NW_SE_ID,
} from './x-diagonal'

describe('createXDiagonalConstraint', () => {
  it('exposes two named diagonal regions of full grid size', () => {
    const c = createXDiagonalConstraint({ shape: CLASSIC_9 })
    expect(c.kind).toBe('x-diagonal')
    expect(c.regions).toHaveLength(2)
    const nwSe = c.regions.find((r) => r.id === DIAGONAL_NW_SE_ID)!
    const neSw = c.regions.find((r) => r.id === DIAGONAL_NE_SW_ID)!
    expect(nwSe.kind).toBe('diagonal')
    expect(neSw.kind).toBe('diagonal')
    expect(nwSe.cells).toHaveLength(9)
    expect(neSw.cells).toHaveLength(9)
    expect(nwSe.cells[0]).toEqual({ r: 0, c: 0 })
    expect(nwSe.cells[8]).toEqual({ r: 8, c: 8 })
    expect(neSw.cells[0]).toEqual({ r: 0, c: 8 })
    expect(neSw.cells[8]).toEqual({ r: 8, c: 0 })
  })

  it('diagonalRegions works for arbitrary square sizes', () => {
    const regions = diagonalRegions({ size: 6, boxRows: 2, boxCols: 3 })
    expect(regions[0]!.cells).toHaveLength(6)
    expect(regions[1]!.cells).toHaveLength(6)
  })

  it('validate returns true on an empty grid', () => {
    const c = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
  })

  it('validate detects duplicate digit on the NW-SE diagonal', () => {
    const c = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 4, c: 4 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('validate detects duplicate digit on the NE-SW diagonal', () => {
    const c = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 8 }).value = 3
    cellAt(grid, { r: 8, c: 0 }).value = 3
    expect(c.validate(grid)).toBe(false)
  })

  it('validate ignores duplicates that are not on either diagonal', () => {
    const c = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 1 }).value = 7
    cellAt(grid, { r: 1, c: 0 }).value = 7
    expect(c.validate(grid)).toBe(true)
  })

  it('propagate eliminates duplicates from other diagonal cells', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const xdiag = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = parsePuzzle('1'.padEnd(81, '0'), CLASSIC_9)
    const gridWithConstraints = { ...grid, constraints: [classic, xdiag] }
    const result = xdiag.propagate(gridWithConstraints)
    const removedCells = result.removals
      .filter((r) => r.digit === 1)
      .map((r) => `${r.coord.r},${r.coord.c}`)
      .sort()
    expect(removedCells).toContain('3,3')
    expect(removedCells).toContain('8,8')
    expect(removedCells).not.toContain('0,8')
  })

  it('propagate finds a hidden single on the diagonal', () => {
    const xdiag = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [xdiag])
    for (let i = 0; i < 9; i++) {
      const cell = cellAt(grid, { r: i, c: i })
      cell.candidates = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
    }
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue
      cellAt(grid, { r: i, c: i }).candidates.delete(7)
    }
    const result = xdiag.propagate(grid)
    const placedSeven = result.placements.find(
      (p) => p.digit === 7 && p.coord.r === 4 && p.coord.c === 4,
    )
    expect(placedSeven).toBeDefined()
  })
})
