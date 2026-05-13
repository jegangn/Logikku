import { describe, it, expect } from 'vitest'
import { createKropkiConstraint } from './kropki'
import { CLASSIC_9, createGrid, cellAt } from '../grid'

describe('createKropkiConstraint', () => {
  it('white dot enforces consecutive between adjacent cells', () => {
    const c = createKropkiConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'white-dot' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 4
    cellAt(grid, { r: 0, c: 1 }).value = 5
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 7
    expect(c.validate(grid)).toBe(false)
  })

  it('black dot enforces 1:2 ratio', () => {
    const c = createKropkiConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'black-dot' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 3
    cellAt(grid, { r: 0, c: 1 }).value = 6
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('strict semantics forbid consecutive or 1:2 across an unmarked edge', () => {
    const c = createKropkiConstraint({ shape: CLASSIC_9, edges: [], strict: true })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 4
    cellAt(grid, { r: 0, c: 1 }).value = 8 // ratio 1:2, no edge → forbidden under strict
    expect(c.validate(grid)).toBe(false)
    cellAt(grid, { r: 0, c: 1 }).value = 7
    expect(c.validate(grid)).toBe(true)
    cellAt(grid, { r: 0, c: 1 }).value = 3 // consecutive, no edge → forbidden
    expect(c.validate(grid)).toBe(false)
  })

  it('propagate eliminates impossible candidates across a white-dot edge', () => {
    const c = createKropkiConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'white-dot' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 5
    const elim = c.propagate(grid)
    // peer (0,1) must be 4 or 6
    const allowed = new Set([4, 6])
    for (const r of elim.removals) {
      if (r.coord.r === 0 && r.coord.c === 1) expect(allowed.has(r.digit)).toBe(false)
    }
  })

  it('findConflicts flags violators', () => {
    const c = createKropkiConstraint({
      shape: CLASSIC_9,
      edges: [{ from: { r: 0, c: 0 }, to: { r: 0, c: 1 }, kind: 'white-dot' }],
      strict: false,
    })
    const grid = createGrid(CLASSIC_9, [c])
    cellAt(grid, { r: 0, c: 0 }).value = 1
    cellAt(grid, { r: 0, c: 1 }).value = 5
    const conflicts = c.findConflicts!(grid)
    expect(conflicts.length).toBe(2)
  })
})
