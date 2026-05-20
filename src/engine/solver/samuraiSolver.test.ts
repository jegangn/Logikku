import { describe, it, expect } from 'vitest'
import {
  createSamuraiBoard,
  samuraiCellAt,
  setValueShared,
} from '../samurai'
import type { Digit } from '../types'
import { samuraiTechniqueSolve, samuraiBacktrackingSolve } from './samuraiSolver'
import { samuraiIsComplete, samuraiConsistencyCheck } from '@/engine'

function fillRowExcept(
  board: ReturnType<typeof createSamuraiBoard>,
  gridIdx: number,
  row: number,
  emptyCol: number,
  digits: number[],
) {
  let d = 0
  for (let c = 0; c < 9; c++) {
    if (c === emptyCol) continue
    setValueShared(board, gridIdx, { r: row, c }, digits[d++] as Digit)
  }
}

describe('samuraiTechniqueSolve', () => {
  it('solves a trivial single-cell naked single in the center grid', () => {
    const board = createSamuraiBoard()
    // Fill row 4 of center with 1..9 leaving col 4 empty. The naked single
    // technique should place the missing digit (must be 5 to complete 1-9).
    fillRowExcept(board, 0, 4, 4, [1, 2, 3, 4, 6, 7, 8, 9])
    const result = samuraiTechniqueSolve(board)
    expect(samuraiCellAt(result.board, 0, { r: 4, c: 4 }).value).toBe(5)
  })

  it('propagates a placement in the NW corners shared box to the center', () => {
    const board = createSamuraiBoard()
    // Fill the NW corners bottom-right box (cornerBox r:2,c:2) leaving cell (7,7) empty.
    // The corners box constraint forces (7,7) to be the missing digit. Then via
    // the shared overlap, the center's (1,1) must also receive the same digit.
    const filled = [1, 2, 3, 4, 5, 6, 7, 8]
    let i = 0
    for (let r = 6; r < 9; r++) {
      for (let c = 6; c < 9; c++) {
        if (r === 7 && c === 7) continue
        setValueShared(board, 1, { r, c }, filled[i++] as Digit)
      }
    }
    const result = samuraiTechniqueSolve(board)
    // (7,7) is missing — must be 9.
    expect(samuraiCellAt(result.board, 1, { r: 7, c: 7 }).value).toBe(9)
    // And the center (1,1) should also be 9 via the shared overlap.
    expect(samuraiCellAt(result.board, 0, { r: 1, c: 1 }).value).toBe(9)
  })

  it('returns solved=false when there are still unsolved cells beyond technique reach', () => {
    const board = createSamuraiBoard()
    const result = samuraiTechniqueSolve(board)
    expect(result.solved).toBe(false)
    expect(result.stepsBySubgrid.length).toBe(5)
  })

  it('reports hardestTier as the max across sub-grids', () => {
    const board = createSamuraiBoard()
    fillRowExcept(board, 0, 4, 4, [1, 2, 3, 4, 6, 7, 8, 9])
    const result = samuraiTechniqueSolve(board)
    expect(result.hardestTier).toBeGreaterThanOrEqual(1)
  })
})

describe('samuraiBacktrackingSolve', () => {
  it('finds a single solution for an empty board with maxSolutions=1', () => {
    const board = createSamuraiBoard()
    const result = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
    expect(result.hasSolution).toBe(true)
    expect(result.solutions.length).toBe(1)
  })

  it('reports isUnique=false when maxSolutions=2 finds 2 solutions', () => {
    const board = createSamuraiBoard()
    const result = samuraiBacktrackingSolve(board, { maxSolutions: 2 })
    expect(result.solutions.length).toBe(2)
    expect(result.isUnique).toBe(false)
  })

  it('reports hasSolution=true on a tightly-constrained board', () => {
    const board = createSamuraiBoard()
    // Fill row 4 of center with 1..9 leaving col 4 empty (forces 5).
    const digits = [1, 2, 3, 4, 6, 7, 8, 9]
    let d = 0
    for (let c = 0; c < 9; c++) {
      if (c === 4) continue
      setValueShared(board, 0, { r: 4, c }, digits[d++] as Digit)
    }
    const result = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
    expect(result.hasSolution).toBe(true)
  })
})

describe('samuraiBacktrackingSolve — randomization', () => {
  it('with randomized=false, two calls return the same first solution', () => {
    const a = samuraiBacktrackingSolve(createSamuraiBoard(), { maxSolutions: 1 })
    const b = samuraiBacktrackingSolve(createSamuraiBoard(), { maxSolutions: 1 })
    expect(a.hasSolution).toBe(true)
    expect(b.hasSolution).toBe(true)
    expect(serializeBoard(a)).toBe(serializeBoard(b))
  })

  it('with randomized=true, seed=1 returns a valid solved samurai board', () => {
    const result = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 1,
    })
    expect(result.hasSolution).toBe(true)
    expect(result.solvedBoard).toBeDefined()
    expect(samuraiIsComplete(result.solvedBoard!)).toBe(true)
    expect(() => samuraiConsistencyCheck(result.solvedBoard!)).not.toThrow()
  })

  it('with randomized=true, same seed produces the same board', () => {
    const a = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 42,
    })
    const b = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 42,
    })
    expect(serializeBoard(a)).toBe(serializeBoard(b))
  })

  it('with randomized=true, different seeds produce different boards', () => {
    const a = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 1,
    })
    const b = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 2,
    })
    expect(serializeBoard(a)).not.toBe(serializeBoard(b))
  })
})

function serializeBoard(r: { solvedBoard?: { grids: ReadonlyArray<{ cells: ReadonlyArray<ReadonlyArray<{ value: number | null }>> }> } }): string {
  const board = r.solvedBoard
  if (!board) return ''
  const parts: string[] = []
  for (const grid of board.grids) {
    for (const row of grid.cells) {
      for (const cell of row) parts.push(String(cell.value ?? 0))
    }
  }
  return parts.join('')
}
