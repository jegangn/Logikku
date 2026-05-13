import { describe, it, expect } from 'vitest'
import { createXVConstraint } from './xv'
import { CLASSIC_9, createGrid, cellAt } from '../grid'

describe('createXVConstraint', () => {
  it('V means sum 5', () => {
    const c = createXVConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'v' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 2
    cellAt(grid, { r: 0, c: 1 }).value = 3
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 4
    expect(c.validate(grid)).toBe(false)
  })

  it('X means sum 10', () => {
    const c = createXVConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'x' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 7
    cellAt(grid, { r: 0, c: 1 }).value = 3
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 4
    expect(c.validate(grid)).toBe(false)
  })

  it('strict semantics: absence of mark forbids sum 5 or sum 10 across an unmarked edge', () => {
    const c = createXVConstraint({ shape: CLASSIC_9, edges: [], strict: true })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 4
    cellAt(grid, { r: 0, c: 1 }).value = 6 // sums to 10, no edge → forbidden
    expect(c.validate(grid)).toBe(false)
    cellAt(grid, { r: 0, c: 1 }).value = 8
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 1 // sums to 5, no edge → forbidden
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate restricts candidates across a V edge', () => {
    const c = createXVConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'v' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 3
    const elim = c.propagate(grid)
    // peer (0,1) must be 2
    const allowed = new Set([2])
    for (const r of elim.removals) {
      if (r.coord.r === 0 && r.coord.c === 1) expect(allowed.has(r.digit)).toBe(false)
    }
  })
})
