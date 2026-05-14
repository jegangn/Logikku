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
 * Skyscraper clue: count of "buildings" visible from this side. A building
 * at position i (from the viewing side, 0-indexed) is visible iff
 * v[i] > max(v[0..i-1]).
 *
 *   side='top'    → column, viewed top→bottom
 *   side='bottom' → column, viewed bottom→top
 *   side='left'   → row,    viewed left→right
 *   side='right'  → row,    viewed right→left
 */
export type SkyscraperSide = 'top' | 'bottom' | 'left' | 'right'

export interface SkyscraperClue {
  readonly id: string
  readonly side: SkyscraperSide
  readonly index: number
  readonly count: number
}

export interface SkyscraperParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly clues?: ReadonlyArray<SkyscraperClue>
}

/** Cells of the row/column the clue addresses, ordered from the viewing side inward. */
export function skyscraperLineCells(
  clue: SkyscraperClue,
  shape: GridShape,
): Coord[] {
  const n = shape.size
  const out: Coord[] = []
  if (clue.side === 'top') {
    for (let r = 0; r < n; r++) out.push({ r, c: clue.index })
  } else if (clue.side === 'bottom') {
    for (let r = n - 1; r >= 0; r--) out.push({ r, c: clue.index })
  } else if (clue.side === 'left') {
    for (let c = 0; c < n; c++) out.push({ r: clue.index, c })
  } else {
    for (let c = n - 1; c >= 0; c--) out.push({ r: clue.index, c })
  }
  return out
}

function countVisible(values: ReadonlyArray<number>): number {
  let max = 0
  let count = 0
  for (const v of values) {
    if (v > max) {
      max = v
      count++
    }
  }
  return count
}

export interface SkyscraperConstraint extends Constraint {
  readonly kind: 'skyscraper'
  readonly lines: ReadonlyArray<{
    readonly clue: SkyscraperClue
    readonly cells: ReadonlyArray<Coord>
  }>
}

export function createSkyscraperConstraint(
  params: SkyscraperParams = {},
): SkyscraperConstraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `skyscraper:${++counter}`
  const clues = params.clues ?? []
  const lines = clues.map((c) => ({
    clue: c,
    cells: skyscraperLineCells(c, shape),
  }))

  const regions: NamedRegion[] = []

  return {
    id,
    kind: 'skyscraper',
    regions,
    lines,
    validate(grid: Grid): boolean {
      const n = grid.shape.size
      for (const { clue, cells } of lines) {
        const vals: number[] = []
        for (const co of cells) {
          const v = cellAt(grid, co).value
          if (v === null) {
            vals.length = 0
            break
          }
          vals.push(v)
        }
        if (vals.length !== cells.length) continue
        if (countVisible(vals) !== clue.count) return false
        // Sanity: a permutation of 1..n.
        const seen = new Set(vals)
        if (seen.size !== n) return false
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

      for (const { clue, cells } of lines) {
        const C = clue.count
        if (C < 1 || C > n) continue

        // Edge cases give very strong eliminations.
        if (C === 1) {
          // First cell (from viewing side) must be n; no other cell can.
          const first = cells[0]!
          for (const d of cellAt(grid, first).candidates) {
            if (d !== (n as Digit)) remove(first, d)
          }
        } else if (C === n) {
          // Row strictly increasing from the viewing side: cell at i = i+1.
          for (let i = 0; i < cells.length; i++) {
            const target = (i + 1) as Digit
            const cell = cellAt(grid, cells[i]!)
            for (const d of cell.candidates) {
              if (d !== target) remove(cells[i]!, d)
            }
          }
        } else {
          // General case: cell i (0-indexed from viewing side) cannot be n
          // if i >= n - C + 1 (otherwise too many tall buildings still need
          // to fit before the front).
          //   Visible count = C means we need C distinct cells in
          //   strictly-increasing-by-running-max order. With cell at index i
          //   from the side, the running-max history before i has i values.
          //   Constraint: cell value > all values at indices < i for it to be
          //   visible. The maximum value n can appear at any index — but if
          //   n appears at index i, all cells at indices > i are invisible
          //   regardless of value (nothing taller). So if C buildings are
          //   visible and one of them is `n`, exactly the cells visible
          //   before n (including n) contribute to the count. The position
          //   of n must be such that exactly (C-1) other visible cells
          //   precede it from the side. Therefore index_of_n ≥ C - 1.
          // i.e. n cannot appear at indices 0..C-2.
          for (let i = 0; i < C - 1 && i < cells.length; i++) {
            const cell = cellAt(grid, cells[i]!)
            if (cell.candidates.has(n as Digit)) remove(cells[i]!, n as Digit)
          }

          // Bound on the leading cell from this side: the closest visible
          // cell must be ≤ n - C + 1 (otherwise we can't fit C-1 strictly
          // greater cells behind it).
          const firstMaxValue = n - C + 1
          const firstCell = cellAt(grid, cells[0]!)
          if (firstCell.value === null) {
            for (const d of firstCell.candidates) {
              if (d > firstMaxValue) remove(cells[0]!, d)
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
      for (const { clue, cells } of lines) {
        const vals: number[] = []
        for (const co of cells) {
          const v = cellAt(grid, co).value
          if (v === null) {
            vals.length = 0
            break
          }
          vals.push(v)
        }
        if (vals.length !== cells.length) continue
        if (countVisible(vals) !== clue.count) {
          for (const co of cells) flag(co)
        }
      }
      return out
    },
  }
}
