import { describe, it, expect } from 'vitest'
import { createClassicConstraint } from './classic'
import { CLASSIC_16, createGrid, cellAt } from '../grid'

describe('classic at N=16', () => {
  it('propagates a placed digit 12 to peer cells', () => {
    const grid = createGrid(CLASSIC_16)
    const constraint = createClassicConstraint({ shape: CLASSIC_16 })
    // Remove 12 from all row-0 cells except (0,0) to produce a hidden single.
    // Classic propagate detects this and emits a placement + removals for peers.
    for (let c = 1; c < 16; c++) {
      cellAt(grid, { r: 0, c }).candidates.delete(12)
    }
    const elim = constraint.propagate(grid)
    // (0,0) should be emitted as a hidden-single placement for digit 12.
    const placed = elim.placements.find(
      (p) => p.digit === 12 && p.coord.r === 0 && p.coord.c === 0,
    )
    expect(placed).toBeDefined()
    // Non-peer at (5, 5) — different row, col, and box — should retain candidate 12.
    expect(cellAt(grid, { r: 5, c: 5 }).candidates.has(12)).toBe(true)
  })
})
