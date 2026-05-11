import { describe, it, expect } from 'vitest'
import { backtrackingSolve } from './backtrack'
import { parsePuzzle, serializePuzzle, CLASSIC_9, createGrid, setValue } from '../grid'
import { createClassicConstraint } from '../constraints/classic'
import { EASY_FIXTURES, HARD_FIXTURES } from '../__fixtures__/classic'

function loadClassic(p: string) {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  const grid = parsePuzzle(p, CLASSIC_9)
  return { ...grid, constraints: [c] }
}

describe('backtrackingSolve', () => {
  it('solves an easy puzzle and matches the known solution', () => {
    const grid = loadClassic(EASY_FIXTURES[0]!.puzzle)
    const result = backtrackingSolve(grid, { maxSolutions: 2 })
    expect(result.solutions).toHaveLength(1)
    expect(serializePuzzle(result.solutions[0]!)).toBe(EASY_FIXTURES[0]!.solution)
    expect(result.isUnique).toBe(true)
  })

  it('solves the Inkala diabolical', () => {
    const grid = loadClassic(HARD_FIXTURES[0]!.puzzle)
    const result = backtrackingSolve(grid, { maxSolutions: 2 })
    expect(result.solutions).toHaveLength(1)
    expect(serializePuzzle(result.solutions[0]!)).toBe(HARD_FIXTURES[0]!.solution)
  })

  it('finds multiple solutions when puzzle has them and reports non-unique', () => {
    const c = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = { ...createGrid(CLASSIC_9), constraints: [c] }
    const result = backtrackingSolve(grid, { maxSolutions: 2 })
    expect(result.solutions.length).toBe(2)
    expect(result.isUnique).toBe(false)
  })

  it('reports no solution when puzzle is contradictory', () => {
    const c = createClassicConstraint({ shape: CLASSIC_9 })
    const grid = { ...createGrid(CLASSIC_9), constraints: [c] }
    setValue(grid, { r: 0, c: 0 }, 5)
    setValue(grid, { r: 0, c: 1 }, 5)
    const result = backtrackingSolve(grid, { maxSolutions: 1 })
    expect(result.solutions).toHaveLength(0)
    expect(result.isUnique).toBe(false)
  })

  it('solves all easy + hard fixtures uniquely', () => {
    for (const fx of [...EASY_FIXTURES, ...HARD_FIXTURES]) {
      const grid = loadClassic(fx.puzzle)
      const result = backtrackingSolve(grid, { maxSolutions: 2 })
      expect(result.solutions).toHaveLength(1)
      expect(serializePuzzle(result.solutions[0]!)).toBe(fx.solution)
    }
  })
})
