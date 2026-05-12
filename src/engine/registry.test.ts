import { describe, it, expect } from 'vitest'
import { ConstraintRegistry, ALL_CONSTRAINT_KINDS } from './registry'
import type { ConstraintKind } from './types'
import { NotImplementedError } from './types'
import { CLASSIC_9, createGrid } from './grid'

describe('ConstraintRegistry', () => {
  it('lists all 20 constraint kinds (Phase 0 set, excluding Samurai composition)', () => {
    expect(ALL_CONSTRAINT_KINDS).toHaveLength(20)
    expect(new Set(ALL_CONSTRAINT_KINDS).size).toBe(20)
  })

  it('every kind has a registered factory', () => {
    for (const kind of ALL_CONSTRAINT_KINDS) {
      expect(ConstraintRegistry.has(kind)).toBe(true)
    }
  })

  it('creates a Classic constraint that is fully functional', () => {
    const c = ConstraintRegistry.create('classic', { shape: CLASSIC_9 })
    expect(c.kind).toBe('classic')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
  })

  it('creates an X-Diagonal constraint that is fully functional', () => {
    const c = ConstraintRegistry.create('x-diagonal', { shape: CLASSIC_9 })
    expect(c.kind).toBe('x-diagonal')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
    expect(c.regions).toHaveLength(2)
  })

  const STUB_KINDS = ALL_CONSTRAINT_KINDS.filter(
    (k) => k !== 'classic' && k !== 'x-diagonal',
  )

  it('creates stubs for every remaining kind that throw NotImplementedError on propagate/validate', () => {
    const grid = createGrid(CLASSIC_9)
    for (const kind of STUB_KINDS) {
      const c = ConstraintRegistry.create(kind, {})
      expect(c.kind).toBe(kind)
      expect(() => c.propagate(grid)).toThrow(NotImplementedError)
      expect(() => c.validate(grid)).toThrow(NotImplementedError)
    }
  })

  it('throws for unknown kinds', () => {
    expect(() => ConstraintRegistry.create('not-a-kind' as ConstraintKind, {})).toThrow()
  })
})
