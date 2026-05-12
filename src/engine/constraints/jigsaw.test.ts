import { describe, it, expect } from 'vitest'
import { CLASSIC_9, cellAt, createGrid } from '../grid'
import {
  createJigsawConstraint,
  defaultClassicJigsawPieces,
  flatToCoords,
} from './jigsaw'
import type { Coord } from '../types'

function rowStripPieces(): Coord[][] {
  // Nine 9-cell pieces, each a full row. Valid partition.
  const pieces: Coord[][] = []
  for (let r = 0; r < 9; r++) {
    const piece: Coord[] = []
    for (let c = 0; c < 9; c++) piece.push({ r, c })
    pieces.push(piece)
  }
  return pieces
}

describe('createJigsawConstraint', () => {
  it('default pieces is the classic 3x3 box partition', () => {
    const pieces = defaultClassicJigsawPieces(CLASSIC_9)
    expect(pieces).toHaveLength(9)
    for (const piece of pieces) expect(piece).toHaveLength(9)
  })

  it('exposes 9 row + 9 col + 9 jigsaw regions', () => {
    const c = createJigsawConstraint({ shape: CLASSIC_9 })
    expect(c.kind).toBe('jigsaw')
    expect(c.regions).toHaveLength(27)
    const kinds = c.regions.map((r) => r.kind).sort()
    expect(kinds.filter((k) => k === 'row')).toHaveLength(9)
    expect(kinds.filter((k) => k === 'column')).toHaveLength(9)
    expect(kinds.filter((k) => k === 'jigsaw')).toHaveLength(9)
  })

  it('rejects partitions missing cells', () => {
    expect(() =>
      createJigsawConstraint({
        shape: CLASSIC_9,
        pieces: [Array.from({ length: 8 }, (_, i) => ({ r: 0, c: i }))],
      }),
    ).toThrow()
  })

  it('rejects pieces with overlapping cells', () => {
    const pieces = rowStripPieces()
    // Force overlap: change piece 1's first cell to piece 0's first cell
    const overlapping = pieces.map((p) => p.slice())
    overlapping[1]![0] = { r: 0, c: 0 }
    expect(() =>
      createJigsawConstraint({ shape: CLASSIC_9, pieces: overlapping }),
    ).toThrow()
  })

  it('validate detects a duplicate within a jigsaw piece', () => {
    const c = createJigsawConstraint({ shape: CLASSIC_9, pieces: rowStripPieces() })
    const grid = createGrid(CLASSIC_9, [c])
    // Pieces are row strips. (0,0) and (0,5) are in the same piece (row 0).
    cellAt(grid, { r: 0, c: 0 }).value = 5
    cellAt(grid, { r: 0, c: 5 }).value = 5
    expect(c.validate(grid)).toBe(false)
  })

  it('validate ignores duplicates in different pieces', () => {
    const c = createJigsawConstraint({ shape: CLASSIC_9, pieces: rowStripPieces() })
    const grid = createGrid(CLASSIC_9, [c])
    // (0,0) and (5,5) are in different pieces (different rows), different
    // columns. The duplicate digit on different rows/cols is fine.
    cellAt(grid, { r: 0, c: 0 }).value = 7
    cellAt(grid, { r: 5, c: 5 }).value = 7
    expect(c.validate(grid)).toBe(true)
  })

  it('propagate finds a hidden single within a jigsaw piece', () => {
    const pieces = rowStripPieces()
    const c = createJigsawConstraint({ shape: CLASSIC_9, pieces })
    const grid = createGrid(CLASSIC_9, [c])
    // Make digit 4 placeable only at (3,4) within piece-3 (row 3).
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue
      cellAt(grid, { r: 3, c: i }).candidates.delete(4)
    }
    const result = c.propagate(grid)
    const placed4 = result.placements.find(
      (p) => p.digit === 4 && p.coord.r === 3 && p.coord.c === 4,
    )
    expect(placed4).toBeDefined()
  })

  it('flatToCoords converts indices correctly', () => {
    const coords = flatToCoords([0, 1, 9, 80], 9)
    expect(coords).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 8, c: 8 },
    ])
  })
})
