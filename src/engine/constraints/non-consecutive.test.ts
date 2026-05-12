import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../grid'
import {
  createNonConsecutiveConstraint,
  ORTHOGONAL_OFFSETS,
} from './non-consecutive'

describe('createNonConsecutiveConstraint', () => {
  it('declares the four orthogonal offsets', () => {
    expect(ORTHOGONAL_OFFSETS).toHaveLength(4)
  })

  it('flags an orthogonal pair that differs by 1 as a conflict', () => {
    const c = createNonConsecutiveConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 6
    expect(c.validate(grid)).toBe(false)
    const conflicts = new Set(
      c.findConflicts!(grid).map((co) => `${co.r},${co.c}`),
    )
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('0,1')).toBe(true)
  })

  it('does not flag same-digit pairs (classic handles those)', () => {
    const c = createNonConsecutiveConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 4
    cellAt(grid, { r: 0, c: 1 }).value = 4
    expect(c.validate(grid)).toBe(true)
  })

  it('does not flag pairs differing by 2 or more', () => {
    const c = createNonConsecutiveConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 1 }).value = 7
    cellAt(grid, { r: 1, c: 0 }).value = 2
    expect(c.validate(grid)).toBe(true)
  })

  it('propagate removes d-1 and d+1 from orthogonal peers of a placed cell', () => {
    const c = createNonConsecutiveConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 5
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    const result = c.propagate(grid)
    const byCell: Record<string, number[]> = {}
    for (const removal of result.removals) {
      const key = `${removal.coord.r},${removal.coord.c}`
      ;(byCell[key] ??= []).push(removal.digit)
    }
    for (const key of ['3,4', '5,4', '4,3', '4,5']) {
      expect(byCell[key]).toBeDefined()
      const digits = new Set(byCell[key])
      expect(digits.has(4)).toBe(true)
      expect(digits.has(6)).toBe(true)
      expect(digits.has(5)).toBe(false)
    }
  })

  it('does not propose digit 0 or digit 10 as removals (out of range)', () => {
    const c = createNonConsecutiveConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 1
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    const result = c.propagate(grid)
    for (const removal of result.removals) {
      expect(removal.digit).toBeGreaterThanOrEqual(1)
      expect(removal.digit).toBeLessThanOrEqual(9)
    }
  })
})
