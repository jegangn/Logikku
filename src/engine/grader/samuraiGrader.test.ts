import { describe, it, expect } from 'vitest'
import { createSamuraiBoard, setValueShared } from '../samurai'
import { samuraiBacktrackingSolve } from '../solver/samuraiSolver'
import { gradeSamurai } from './samuraiGrader'
import type { Digit } from '../types'

describe('gradeSamurai', () => {
  it('returns solvable=true on a near-solved board', () => {
    const board = createSamuraiBoard()
    // Fill row 4 of center with 1..9 leaving col 4 empty (naked single → 5).
    const digits = [1, 2, 3, 4, 6, 7, 8, 9]
    let d = 0
    for (let c = 0; c < 9; c++) {
      if (c === 4) continue
      setValueShared(board, 0, { r: 4, c }, digits[d++] as Digit)
    }
    const result = gradeSamurai(board)
    // The board is not fully solved (most cells still empty), so the grader
    // falls back to backtrack. The important contract here is that solvable
    // is true and an SE value is returned.
    expect(result.solvable).toBe(true)
    expect(result.se).toBeGreaterThan(0)
  })

  it('grades a fully-solved-except-one board via technique solve', () => {
    // Build a fully solved board via backtrack, then blank one cell.
    const seeded = createSamuraiBoard()
    const bt = samuraiBacktrackingSolve(seeded, { maxSolutions: 1 })
    expect(bt.hasSolution).toBe(true)
    const fullBoard = bt.solutions[0]!
    // Blank center (4,4). cell.value is mutable on the existing Grid type.
    const cell = fullBoard.grids[0]!.cells[4]![4]!
    cell.value = null
    cell.candidates = new Set<Digit>([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const result = gradeSamurai(fullBoard)
    expect(result.solvable).toBe(true)
    expect(result.se).toBeGreaterThanOrEqual(1.0)
  })
})
