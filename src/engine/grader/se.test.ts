import { describe, it, expect } from 'vitest'
import { gradePuzzle, difficultyFromSE } from './se'
import { parsePuzzle, createGrid, setValue, CLASSIC_9 } from '../grid'
import { createClassicConstraint } from '../constraints/classic'
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
    expect(difficultyFromSE(7.0)).toBe('expert')
    expect(difficultyFromSE(9.5)).toBe('diabolical')
  })
})
