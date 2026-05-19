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
 * German Whispers path: adjacent cells along the path differ by at least 5.
 * Formally, |cells[i] - cells[i+1]| ≥ 5 for every i. On a 9-digit board, that
 * forces alternation between "low" (1-4) and "high" (6-9) bands — 5 is
 * sandwiched and never participates in a valid neighbour pair.
 */
export interface GermanWhispersPath {
  readonly id: string
  readonly cells: ReadonlyArray<Coord>
}

export interface GermanWhispersParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly paths?: ReadonlyArray<GermanWhispersPath>
  /** Minimum difference between adjacent cells. Defaults to 5. */
  readonly minDiff?: number
}

function validatePath(path: GermanWhispersPath): void {
  if (path.cells.length < 2) {
    throw new Error(`german-whispers ${path.id} must have at least 2 cells`)
  }
  const seen = new Set<string>()
  for (const co of path.cells) {
    const key = `${co.r},${co.c}`
    if (seen.has(key)) {
      throw new Error(`german-whispers ${path.id} repeats cell ${key}`)
    }
    seen.add(key)
  }
}

export interface GermanWhispersConstraint extends Constraint {
  readonly kind: 'german-whispers'
  readonly paths: ReadonlyArray<GermanWhispersPath>
  readonly minDiff: number
}

export function createGermanWhispersConstraint(
  params: GermanWhispersParams = {},
): GermanWhispersConstraint {
  void (params.shape ?? CLASSIC_9)
  const id = params.id ?? `german-whispers:${++counter}`
  const paths = params.paths ?? []
  const minDiff = params.minDiff ?? 5
  for (const p of paths) validatePath(p)

  // Cells along a whisper path are not required to be globally distinct, but
  // adjacent ones differ by ≥ minDiff. No no-repeat region surfaced.
  const regions: NamedRegion[] = paths.map((p) => ({
    kind: 'path',
    cells: p.cells.map((co) => ({ r: co.r, c: co.c })),
    id: p.id,
  }))

  return {
    id,
    kind: 'german-whispers',
    regions,
    paths,
    minDiff,
    validate(grid: Grid): boolean {
      for (const path of paths) {
        for (let i = 0; i < path.cells.length - 1; i++) {
          const a = cellAt(grid, path.cells[i]!).value
          const b = cellAt(grid, path.cells[i + 1]!).value
          if (a === null || b === null) continue
          if (Math.abs(a - b) < minDiff) return false
        }
      }
      return true
    },
    propagate(grid: Grid): Eliminations {
      const removals: CandidateRemoval[] = []
      const removedKeys = new Set<string>()
      function remove(coord: Coord, digit: Digit): void {
        const key = `${coord.r},${coord.c}:${digit}`
        if (removedKeys.has(key)) return
        const cell = cellAt(grid, coord)
        if (!cell.candidates.has(digit)) return
        removedKeys.add(key)
        removals.push({ coord, digit })
      }

      for (const path of paths) {
        for (let i = 0; i < path.cells.length - 1; i++) {
          const a = path.cells[i]!
          const b = path.cells[i + 1]!
          const ca = cellAt(grid, a)
          const cb = cellAt(grid, b)
          const setA = ca.value !== null ? new Set<Digit>([ca.value]) : ca.candidates
          const setB = cb.value !== null ? new Set<Digit>([cb.value]) : cb.candidates
          if (ca.value === null) {
            for (const d of ca.candidates) {
              let supported = false
              for (const e of setB) {
                if (Math.abs(d - e) >= minDiff) {
                  supported = true
                  break
                }
              }
              if (!supported) remove(a, d)
            }
          }
          if (cb.value === null) {
            for (const d of cb.candidates) {
              let supported = false
              for (const e of setA) {
                if (Math.abs(d - e) >= minDiff) {
                  supported = true
                  break
                }
              }
              if (!supported) remove(b, d)
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
        for (let i = 0; i < path.cells.length - 1; i++) {
          const a = path.cells[i]!
          const b = path.cells[i + 1]!
          const va = cellAt(grid, a).value
          const vb = cellAt(grid, b).value
          if (va !== null && vb !== null && Math.abs(va - vb) < minDiff) {
            flag(a)
            flag(b)
          }
        }
      }
      return out
    },
  }
}

export function germanWhispersPathsOf(
  grid: Grid,
): ReadonlyArray<GermanWhispersPath> {
  for (const constraint of grid.constraints) {
    if (constraint.kind === 'german-whispers') {
      return (constraint as GermanWhispersConstraint).paths
    }
  }
  return []
}
