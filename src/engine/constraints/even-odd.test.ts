import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../grid'
import { createEvenOddConstraint, parityGridOf } from './even-odd'

const ALL_DOTS = '.'.repeat(81)

function maskWith(positions: Array<{ r: number; c: number; p: 'E' | 'O' }>): string {
  const cells = ALL_DOTS.split('')
  for (const { r, c, p } of positions) cells[r * 9 + c] = p
  return cells.join('')
}

describe('createEvenOddConstraint', () => {
  it('parses a valid mask string', () => {
    const grid = parityGridOf(ALL_DOTS, 9)
    expect(grid[0]![0]).toBeNull()
  })

  it('rejects a mask string of wrong length', () => {
    expect(() => createEvenOddConstraint({ parityMask: 'EOEO' })).toThrow()
  })

  it('rejects unknown mask characters', () => {
    expect(() =>
      createEvenOddConstraint({ parityMask: '?'.repeat(81) }),
    ).toThrow()
  })

  it('validate passes when no cells are marked', () => {
    const c = createEvenOddConstraint({ parityMask: ALL_DOTS })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    expect(c.validate(grid)).toBe(true)
  })

  it('validate fails when an even-marked cell holds an odd digit', () => {
    const mask = maskWith([{ r: 0, c: 0, p: 'E' }])
    const c = createEvenOddConstraint({ parityMask: mask })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    expect(c.validate(grid)).toBe(false)
    const conflicts = c.findConflicts!(grid)
    expect(conflicts).toEqual([{ r: 0, c: 0 }])
  })

  it('validate fails when an odd-marked cell holds an even digit', () => {
    const mask = maskWith([{ r: 4, c: 4, p: 'O' }])
    const c = createEvenOddConstraint({ parityMask: mask })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 4, c: 4 }).value = 6
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate removes wrong-parity digits from a marked empty cell', () => {
    const mask = maskWith([{ r: 2, c: 3, p: 'E' }])
    const c = createEvenOddConstraint({ parityMask: mask })
    const grid = createGrid(CLASSIC_9, [c])
    const removed = c.propagate(grid).removals
    const odds = removed
      .filter((r) => r.coord.r === 2 && r.coord.c === 3)
      .map((r) => r.digit)
      .sort()
    expect(odds).toEqual([1, 3, 5, 7, 9])
  })

  it('propagate removes even digits from an odd-marked cell', () => {
    const mask = maskWith([{ r: 0, c: 0, p: 'O' }])
    const c = createEvenOddConstraint({ parityMask: mask })
    const grid = createGrid(CLASSIC_9, [c])
    const removed = c.propagate(grid).removals
    const evens = removed
      .filter((r) => r.coord.r === 0 && r.coord.c === 0)
      .map((r) => r.digit)
      .sort()
    expect(evens).toEqual([2, 4, 6, 8])
  })

  it('does not propagate on unmarked cells', () => {
    const c = createEvenOddConstraint({ parityMask: ALL_DOTS })
    const grid = createGrid(CLASSIC_9, [c])
    expect(c.propagate(grid).removals).toEqual([])
  })
})
