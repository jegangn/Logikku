import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../grid'
import { createAntiKingConstraint, KING_OFFSETS } from './anti-king'

describe('createAntiKingConstraint', () => {
  it('declares the eight king offsets', () => {
    expect(KING_OFFSETS).toHaveLength(8)
  })

  it('flags a diagonal-adjacent duplicate as a conflict', () => {
    const c = createAntiKingConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 3
    cellAt(grid, { r: 5, c: 5 }).value = 3 // diagonal king move
    expect(c.validate(grid)).toBe(false)
    const conflicts = new Set(
      c.findConflicts!(grid).map((co) => `${co.r},${co.c}`),
    )
    expect(conflicts.has('4,4')).toBe(true)
    expect(conflicts.has('5,5')).toBe(true)
  })

  it('does not flag duplicates that are two cells apart diagonally', () => {
    const c = createAntiKingConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 9
    cellAt(grid, { r: 2, c: 2 }).value = 9
    expect(c.validate(grid)).toBe(true)
  })

  it('propagate removes the placed digit from the 8 king peers', () => {
    const c = createAntiKingConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 2
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    const result = c.propagate(grid)
    const twos = result.removals
      .filter((r) => r.digit === 2)
      .map((r) => `${r.coord.r},${r.coord.c}`)
      .sort()
    expect(twos).toContain('3,3')
    expect(twos).toContain('3,5')
    expect(twos).toContain('5,3')
    expect(twos).toContain('5,5')
  })
})
