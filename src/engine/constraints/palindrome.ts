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
 * Palindrome path: cells along the path read the same forwards and backwards.
 * Formally, cells[i] === cells[L-1-i] for every i. Odd-length paths have a
 * free center cell (i == L-1-i).
 */
export interface PalindromePath {
  readonly id: string
  readonly cells: ReadonlyArray<Coord>
}

export interface PalindromeParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly paths?: ReadonlyArray<PalindromePath>
}

function validatePath(path: PalindromePath): void {
  if (path.cells.length < 2) {
    throw new Error(`palindrome ${path.id} must have at least 2 cells`)
  }
  const seen = new Set<string>()
  for (const co of path.cells) {
    const key = `${co.r},${co.c}`
    if (seen.has(key)) {
      throw new Error(`palindrome ${path.id} repeats cell ${key}`)
    }
    seen.add(key)
  }
}

export interface PalindromeConstraint extends Constraint {
  readonly kind: 'palindrome'
  readonly paths: ReadonlyArray<PalindromePath>
}

export function createPalindromeConstraint(
  params: PalindromeParams = {},
): PalindromeConstraint {
  void (params.shape ?? CLASSIC_9)
  const id = params.id ?? `palindrome:${++counter}`
  const paths = params.paths ?? []
  for (const p of paths) validatePath(p)

  // Each path is a 'path' region; cells along a palindrome aren't required to
  // be distinct (e.g. abcba is fine if peers allow it), so we don't surface a
  // no-repeat region.
  const regions: NamedRegion[] = paths.map((p) => ({
    kind: 'path',
    cells: p.cells.map((co) => ({ r: co.r, c: co.c })),
    id: p.id,
  }))

  return {
    id,
    kind: 'palindrome',
    regions,
    paths,
    validate(grid: Grid): boolean {
      for (const path of paths) {
        const L = path.cells.length
        for (let i = 0; i < Math.floor(L / 2); i++) {
          const a = cellAt(grid, path.cells[i]!).value
          const b = cellAt(grid, path.cells[L - 1 - i]!).value
          if (a === null || b === null) continue
          if (a !== b) return false
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
        const L = path.cells.length
        for (let i = 0; i < Math.floor(L / 2); i++) {
          const a = path.cells[i]!
          const b = path.cells[L - 1 - i]!
          const ca = cellAt(grid, a)
          const cb = cellAt(grid, b)
          // Build the set of digits each side can be: candidates ∪ {value}.
          const setA = ca.value !== null ? new Set<Digit>([ca.value]) : ca.candidates
          const setB = cb.value !== null ? new Set<Digit>([cb.value]) : cb.candidates
          // Each side must restrict to the intersection.
          if (ca.value === null) {
            for (const d of ca.candidates) {
              if (!setB.has(d)) remove(a, d)
            }
          }
          if (cb.value === null) {
            for (const d of cb.candidates) {
              if (!setA.has(d)) remove(b, d)
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
        const L = path.cells.length
        for (let i = 0; i < Math.floor(L / 2); i++) {
          const a = path.cells[i]!
          const b = path.cells[L - 1 - i]!
          const va = cellAt(grid, a).value
          const vb = cellAt(grid, b).value
          if (va !== null && vb !== null && va !== vb) {
            flag(a)
            flag(b)
          }
        }
      }
      return out
    },
  }
}

export function palindromePathsOf(grid: Grid): ReadonlyArray<PalindromePath> {
  for (const constraint of grid.constraints) {
    if (constraint.kind === 'palindrome') {
      return (constraint as PalindromeConstraint).paths
    }
  }
  return []
}
