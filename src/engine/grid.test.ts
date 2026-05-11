import { describe, it, expect } from 'vitest'
import {
  createGrid,
  parsePuzzle,
  serializePuzzle,
  cellAt,
  peersOf,
  classicRegions,
  cloneGrid,
  setValue,
  applyEliminations,
  CLASSIC_9,
  CLASSIC_6,
  CLASSIC_16,
} from './grid'

const EASY_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

describe('createGrid', () => {
  it('builds a 9x9 grid with all cells empty and full candidates', () => {
    const grid = createGrid(CLASSIC_9)
    expect(grid.shape.size).toBe(9)
    expect(grid.cells).toHaveLength(9)
    expect(grid.cells[0]).toHaveLength(9)
    expect(cellAt(grid, { r: 0, c: 0 }).value).toBeNull()
    expect(cellAt(grid, { r: 0, c: 0 }).candidates.size).toBe(9)
    expect(cellAt(grid, { r: 8, c: 8 }).given).toBe(false)
  })

  it('builds a 6x6 grid with size 6', () => {
    const grid = createGrid(CLASSIC_6)
    expect(grid.shape.size).toBe(6)
    expect(grid.cells).toHaveLength(6)
    expect(cellAt(grid, { r: 0, c: 0 }).candidates.size).toBe(6)
  })

  it('builds a 16x16 grid with size 16', () => {
    const grid = createGrid(CLASSIC_16)
    expect(grid.shape.size).toBe(16)
    expect(cellAt(grid, { r: 0, c: 0 }).candidates.size).toBe(16)
  })
})

describe('parsePuzzle', () => {
  it('parses an 81-char puzzle string into a 9x9 grid', () => {
    const grid = parsePuzzle(EASY_PUZZLE, CLASSIC_9)
    expect(cellAt(grid, { r: 0, c: 0 }).value).toBe(5)
    expect(cellAt(grid, { r: 0, c: 0 }).given).toBe(true)
    expect(cellAt(grid, { r: 0, c: 2 }).value).toBeNull()
    expect(cellAt(grid, { r: 0, c: 2 }).given).toBe(false)
  })

  it('treats . and 0 as empty', () => {
    const dotPuzzle = EASY_PUZZLE.replaceAll('0', '.')
    const a = parsePuzzle(EASY_PUZZLE, CLASSIC_9)
    const b = parsePuzzle(dotPuzzle, CLASSIC_9)
    expect(serializePuzzle(a)).toBe(serializePuzzle(b))
  })

  it('removes candidates from peer cells when a given is placed', () => {
    const grid = parsePuzzle(EASY_PUZZLE, CLASSIC_9)
    expect(cellAt(grid, { r: 0, c: 1 }).candidates.has(5)).toBe(false)
    expect(cellAt(grid, { r: 8, c: 0 }).candidates.has(5)).toBe(false)
    expect(cellAt(grid, { r: 1, c: 1 }).candidates.has(5)).toBe(false)
  })

  it('rejects a string of wrong length', () => {
    expect(() => parsePuzzle('123', CLASSIC_9)).toThrow()
  })

  it('rejects digits out of range', () => {
    expect(() => parsePuzzle('a'.repeat(81), CLASSIC_9)).toThrow()
  })
})

describe('serializePuzzle', () => {
  it('round-trips through parsePuzzle', () => {
    const grid = parsePuzzle(EASY_PUZZLE, CLASSIC_9)
    expect(serializePuzzle(grid)).toBe(EASY_PUZZLE)
  })

  it('serializes empty cells as 0', () => {
    const grid = createGrid(CLASSIC_9)
    expect(serializePuzzle(grid)).toBe('0'.repeat(81))
  })
})

describe('cellAt', () => {
  it('returns the cell at a valid coord', () => {
    const grid = createGrid(CLASSIC_9)
    expect(cellAt(grid, { r: 3, c: 4 }).coord).toEqual({ r: 3, c: 4 })
  })

  it('throws on out-of-bounds coords', () => {
    const grid = createGrid(CLASSIC_9)
    expect(() => cellAt(grid, { r: -1, c: 0 })).toThrow()
    expect(() => cellAt(grid, { r: 0, c: 9 })).toThrow()
  })
})

