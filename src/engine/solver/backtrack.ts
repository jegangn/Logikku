import { applyEliminations, cellAt, cloneGrid, setValue } from '../grid'
import type { Cell, Coord, Grid } from '../types'

export interface BacktrackOptions {
  readonly maxSolutions: number
}

export interface BacktrackResult {
  readonly solutions: ReadonlyArray<Grid>
  readonly isUnique: boolean
  readonly hasSolution: boolean
}

export function backtrackingSolve(grid: Grid, opts: BacktrackOptions): BacktrackResult {
  const solutions: Grid[] = []
  const max = Math.max(1, opts.maxSolutions)

  function step(g: Grid): void {
    if (solutions.length >= max) return

    if (!propagateAll(g)) return
    if (hasEmptyCandidateCell(g)) return
    for (const constraint of g.constraints) {
      if (!constraint.validate(g)) return
    }

    const target = pickCellWithFewestCandidates(g)
    if (!target) {
      solutions.push(cloneGrid(g))
      return
    }

    for (const digit of target.candidates) {
      const child = cloneGrid(g)
      setValue(child, target.coord, digit)
      step(child)
      if (solutions.length >= max) return
    }
  }

  step(cloneGrid(grid))
  return {
    solutions,
    isUnique: solutions.length === 1,
    hasSolution: solutions.length > 0,
  }
}

function propagateAll(grid: Grid): boolean {
  let changed = true
  let safety = 0
  while (changed) {
    changed = false
    for (const constraint of grid.constraints) {
      const e = constraint.propagate(grid)
      if (e.removals.length === 0 && e.placements.length === 0) continue
      applyEliminations(grid, e)
      changed = true
    }
    if (++safety > 256) return false
  }
  return true
}

function hasEmptyCandidateCell(grid: Grid): boolean {
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value === null && cell.candidates.size === 0) return true
    }
  }
  return false
}

function pickCellWithFewestCandidates(grid: Grid): Cell | null {
  let best: Cell | null = null
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value !== null) continue
      if (best === null || cell.candidates.size < best.candidates.size) {
        best = cell
      }
    }
  }
  return best
}

export type { Coord }
