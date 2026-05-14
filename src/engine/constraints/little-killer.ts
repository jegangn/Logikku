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

export type OutsideSide = 'top' | 'bottom' | 'left' | 'right'
export type Diagonal = 'NE' | 'NW' | 'SE' | 'SW'

/**
 * A Little-Killer arrow placed outside the grid, pointing along one of the
 * four diagonal directions. The cells along that diagonal (including the
 * first cell adjacent to the anchor) must sum to `sum`. Digits may repeat
 * within the diagonal (no no-repeat region) — the classic peer rules already
 * cover same-row / same-col / same-box collisions.
 *
 *   side='top',    index=c → anchor (0, c)
 *   side='bottom', index=c → anchor (size-1, c)
 *   side='left',   index=r → anchor (r, 0)
 *   side='right',  index=r → anchor (r, size-1)
 *
 * The diagonal direction selects the (dr, dc) step from the anchor inward.
 */
export interface LittleKillerClue {
  readonly id: string
  readonly side: OutsideSide
  readonly index: number
  readonly direction: Diagonal
  readonly sum: number
}

export interface LittleKillerParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly clues?: ReadonlyArray<LittleKillerClue>
}

export function littleKillerCells(
  clue: LittleKillerClue,
  shape: GridShape,
): Coord[] {
  const n = shape.size
  let r: number
  let c: number
  if (clue.side === 'top') {
    r = 0
    c = clue.index
  } else if (clue.side === 'bottom') {
    r = n - 1
    c = clue.index
  } else if (clue.side === 'left') {
    r = clue.index
    c = 0
  } else {
    r = clue.index
    c = n - 1
  }
  const dr = clue.direction === 'NW' || clue.direction === 'NE' ? -1 : 1
  const dc = clue.direction === 'NW' || clue.direction === 'SW' ? -1 : 1
  const cells: Coord[] = []
  while (r >= 0 && r < n && c >= 0 && c < n) {
    cells.push({ r, c })
    r += dr
    c += dc
  }
  return cells
}

function cellBounds(grid: Grid, coord: Coord): { min: number; max: number } {
  const cell = cellAt(grid, coord)
  if (cell.value !== null) return { min: cell.value, max: cell.value }
  if (cell.candidates.size === 0) return { min: 0, max: 0 }
  let lo = grid.shape.size + 1
  let hi = 0
  for (const d of cell.candidates) {
    if (d < lo) lo = d
    if (d > hi) hi = d
  }
  return { min: lo, max: hi }
}

export interface LittleKillerConstraint extends Constraint {
  readonly kind: 'little-killer'
  readonly diagonals: ReadonlyArray<{
    readonly clue: LittleKillerClue
    readonly cells: ReadonlyArray<Coord>
  }>
}

export function createLittleKillerConstraint(
  params: LittleKillerParams = {},
): LittleKillerConstraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `little-killer:${++counter}`
  const clues = params.clues ?? []
  const diagonals = clues.map((c) => ({
    clue: c,
    cells: littleKillerCells(c, shape),
  }))

  // Little-killer diagonals do NOT add no-repeat regions — they're just a
  // sum constraint. Regions remain empty for peer-elim purposes; overlays
  // and techniques access diagonals via the typed `diagonals` field.
  const regions: NamedRegion[] = []

  return {
    id,
    kind: 'little-killer',
    regions,
    diagonals,
    validate(grid: Grid): boolean {
      for (const { clue, cells } of diagonals) {
        let total = 0
        let placed = 0
        for (const co of cells) {
          const cell = cellAt(grid, co)
          if (cell.value === null) continue
          total += cell.value
          placed++
        }
        if (placed === cells.length) {
          if (total !== clue.sum) return false
        } else if (total > clue.sum) {
          return false
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

      for (const { clue, cells } of diagonals) {
        if (cells.length === 0) continue
        const bounds = cells.map((co) => cellBounds(grid, co))
        let totalMin = 0
        let totalMax = 0
        for (const b of bounds) {
          totalMin += b.min
          totalMax += b.max
        }
        if (clue.sum < totalMin || clue.sum > totalMax) continue
        for (let i = 0; i < cells.length; i++) {
          const cell = cellAt(grid, cells[i]!)
          if (cell.value !== null) continue
          const otherMin = totalMin - bounds[i]!.min
          const otherMax = totalMax - bounds[i]!.max
          const lo = Math.max(1, clue.sum - otherMax)
          const hi = Math.min(grid.shape.size, clue.sum - otherMin)
          for (const d of cell.candidates) {
            if (d < lo || d > hi) remove(cells[i]!, d)
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
      for (const { clue, cells } of diagonals) {
        let total = 0
        let placed = 0
        for (const co of cells) {
          const cell = cellAt(grid, co)
          if (cell.value === null) continue
          total += cell.value
          placed++
        }
        if (placed === cells.length && total !== clue.sum) {
          for (const co of cells) flag(co)
        } else if (total > clue.sum) {
          for (const co of cells) flag(co)
        }
      }
      return out
    },
  }
}

/** Read little-killer diagonals (clue + cells) back from a grid. */
export function littleKillerDiagonalsOf(
  grid: Grid,
): ReadonlyArray<{ clue: LittleKillerClue; cells: ReadonlyArray<Coord> }> {
  for (const constraint of grid.constraints) {
    if (constraint.kind === 'little-killer') {
      return (constraint as LittleKillerConstraint).diagonals
    }
  }
  return []
}
