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

  it('creates a Hyper / Windoku constraint that is fully functional', () => {
    const c = ConstraintRegistry.create('hyper', { shape: CLASSIC_9 })
    expect(c.kind).toBe('hyper')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
    expect(c.regions).toHaveLength(4)
  })

  it.each(['anti-knight', 'anti-king', 'non-consecutive'] as const)(
    'creates a %s constraint that is fully functional',
    (kind) => {
      const c = ConstraintRegistry.create(kind, { shape: CLASSIC_9 })
      expect(c.kind).toBe(kind)
      const grid = createGrid(CLASSIC_9, [c])
      expect(c.validate(grid)).toBe(true)
      expect(typeof c.findConflicts).toBe('function')
    },
  )

  it('creates a Jigsaw constraint with default classic boxes and validates', () => {
    const c = ConstraintRegistry.create('jigsaw', { shape: CLASSIC_9 })
    expect(c.kind).toBe('jigsaw')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
    // 9 rows + 9 cols + 9 pieces
    expect(c.regions).toHaveLength(27)
  })

  it('creates an Even-Odd constraint with default empty mask', () => {
    const c = ConstraintRegistry.create('even-odd', { shape: CLASSIC_9 })
    expect(c.kind).toBe('even-odd')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
    expect(typeof c.findConflicts).toBe('function')
  })

  it.each(['kropki', 'xv', 'greater-than'] as const)(
    'creates a %s constraint that is fully functional',
    (kind) => {
      const c = ConstraintRegistry.create(kind, { shape: CLASSIC_9 })
      expect(c.kind).toBe(kind)
      const grid = createGrid(CLASSIC_9, [c])
      expect(c.validate(grid)).toBe(true)
      expect(typeof c.findConflicts).toBe('function')
    },
  )

  it('creates a Thermometer constraint that is fully functional', () => {
    const c = ConstraintRegistry.create('thermometer', { shape: CLASSIC_9 })
    expect(c.kind).toBe('thermometer')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
    expect(typeof c.findConflicts).toBe('function')
  })

  it('creates an Arrow constraint that is fully functional', () => {
    const c = ConstraintRegistry.create('arrow', { shape: CLASSIC_9 })
    expect(c.kind).toBe('arrow')
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.validate(grid)).toBe(true)
    expect(typeof c.findConflicts).toBe('function')
  })

  const IMPLEMENTED_KINDS = new Set([
    'classic',
    'x-diagonal',
    'hyper',
    'anti-knight',
    'anti-king',
    'non-consecutive',
    'jigsaw',
    'even-odd',
    'kropki',
    'xv',
    'greater-than',
    'thermometer',
    'arrow',
    'killer',
  ])
  const STUB_KINDS = ALL_CONSTRAINT_KINDS.filter((k) => !IMPLEMENTED_KINDS.has(k))

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
