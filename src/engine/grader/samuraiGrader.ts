import {
  samuraiTechniqueSolve,
  samuraiBacktrackingSolve,
} from '../solver/samuraiSolver'
import { gradePuzzle, difficultyFromSE, type Difficulty } from './se'
import type { SamuraiBoard, Step } from '../types'

export interface SamuraiGradeResult {
  readonly solvable: boolean
  readonly se: number
  readonly difficulty: Difficulty
  readonly hardestTier: number
  readonly stepsBySubgrid: ReadonlyArray<ReadonlyArray<Step>>
}

export function gradeSamurai(board: SamuraiBoard): SamuraiGradeResult {
  const techResult = samuraiTechniqueSolve(board)
  if (techResult.solved) {
    // Per-sub-grid SE; result SE = max across sub-grids.
    let maxSE = 0
    for (let g = 0; g < 5; g++) {
      const subResult = gradePuzzle(board.grids[g]!)
      if (subResult.se > maxSE) maxSE = subResult.se
    }
    return {
      solvable: true,
      se: maxSE,
      difficulty: difficultyFromSE(maxSE),
      hardestTier: techResult.hardestTier,
      stepsBySubgrid: techResult.stepsBySubgrid,
    }
  }

  const bt = samuraiBacktrackingSolve(board, { maxSolutions: 1 })
  if (bt.hasSolution) {
    return {
      solvable: true,
      se: 9.0,
      difficulty: 'diabolical',
      hardestTier: 9,
      stepsBySubgrid: techResult.stepsBySubgrid,
    }
  }
  return {
    solvable: false,
    se: 0,
    difficulty: 'very-easy',
    hardestTier: 0,
    stepsBySubgrid: [],
  }
}
