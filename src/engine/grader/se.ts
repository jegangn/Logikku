import { techniqueSolve } from '../solver/techniqueSolver'
import { backtrackingSolve } from '../solver/backtrack'
import type { Grid, Step } from '../types'

export type Difficulty =
  | 'very-easy'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'tough'
  | 'expert'
  | 'diabolical'

export interface GradeResult {
  readonly solvable: boolean
  readonly se: number
  readonly difficulty: Difficulty
  readonly hardestTier: number
  readonly steps: ReadonlyArray<Step>
}

export function gradePuzzle(grid: Grid): GradeResult {
  const techResult = techniqueSolve(grid)
  if (techResult.solved) {
    const se = computeSE(techResult.hardestTier, techResult.steps)
    return {
      solvable: true,
      se,
      difficulty: difficultyFromSE(se),
      hardestTier: techResult.hardestTier,
      steps: techResult.steps,
    }
  }

  const bt = backtrackingSolve(grid, { maxSolutions: 1 })
  if (bt.hasSolution) {
    return {
      solvable: true,
      se: 9.0,
      difficulty: 'diabolical',
      hardestTier: 9,
      steps: techResult.steps,
    }
  }

  return {
    solvable: false,
    se: 0,
    difficulty: 'very-easy',
    hardestTier: 0,
    steps: [],
  }
}

const TIER_BANDS: Record<number, readonly [number, number]> = {
  1: [1.0, 2.4],
  2: [2.7, 3.9],
  3: [4.0, 5.9],
  4: [6.0, 7.9],
}

function computeSE(hardestTier: number, steps: ReadonlyArray<Step>): number {
  const band = TIER_BANDS[hardestTier]
  if (!band) return hardestTier === 0 ? 0 : 9.0
  const [lo, hi] = band
  const hardSteps = steps.filter((s) => s.tier === hardestTier).length
  const ratio = Math.min(1, hardSteps / 12)
  return Math.round((lo + (hi - lo) * ratio) * 10) / 10
}

export function difficultyFromSE(se: number): Difficulty {
  if (se < 1.5) return 'very-easy'
  if (se < 2.5) return 'easy'
  if (se < 4.0) return 'medium'
  if (se < 6.0) return 'hard'
  if (se < 6.5) return 'tough'
  if (se < 8.0) return 'expert'
  return 'diabolical'
}
