import { applyEliminations, cellAt } from '../grid'
import {
  samuraiCloneBoard,
  samuraiSharedLocations,
  setValueShared,
} from '../samurai'
import type { Digit, SamuraiBoard, Step } from '../types'
import {
  techniqueSolve,
  type TechniqueSolveOptions,
} from './techniqueSolver'

export interface SamuraiSolveResult {
  readonly board: SamuraiBoard
  readonly solved: boolean
  readonly hardestTier: number
  readonly stepsBySubgrid: ReadonlyArray<ReadonlyArray<Step>>
}

const MAX_ITERATIONS = 1024

/**
 * Solve a SamuraiBoard by repeatedly applying technique-based solving to each
 * sub-grid and syncing any placements that land on shared cells. Terminates
 * when a full pass produces no new placements or eliminations.
 */
export function samuraiTechniqueSolve(
  input: SamuraiBoard,
  opts?: TechniqueSolveOptions,
): SamuraiSolveResult {
  const board = samuraiCloneBoard(input)
  const stepsBySubgrid: Step[][] = [[], [], [], [], []]
  let hardestTier = 0

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let progressed = false
    for (let g = 0; g < 5; g++) {
      const result = techniqueSolve(board.grids[g]!, opts)
      // Apply each step's eliminations to the live sub-grid, recording the step.
      for (const step of result.steps) {
        applyEliminations(board.grids[g]!, step.eliminations)
        stepsBySubgrid[g]!.push(step)
        if (step.tier > hardestTier) hardestTier = step.tier
        progressed = true
        // For any placements that target shared cells, propagate to siblings.
        for (const placement of step.eliminations.placements) {
          const locations = samuraiSharedLocations(board, g, placement.coord)
          if (locations.length > 1) {
            for (const loc of locations) {
              if (loc.grid === g) continue
              const sibling = cellAt(board.grids[loc.grid]!, loc.coord)
              if (sibling.value === null) {
                setValueShared(board, loc.grid, loc.coord, placement.digit)
              }
            }
          }
        }
      }
    }
    if (!progressed) break
  }

  const solved = boardIsFull(board)
  return { board, solved, hardestTier, stepsBySubgrid }
}

function boardIsFull(board: SamuraiBoard): boolean {
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        if (cellAt(grid, { r, c }).value === null) return false
      }
    }
  }
  return true
}

export interface SamuraiBacktrackOptions {
  readonly maxSolutions: number
}

export interface SamuraiBacktrackResult {
  readonly solutions: ReadonlyArray<SamuraiBoard>
  readonly hasSolution: boolean
  readonly isUnique: boolean
}

interface MRVPick {
  readonly gridIdx: number
  readonly coord: { r: number; c: number }
  readonly candidates: ReadonlyArray<number>
}

function pickMRV(board: SamuraiBoard): MRVPick | null {
  let best: MRVPick | null = null
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        const cell = cellAt(grid, { r, c })
        if (cell.value !== null) continue
        const candidates = [...cell.candidates]
        if (candidates.length === 0) return { gridIdx: g, coord: { r, c }, candidates }
        if (!best || candidates.length < best.candidates.length) {
          best = { gridIdx: g, coord: { r, c }, candidates }
          if (candidates.length === 1) return best
        }
      }
    }
  }
  return best
}

export function samuraiBacktrackingSolve(
  input: SamuraiBoard,
  opts: SamuraiBacktrackOptions,
): SamuraiBacktrackResult {
  const solutions: SamuraiBoard[] = []
  const max = Math.max(1, opts.maxSolutions)

  function step(current: SamuraiBoard): void {
    if (solutions.length >= max) return

    // Run technique solve as propagation; this also catches contradictions.
    const propagated = samuraiTechniqueSolve(current)
    const board = propagated.board

    // Per-sub-grid validate check.
    for (let g = 0; g < 5; g++) {
      for (const constraint of board.grids[g]!.constraints) {
        if (!constraint.validate(board.grids[g]!)) return
      }
    }

    // Empty-candidate check for any unfilled cell.
    for (let g = 0; g < 5; g++) {
      const grid = board.grids[g]!
      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const cell = cellAt(grid, { r, c })
          if (cell.value === null && cell.candidates.size === 0) return
        }
      }
    }

    if (boardIsFull(board)) {
      solutions.push(board)
      return
    }

    const pick = pickMRV(board)
    if (!pick) {
      solutions.push(board)
      return
    }
    if (pick.candidates.length === 0) return

    for (const digit of pick.candidates) {
      const next = samuraiCloneBoard(board)
      setValueShared(next, pick.gridIdx, pick.coord, digit as Digit)
      step(next)
      if (solutions.length >= max) return
    }
  }

  step(samuraiCloneBoard(input))
  return {
    solutions,
    hasSolution: solutions.length > 0,
    isUnique: solutions.length === 1,
  }
}
