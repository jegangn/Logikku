import { applyEliminations, cellAt, cloneGrid } from '../grid'
import type { Grid, Step, Technique } from '../types'
import { nakedSingle } from './techniques/nakedSingle'
import { hiddenSingle } from './techniques/hiddenSingle'
import { diagonalHiddenSingle } from './techniques/diagonalHiddenSingle'
import { forbiddenPairElimination } from './techniques/forbiddenPairElimination'
import { lockedCandidatesPointing } from './techniques/lockedCandidatesPointing'
import { lockedCandidatesClaiming } from './techniques/lockedCandidatesClaiming'
import { nakedPair, nakedTriple, nakedQuad } from './techniques/nakedSubset'
import { hiddenPair, hiddenTriple, hiddenQuad } from './techniques/hiddenSubset'
import { xWing, swordfish } from './techniques/fish'
import { xyWing } from './techniques/xyWing'
import { simpleColoring } from './techniques/simpleColoring'
import { cage45Innie } from './techniques/killer/cage45'

export const ALL_TECHNIQUES: ReadonlyArray<Technique> = [
  forbiddenPairElimination,
  nakedSingle,
  diagonalHiddenSingle,
  hiddenSingle,
  cage45Innie,
  lockedCandidatesPointing,
  lockedCandidatesClaiming,
  nakedPair,
  hiddenPair,
  nakedTriple,
  hiddenTriple,
  nakedQuad,
  hiddenQuad,
  xWing,
  swordfish,
  xyWing,
  simpleColoring,
]

export interface TechniqueSolveOptions {
  readonly techniques?: ReadonlyArray<Technique>
  readonly maxSteps?: number
}

export interface TechniqueSolveResult {
  readonly grid: Grid
  readonly solved: boolean
  readonly steps: ReadonlyArray<Step>
  readonly hardestTier: number
}

export function techniqueSolve(input: Grid, opts: TechniqueSolveOptions = {}): TechniqueSolveResult {
  const techniques = opts.techniques ?? ALL_TECHNIQUES
  const maxSteps = opts.maxSteps ?? 1024
  const grid = cloneGrid(input)
  const steps: Step[] = []
  let hardestTier = 0

  for (let iter = 0; iter < maxSteps; iter++) {
    const step = nextStep(grid, techniques)
    if (!step) break
    applyEliminations(grid, step.eliminations)
    steps.push(step)
    if (step.tier > hardestTier) hardestTier = step.tier
    if (isSolved(grid)) {
      return { grid, solved: true, steps, hardestTier }
    }
  }

  return { grid, solved: isSolved(grid), steps, hardestTier }
}

function nextStep(grid: Grid, techniques: ReadonlyArray<Technique>): Step | null {
  for (const technique of techniques) {
    const step = technique.apply(grid)
    if (step) return step
  }
  return null
}

function isSolved(grid: Grid): boolean {
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      if (cellAt(grid, { r, c }).value === null) return false
    }
  }
  return true
}
