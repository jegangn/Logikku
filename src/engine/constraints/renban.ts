import { cellAt, CLASSIC_9 } from '../grid'
import type {
  CandidateRemoval,
  Constraint,
  Coord,
  Digit,
  Eliminations,
  Grid,
  GridShape,
  NamedRegion,
} from '../types'

let counter = 0

/**
 * Renban path: cells form a set of consecutive distinct digits (in any
 * order). For length L on size-n grid: the digits are some {k, k+1, ..., k+L-1}
 * with 1 ≤ k and k+L-1 ≤ n.
 */
export interface RenbanPath {
  readonly id: string
  readonly cells: ReadonlyArray<Coord>
}

export interface RenbanParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly paths?: ReadonlyArray<RenbanPath>
}

function validatePath(path: RenbanPath, shape: GridShape): void {
  if (path.cells.length < 2) {
    throw new Error(`renban ${path.id} must have at least 2 cells`)
  }
  if (path.cells.length > shape.size) {
    throw new Error(
      `renban ${path.id} has ${path.cells.length} cells; max is ${shape.size}`,
    )
  }
  const seen = new Set<string>()
  for (const co of path.cells) {
    const key = `${co.r},${co.c}`
    if (seen.has(key)) {
      throw new Error(`renban ${path.id} repeats cell ${key}`)
    }
    seen.add(key)
  }
}

export interface RenbanConstraint extends Constraint {
  readonly kind: 'renban'
  readonly paths: ReadonlyArray<RenbanPath>
}

export function createRenbanConstraint(
  params: RenbanParams = {},
): RenbanConstraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `renban:${++counter}`
  const paths = params.paths ?? []
  for (const p of paths) validatePath(p, shape)

  // Renban paths require distinct values, so they each act as a no-repeat
  // region surfaced under kind 'path' (consumed by existing peer code).
  const regions: NamedRegion[] = paths.map((p) => ({
    kind: 'path',
    cells: p.cells.map((co) => ({ r: co.r, c: co.c })),
    id: p.id,
  }))

  return {
    id,
    kind: 'renban',
    regions,
    paths,
    validate(grid: Grid): boolean {
      for (const path of paths) {
        const vals: Digit[] = []
        for (const co of path.cells) {
          const v = cellAt(grid, co).value
          if (v === null) {
            vals.length = 0
            break
          }
          vals.push(v)
        }
        if (vals.length === 0) continue
        const set = new Set(vals)
        if (set.size !== vals.length) return false
        const lo = Math.min(...vals)
        const hi = Math.max(...vals)
        if (hi - lo !== vals.length - 1) return false
      }
      return true
    },
    propagate(grid: Grid): Eliminations {
      const removals: CandidateRemoval[] = []
      const removedKeys = new Set<string>()
      const n = grid.shape.size
      function remove(coord: Coord, digit: Digit): void {
        const key = `${coord.r},${coord.c}:${digit}`
        if (removedKeys.has(key)) return
        const cell = cellAt(grid, coord)
        if (!cell.candidates.has(digit)) return
        removedKeys.add(key)
        removals.push({ coord, digit })
      }

      for (const path of paths) {
        const L = path.cells.length
        // Collect placed digits and unplaced cells.
        const placed: Digit[] = []
        const placedSet = new Set<Digit>()
        for (const co of path.cells) {
          const cell = cellAt(grid, co)
          if (cell.value !== null) {
            placed.push(cell.value)
            placedSet.add(cell.value)
          }
        }

        // Window range: lo ∈ [max(1, max(placed)-L+1), min(min(placed), n-L+1)].
        // If nothing placed, lo ∈ [1, n-L+1].
        let loMin = 1
        let loMax = n - L + 1
        if (placed.length > 0) {
          const minP = Math.min(...placed)
          const maxP = Math.max(...placed)
          loMin = Math.max(loMin, maxP - L + 1)
          loMax = Math.min(loMax, minP)
        }
        if (loMin > loMax) continue // contradiction
        // Union of windows = [loMin, loMax + L - 1].
        const allowedLo = loMin
        const allowedHi = loMax + L - 1

        for (const co of path.cells) {
          const cell = cellAt(grid, co)
          if (cell.value !== null) continue
          for (const d of cell.candidates) {
            if (d < allowedLo || d > allowedHi) {
              remove(co, d)
              continue
            }
            // No-repeat within the renban set.
            if (placedSet.has(d)) {
              remove(co, d)
            }
          }
        }
      }

      return { removals, placements: [] }
    },
    findConflicts(grid: Grid): ReadonlyArray<Coord> {
      const out: Coord[] = []
      const seen = new Set<string>()
      function flag(co: Coord): void {
        const key = `${co.r},${co.c}`
        if (seen.has(key)) return
        seen.add(key)
        out.push(co)
      }
      for (const path of paths) {
        const vals: Digit[] = []
        let complete = true
        for (const co of path.cells) {
          const v = cellAt(grid, co).value
          if (v === null) {
            complete = false
            break
          }
          vals.push(v)
        }
        if (!complete) continue
        const set = new Set(vals)
        let bad = false
        if (set.size !== vals.length) bad = true
        else {
          const lo = Math.min(...vals)
          const hi = Math.max(...vals)
          if (hi - lo !== vals.length - 1) bad = true
        }
        if (bad) {
          for (const co of path.cells) flag(co)
        }
      }
      return out
    },
  }
}

export function renbanPathsOf(grid: Grid): ReadonlyArray<RenbanPath> {
  for (const constraint of grid.constraints) {
    if (constraint.kind === 'renban') {
      return (constraint as RenbanConstraint).paths
    }
  }
  return []
}