describe('peersOf', () => {
  it('returns 20 unique peers for a Classic 9x9 cell', () => {
    const peers = peersOf({ r: 4, c: 4 }, CLASSIC_9)
    expect(peers.length).toBe(20)
    const set = new Set(peers.map((p) => `${p.r},${p.c}`))
    expect(set.size).toBe(20)
    expect(set.has('4,4')).toBe(false)
  })

  it('includes row, column, and box peers', () => {
    const peers = peersOf({ r: 0, c: 0 }, CLASSIC_9)
    const set = new Set(peers.map((p) => `${p.r},${p.c}`))
    expect(set.has('0,8')).toBe(true)
    expect(set.has('8,0')).toBe(true)
    expect(set.has('2,2')).toBe(true)
  })

  it('returns 12 unique peers for a Classic 6x6 cell (5 row + 5 col + 2 unique box)', () => {
    const peers = peersOf({ r: 0, c: 0 }, CLASSIC_6)
    const set = new Set(peers.map((p) => `${p.r},${p.c}`))
    expect(set.size).toBe(12)
    expect(set.has('0,0')).toBe(false)
  })
})

describe('classicRegions', () => {
  it('returns 27 regions for 9x9 (9 rows + 9 cols + 9 boxes)', () => {
    const regions = classicRegions(CLASSIC_9)
    expect(regions).toHaveLength(27)
    expect(regions.filter((r) => r.kind === 'row')).toHaveLength(9)
    expect(regions.filter((r) => r.kind === 'column')).toHaveLength(9)
    expect(regions.filter((r) => r.kind === 'box')).toHaveLength(9)
  })

  it('every region has size N cells', () => {
    for (const region of classicRegions(CLASSIC_9)) {
      expect(region.cells).toHaveLength(9)
    }
  })

  it('boxes are correctly shaped for 6x6 (2 rows x 3 cols)', () => {
    const regions = classicRegions(CLASSIC_6)
    const boxes = regions.filter((r) => r.kind === 'box')
    expect(boxes).toHaveLength(6)
    for (const box of boxes) {
      expect(box.cells).toHaveLength(6)
    }
  })
})

describe('cloneGrid', () => {
  it('produces an independent copy', () => {
    const a = parsePuzzle(EASY_PUZZLE, CLASSIC_9)
    const b = cloneGrid(a)
    cellAt(b, { r: 0, c: 2 }).value = 7
    expect(cellAt(a, { r: 0, c: 2 }).value).toBeNull()
  })

  it('clones candidate sets independently', () => {
    const a = createGrid(CLASSIC_9)
    const b = cloneGrid(a)
    cellAt(b, { r: 0, c: 0 }).candidates.delete(1)
    expect(cellAt(a, { r: 0, c: 0 }).candidates.has(1)).toBe(true)
  })
})

describe('setValue', () => {
  it('places a digit and removes candidates from peers', () => {
    const grid = createGrid(CLASSIC_9)
    setValue(grid, { r: 0, c: 0 }, 5)
    expect(cellAt(grid, { r: 0, c: 0 }).value).toBe(5)
    expect(cellAt(grid, { r: 0, c: 0 }).candidates.size).toBe(0)
    expect(cellAt(grid, { r: 0, c: 1 }).candidates.has(5)).toBe(false)
    expect(cellAt(grid, { r: 8, c: 0 }).candidates.has(5)).toBe(false)
    expect(cellAt(grid, { r: 1, c: 1 }).candidates.has(5)).toBe(false)
    expect(cellAt(grid, { r: 0, c: 4 }).candidates.has(3)).toBe(true)
  })
})

describe('applyEliminations', () => {
  it('removes candidates as specified', () => {
    const grid = createGrid(CLASSIC_9)
    applyEliminations(grid, {
      removals: [{ coord: { r: 0, c: 0 }, digit: 3 }],
      placements: [],
    })
    expect(cellAt(grid, { r: 0, c: 0 }).candidates.has(3)).toBe(false)
  })

  it('places digits as specified (also propagating to peers)', () => {
    const grid = createGrid(CLASSIC_9)
    applyEliminations(grid, {
      removals: [],
      placements: [{ coord: { r: 4, c: 4 }, digit: 7 }],
    })
    expect(cellAt(grid, { r: 4, c: 4 }).value).toBe(7)
    expect(cellAt(grid, { r: 4, c: 0 }).candidates.has(7)).toBe(false)
  })
})
