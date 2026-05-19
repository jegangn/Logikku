import { describe, it, expect } from 'vitest'
import { gradePuzzle, difficultyFromSE } from './se'
import { parsePuzzle, createGrid, setValue, CLASSIC_9, CLASSIC_16, cellAt, cloneGrid, recomputeCandidates } from '../grid'
import { createClassicConstraint } from '../constraints/classic'
import { backtrackingSolve } from '../solver/backtrack'
import type { Digit } from '../types'
import { EASY_FIXTURES, HARD_FIXTURES } from '../__fixtures__/classic'

function loadClassic(p: string) {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  const grid = parsePuzzle(p, CLASSIC_9)
  return { ...grid, constraints: [c] }
}

describe('gradePuzzle', () => {
  it('grades easy fixtures at very-easy/easy/medium difficulty', () => {
    for (const fx of EASY_FIXTURES) {
      const result = gradePuzzle(loadClassic(fx.puzzle))
      expect(result.solvable).toBe(true)
      expect(result.difficulty).toMatch(/very-easy|easy|medium/)
      expect(result.se).toBeLessThanOrEqual(4.0)
    }
  })

  it('grades the Inkala diabolical at or above hard', () => {
    const result = gradePuzzle(loadClassic(HARD_FIXTURES[0]!.puzzle))
    expect(result.se).toBeGreaterThanOrEqual(4.0)
  })

  it('produces consistent results across runs (deterministic)', () => {
    const a = gradePuzzle(loadClassic(EASY_FIXTURES[0]!.puzzle))
    const b = gradePuzzle(loadClassic(EASY_FIXTURES[0]!.puzzle))
    expect(a.se).toBe(b.se)
    expect(a.difficulty).toBe(b.difficulty)
    expect(a.hardestTier).toBe(b.hardestTier)
  })

  it('includes the technique trace and hardest tier', () => {
    const result = gradePuzzle(loadClassic(EASY_FIXTURES[0]!.puzzle))
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.hardestTier).toBeGreaterThanOrEqual(1)
  })

  it('reports unsolvable for a contradictory grid', () => {
    const c = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = { ...createGrid(CLASSIC_9), constraints: [c] }
    setValue(grid, { r: 0, c: 0 }, 5)
    setValue(grid, { r: 0, c: 1 }, 5)
    const result = gradePuzzle(grid)
    expect(result.solvable).toBe(false)
    expect(result.se).toBe(0)
  })
})

describe('difficultyFromSE', () => {
  it('maps SE scores to the documented bands', () => {
    expect(difficultyFromSE(1.2)).toBe('very-easy')
    expect(difficultyFromSE(2.0)).toBe('easy')
    expect(difficultyFromSE(3.5)).toBe('medium')
    expect(difficultyFromSE(5.0)).toBe('hard')
    expect(difficultyFromSE(6.2)).toBe('tough')
    expect(difficultyFromSE(7.5)).toBe('expert')
    expect(difficultyFromSE(9.5)).toBe('diabolical')
  })

  it('boundary values fall into the higher band', () => {
    expect(difficultyFromSE(1.5)).toBe('easy')
    expect(difficultyFromSE(2.5)).toBe('medium')
    expect(difficultyFromSE(4.0)).toBe('hard')
    expect(difficultyFromSE(6.0)).toBe('tough')
    expect(difficultyFromSE(6.5)).toBe('expert')
    expect(difficultyFromSE(8.0)).toBe('diabolical')
  })
})

describe('gradePuzzle at N=16', () => {
  it('grades a singles-only 16x16 puzzle in the 1.0-3.0 SE range', { timeout: 30000 }, () => {
    const shape = CLASSIC_16
    const empty = createGrid(shape, [createClassicConstraint({ shape })])
    const filled = backtrackingSolve(empty, { maxSolutions: 1 })
    expect(filled.hasSolution).toBe(true)
    const solution = cloneGrid(filled.solutions[0]!)
    const blanks: Array<[number, number]> = [
      [0, 0], [1, 5], [2, 10], [3, 15],
      [7, 3], [9, 8], [12, 2], [14, 13],
    ]
    for (const [r, c] of blanks) {
      const cell = cellAt(solution, { r, c })
      cell.value = null
      cell.candidates = new Set<Digit>()
      for (let d = 1; d <= 16; d++) cell.candidates.add(d as Digit)
    }
    recomputeCandidates(solution)
    const result = gradePuzzle(solution)
    expect(result.solvable).toBe(true)
    expect(result.se).toBeGreaterThanOrEqual(1.0)
    expect(result.se).toBeLessThanOrEqual(3.0)
  })
})
