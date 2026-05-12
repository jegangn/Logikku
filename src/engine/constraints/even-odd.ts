import { cellAt, CLASSIC_9 } from '../grid'
import type {
  CandidateRemoval,
  Constraint,
  Coord,
  Digit,
  Eliminations,
  Grid,
  GridShape,
} from '../types'

let counter = 0

export type Parity = 'E' | 'O'

export interface EvenOddParams {
  readonly shape?: GridShape
  readonly id?: string
  /**
   * `size*size`-length string of 'E' (even), 'O' (odd), '.' (unmarked).
   * E.g. for 9x9, an 81-char string. Defaults to all-unmarked.
   */
  readonly parityMask?: string
}

function parseMask(mask: string, size: number): (Parity | null)[][] {
  if (mask.length !== size * size) {
    throw new Error(
      `parityMask length ${mask.length} != expected ${size * size}`,
    )
  }
  const grid: (Parity | null)[][] = []
  for (let r = 0; r < size; r++) {
    const row: (Parity | null)[] = []
    for (let c = 0; c < size; c++) {
      const ch = mask[r * size + c]
      if (ch === 'E') row.push('E')
      else if (ch === 'O') row.push('O')
      else if (ch === '.' || ch === ' ') row.push(null)
      else throw new Error(`invalid parityMask character '${ch}' at (${r},${c})`)
    }
    grid.push(row)
  }
  return grid
}

function forbidsParity(parity: Parity, digit: Digit): boolean {
  const isEven = digit % 2 === 0
  if (parity === 'E') return !isEven
  return isEven
}

export function createEvenOddConstraint(params: EvenOddParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `even-odd:${++counter}`
  const maskStr = params.parityMask ?? '.'.repeat(shape.size * shape.size)
  const mask = parseMask(maskStr, shape.size)

  function maskAt(r: number, c: number): Parity | null {
    return mask[r]![c]!
  }

  return {
    id,
    kind: 'even-odd',
    regions: [],
    validate(grid: Grid): boolean {
      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const parity = maskAt(r, c)
          if (parity === null) continue
          const cell = cellAt(grid, { r, c })
          if (cell.value === null) continue
          if (forbidsParity(parity, cell.value)) return false
        }
      }
      return true
    },
    propagate(grid: Grid): Eliminations {
      const removals: CandidateRemoval[] = []
      const removedKeys = new Set<string>()
      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const parity = maskAt(r, c)
          if (parity === null) continue
          const cell = cellAt(grid, { r, c })
          if (cell.value !== null) continue
          for (const d of cell.candidates) {
            if (!forbidsParity(parity, d)) continue
            const key = `${r},${c}:${d}`
            if (removedKeys.has(key)) continue
            removedKeys.add(key)
            removals.push({ coord: { r, c }, digit: d })
          }
        }
      }
      return { removals, placements: [] }
    },
    findConflicts(grid: Grid): ReadonlyArray<Coord> {
      const out: Coord[] = []
      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const parity = maskAt(r, c)
          if (parity === null) continue
          const cell = cellAt(grid, { r, c })
          if (cell.value === null) continue
          if (forbidsParity(parity, cell.value)) out.push({ r, c })
        }
      }
      return out
    },
  }
}

/** Render-time helper: parse the mask into a per-cell parity grid. */
export function parityGridOf(
  mask: string,
  size: number,
): ReadonlyArray<ReadonlyArray<Parity | null>> {
  return parseMask(mask, size)
}
