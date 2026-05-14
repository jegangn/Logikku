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
 * Sandwich clue: the digits strictly between the cells holding 1 and 9 in
 * the addressed row / column sum to `sum`. The "sandwich" is empty (sum 0)
 * when 1 and 9 are adjacent OR at extreme positions with only each other
 * between them — actually empty sum requires |pos(1) - pos(9)| == 1.
 *
 *   side='top'/'bottom' → applies to column `index` (read top → bottom)
 *   side='left'/'right' → applies to row    `index` (read left → right)
 */
export type SandwichSide = 'top' | 'bottom' | 'left' | 'right'

export interface SandwichClue {
  readonly id: string
  readonly side: SandwichSide
  readonly index: number
  readonly sum: number
}

export interface SandwichParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly clues?: ReadonlyArray<SandwichClue>
}

function lineCells(
  clue: SandwichClue,
  shape: GridShape,
): Coord[] {
  const n = shape.size
  const out: Coord[] = []
  if (clue.side === 'top' || clue.side === 'bottom') {
    for (let r = 0; r < n; r++) out.push({ r, c: clue.index })
  } else {
    for (let c = 0; c < n; c++) out.push({ r: clue.index, c })
  }
  return out
}

function sandwichBetween(values: ReadonlyArray<number>): number | null {
  let p1 = -1
  let p9 = -1
  const n = values.length
  for (let i = 0; i < n; i++) {
    if (values[i] === 1) p1 = i
    else if (values[i] === n) p9 = i
  }
  if (p1 < 0 || p9 < 0) return null
  const lo = Math.min(p1, p9)
  const hi = Math.max(p1, p9)
  let total = 0
  for (let i = lo + 1; i < hi; i++) total += values[i]!
  return total
}

export interface SandwichConstraint extends Constraint {
  readonly kind: 'sandwich'
  readonly lines: ReadonlyArray<{
    readonly clue: SandwichClue
    readonly cells: ReadonlyArray<Coord>
  }>
}

export function createSandwichConstraint(
  params: SandwichParams = {},
): SandwichConstraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `sandwich:${++counter}`
  const clues = params.clues ?? []
  const lines = clues.map((c) => ({ clue: c, cells: lineCells(c, shape) }))

  // Sandwich uses existing row / col regions; no extra peer regions.
  const regions: NamedRegion[] = []

  return {
    id,
    kind: 'sandwich',
    regions,
    lines,
    validate(grid: Grid): boolean {
      for (const { clue, cells } of lines) {
        const vals: number[] = []
        let complete = true
        for (const co of cells) {
          const v = cellAt(grid, co).value
          if (v === null) {
            complete = false
            break
          }
          vals.push(v)
        }
        if (!complete) continue
        const s = sandwichBetween(vals)
        if (s === null) return false
        if (s !== clue.sum) return false
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
        // Identify possible positions for 1 and 9.
        const pos1: number[] = []
        const pos9: number[] = []
        for (let i = 0; i < cells.length; i++) {
          const cell = cellAt(grid, cells[i]!)
          if (cell.value === 1) {
            pos1.length = 0
            pos1.push(i)
            // continue scanning to also lock 9 if placed
          }
          if (cell.value === n) {
            pos9.length = 0
            pos9.push(i)
          }
        }
        if (pos1.length === 0) {
          for (let i = 0; i < cells.length; i++) {
            const cell = cellAt(grid, cells[i]!)
            if (cell.value === null && cell.candidates.has(1)) pos1.push(i)
          }
        }
        if (pos9.length === 0) {
          for (let i = 0; i < cells.length; i++) {
            const cell = cellAt(grid, cells[i]!)
            if (cell.value === null && cell.candidates.has(n as Digit)) {
              pos9.push(i)
            }
          }
        }

        // For each valid (p1, p9) gap, the cells strictly between must come
        // from {2..n-1} (multiset, but row uniqueness forces a 7-permutation
        // when gap=8). We don't enumerate full permutations — we use the
        // span pattern: for each cell c at index i, determine if i can ever
        // lie BETWEEN any valid (p1, p9) and contribute to the sum.
        //
        // Bounds approach: gap = |p1 - p9| - 1 cells. The sum of those gap
        // cells (all from {2..n-1}, distinct in this row) lies in
        // [min(gap distinct), max(gap distinct)]. Eliminate (p1,p9) pairs
        // whose gap range doesn't cover clue.sum.
        const candidatePairs: Array<{ p1: number; p9: number; gap: number }> = []
        for (const a of pos1) {
          for (const b of pos9) {
            if (a === b) continue
            const gap = Math.abs(a - b) - 1
            // sum of gap distinct digits from {2..n-1}
            const lo = sumOfSmallestDistinct(gap, n - 2)
            const hi = sumOfLargestDistinct(gap, n - 2)
            if (clue.sum < lo || clue.sum > hi) continue
            candidatePairs.push({ p1: a, p9: b, gap })
          }
        }
        if (candidatePairs.length === 0) continue

        // Cells that can NEVER lie between any candidate pair cannot hold
        // 1 or 9 implicitly — but more usefully, cells that lie OUTSIDE
        // every candidate pair's gap must NOT hold any of {2..n-1} that the
        // sum doesn't accommodate. Skip this — too restrictive.

        // Cells that are always between the gap (i.e. between every valid
        // (p1, p9) pair) cannot be 1 or n.
        // For each cell index i:
        //   alwaysBetween = ∀ pair: lo(pair) < i < hi(pair)
        for (let i = 0; i < cells.length; i++) {
          const cell = cellAt(grid, cells[i]!)
          if (cell.value !== null) continue
          let alwaysBetween = true
          let alwaysOutside = true
          for (const pair of candidatePairs) {
            const lo = Math.min(pair.p1, pair.p9)
            const hi = Math.max(pair.p1, pair.p9)
            if (i > lo && i < hi) alwaysOutside = false
            else alwaysBetween = false
          }
          if (alwaysBetween) {
            // Cell strictly between → can't be 1 or n.
            if (cell.candidates.has(1)) remove(cells[i]!, 1)
            if (cell.candidates.has(n as Digit)) remove(cells[i]!, n as Digit)
          }
          if (alwaysOutside) {
            // Cell strictly outside the gap → can't be on the sandwich;
            // doesn't directly forbid digits unless clue.sum=0 implies the
            // outside-only cells are all of {2..n-1} (skip — too narrow).
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
        let complete = true
        for (const co of cells) {
          const v = cellAt(grid, co).value
          if (v === null) {
            complete = false
            break
          }
          vals.push(v)
        }
        if (!complete) continue
        const s = sandwichBetween(vals)
        if (s === null || s !== clue.sum) {
          for (const co of cells) flag(co)
        }
      }
      return out
    },
  }
}

// Sum of k smallest distinct digits from {2..upper}.
function sumOfSmallestDistinct(k: number, upper: number): number {
  let total = 0
  let d = 2
  let picked = 0
  while (picked < k && d <= upper) {
    total += d
    picked++
    d++
  }
  return total
}

function sumOfLargestDistinct(k: number, upper: number): number {
  let total = 0
  let d = upper
  let picked = 0
  while (picked < k && d >= 2) {
    total += d
    picked++
    d--
  }
  return total
}
