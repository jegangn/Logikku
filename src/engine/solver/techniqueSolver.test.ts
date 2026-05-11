import { describe, it, expect } from 'vitest'
import { techniqueSolve, ALL_TECHNIQUES } from './techniqueSolver'
import { parsePuzzle, serializePuzzle, CLASSIC_9 } from '../grid'
import { createClassicConstraint } from '../constraints/classic'
import { EASY_FIXTURES } from '../__fixtures__/classic'

function loadClassic(p: string) {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  const grid = parsePuzzle(p, CLASSIC_9)
  return { ...grid, constraints: [c] }
}

describe('techniqueSolve', () => {
  it('exposes a tier-sorted technique list with names', () => {
    expect(ALL_TECHNIQUES.length).toBeGreaterThanOrEqual(10)
    const tiers = ALL_TECHNIQUES.map((t) => t.tier)
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]!).toBeGreaterThanOrEqual(tiers[i - 1]!)
    }
    expect(ALL_TECHNIQUES.map((t) => t.id)).toContain('naked-single')
    expect(ALL_TECHNIQUES.map((t) => t.id)).toContain('hidden-single')
  })

  it('solves easy fixture puzzles using techniques only', () => {
    for (const fx of EASY_FIXTURES) {
      const grid = loadClassic(fx.puzzle)
      const result = techniqueSolve(grid)
      expect(result.solved).toBe(true)
      expect(serializePuzzle(result.grid)).toBe(fx.solution)
    }
  })

  it('records the hardest tier required and a step-by-step trace', () => {
    const grid = loadClassic(EASY_FIXTURES[0]!.puzzle)
    const result = techniqueSolve(grid)
    expect(result.steps.length).toBeGreaterThan(0)
    expect(result.hardestTier).toBeGreaterThanOrEqual(1)
    expect(result.steps[0]!.tier).toBe(result.steps[0]!.tier)
  })

  it('stops without changing the grid if no technique applies', () => {
    const c = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = parsePuzzle('0'.repeat(81), CLASSIC_9)
    const result = techniqueSolve({ ...grid, constraints: [c] })
    expect(result.solved).toBe(false)
    expect(result.steps).toHaveLength(0)
  })

  it('applies the cheapest tier first when multiple techniques could fire', () => {
    const grid = loadClassic(EASY_FIXTURES[0]!.puzzle)
    const result = techniqueSolve(grid)
    expect(result.steps[0]!.tier).toBeLessThanOrEqual(2)
  })
})
