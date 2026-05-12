import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'
import { createAntiKnightConstraint } from '../../constraints/anti-knight'
import { createNonConsecutiveConstraint } from '../../constraints/non-consecutive'
import { forbiddenPairElimination } from './forbiddenPairElimination'

describe('forbiddenPairElimination', () => {
  it('returns null when no pair-inequality constraint is present', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    expect(forbiddenPairElimination.apply(grid)).toBeNull()
  })

  it('returns a step with eliminations for anti-knight peers of a placed value', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const knight = createAntiKnightConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic, knight])
    cellAt(grid, { r: 4, c: 4 }).value = 3
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    const step = forbiddenPairElimination.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('forbidden-pair-elimination')
    expect(step!.eliminations.removals.length).toBeGreaterThan(0)
    expect(step!.eliminations.placements).toHaveLength(0)
  })

  it('returns a step for non-consecutive (eliminating d-1 and d+1)', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const nc = createNonConsecutiveConstraint({ shape: CLASSIC_9 })
    const grid = createGrid(CLASSIC_9, [classic, nc])
    cellAt(grid, { r: 4, c: 4 }).value = 5
    cellAt(grid, { r: 4, c: 4 }).candidates = new Set()
    const step = forbiddenPairElimination.apply(grid)
    expect(step).not.toBeNull()
    const digits = new Set(step!.eliminations.removals.map((r) => r.digit))
    expect(digits.has(4)).toBe(true)
    expect(digits.has(6)).toBe(true)
  })
})
