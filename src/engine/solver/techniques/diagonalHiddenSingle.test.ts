import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'
import { createXDiagonalConstraint } from '../../constraints/x-diagonal'
import { diagonalHiddenSingle } from './diagonalHiddenSingle'

describe('diagonalHiddenSingle', () => {
  it('returns null when no diagonal constraint is present', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic])
    expect(diagonalHiddenSingle.apply(grid)).toBeNull()
  })

  it('finds a digit confined to a single diagonal cell and proposes its placement', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const xdiag = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic, xdiag])
    for (let i = 0; i < 9; i++) {
      if (i === 3) continue
      cellAt(grid, { r: i, c: i }).candidates.delete(8)
    }
    const step = diagonalHiddenSingle.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('diagonal-hidden-single')
    expect(step!.tier).toBe(1)
    expect(step!.eliminations.placements).toEqual([
      { coord: { r: 3, c: 3 }, digit: 8 },
    ])
  })

  it('skips diagonals where the digit is already placed', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const xdiag = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic, xdiag])
    cellAt(grid, { r: 4, c: 4 }).value = 5
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    expect(
      diagonalHiddenSingle.apply(grid)?.eliminations.placements.find(
        (p) => p.digit === 5,
      ),
    ).toBeUndefined()
  })

  it('does not fire on row/column/box regions', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic])
    for (let c = 1; c < 9; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(2)
    }
    expect(diagonalHiddenSingle.apply(grid)).toBeNull()
  })
})
