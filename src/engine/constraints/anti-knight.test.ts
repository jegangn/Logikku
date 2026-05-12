import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../grid'
import { createAntiKnightConstraint, KNIGHT_OFFSETS } from './anti-knight'

describe('createAntiKnightConstraint', () => {
  it('declares the eight knight offsets', () => {
    expect(KNIGHT_OFFSETS).toHaveLength(8)
    const set = new Set(KNIGHT_OFFSETS.map(([dr, dc]) => `${dr},${dc}`))
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      expect(set.has(`${dr},${dc}`)).toBe(true)
    }
  })

  it('flags a duplicate at a knight move as a conflict', () => {
    const c = createAntiKnightConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 7
    cellAt(grid, { r: 2, c: 3 }).value = 7 // knight move from (4,4)
    expect(c.validate(grid)).toBe(false)
    const conflicts = new Set(
      c.findConflicts!(grid).map((co) => `${co.r},${co.c}`),
    )
    expect(conflicts.has('4,4')).toBe(true)
    expect(conflicts.has('2,3')).toBe(true)
  })

  it('does not flag a non-knight duplicate', () => {
    const c = createAntiKnightConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 7
    cellAt(grid, { r: 0, c: 5 }).value = 7
    expect(c.validate(grid)).toBe(true)
    expect(c.findConflicts!(grid)).toHaveLength(0)
  })

  it('propagate removes the placed digit from all knight peers', () => {
    const c = createAntiKnightConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 6
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    const result = c.propagate(grid)
    const sixes = result.removals
      .filter((r) => r.digit === 6)
      .map((r) => `${r.coord.r},${r.coord.c}`)
      .sort()
    expect(sixes).toContain('2,3')
    expect(sixes).toContain('2,5')
    expect(sixes).toContain('3,2')
    expect(sixes).toContain('3,6')
    expect(sixes).toContain('5,2')
    expect(sixes).toContain('5,6')
    expect(sixes).toContain('6,3')
    expect(sixes).toContain('6,5')
  })
})
