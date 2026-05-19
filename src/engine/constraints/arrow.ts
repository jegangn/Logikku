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
 * An Arrow: the digits along `tail` sum to the digit(s) in `head`.
 * `head` is 1 or 2 cells. When 2 cells, the first is the tens digit and the
 * second the ones digit; head_value = 10*v[head[0]] + v[head[1]].
 * `tail` is at least one cell.
 */
export interface Arrow {
  readonly id: string
  readonly head: ReadonlyArray<Coord>
  readonly tail: ReadonlyArray<Coord>
}

export interface ArrowParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly arrows?: ReadonlyArray<Arrow>
}

function validateArrow(arrow: Arrow): void {
  if (arrow.head.length === 0 || arrow.head.length > 2) {
    throw new Error(`arrow ${arrow.id} must have 1 or 2 head cells`)
  }
  if (arrow.tail.length === 0) {
    throw new Error(`arrow ${arrow.id} must have at least 1 tail cell`)
  }
  const seen = new Set<string>()
  for (const coord of [...arrow.head, ...arrow.tail]) {
    const key = `${coord.r},${coord.c}`
    if (seen.has(key)) {
      throw new Error(`arrow ${arrow.id} repeats cell ${key}`)
    }
    seen.add(key)
  }
}

interface CellBounds {
  readonly min: number
  readonly max: number
}

function cellBounds(grid: Grid, coord: Coord): CellBounds {
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

function headValueBounds(grid: Grid, head: ReadonlyArray<Coord>): CellBounds {
  if (head.length === 1) {
    return cellBounds(grid, head[0]!)
  }
  const tens = cellBounds(grid, head[0]!)
  const ones = cellBounds(grid, head[1]!)
  return {
    min: 10 * tens.min + ones.min,
    max: 10 * tens.max + ones.max,
  }
}

export function createArrowConstraint(params: ArrowParams = {}): Constraint {
  // shape isn't currently used for region generation (arrows define no
  // regions), but accepted for symmetry with other variants and future use.
  void (params.shape ?? CLASSIC_9)
  const id = params.id ?? `arrow:${++counter}`
  const arrows = params.arrows ?? []
  for (const a of arrows) validateArrow(a)

  // Arrow cells get no "no-repeat" region — tail digits can repeat (subject to
  // classic peer rules). Regions stay empty.
  const regions: NamedRegion[] = []

  return {
    id,
    kind: 'arrow',
    regions,
    validate(grid: Grid): boolean {
      for (const arrow of arrows) {
        const headFull = arrow.head.every(
          (co) => cellAt(grid, co).value !== null,
        )
        const tailFull = arrow.tail.every(
          (co) => cellAt(grid, co).value !== null,
        )
        if (!headFull || !tailFull) continue
        const headVal =
          arrow.head.length === 1
            ? cellAt(grid, arrow.head[0]!).value!
            : 10 * cellAt(grid, arrow.head[0]!).value! +
              cellAt(grid, arrow.head[1]!).value!
        let tailSum = 0
        for (const co of arrow.tail) tailSum += cellAt(grid, co).value!
        if (headVal !== tailSum) return false
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

      for (const arrow of arrows) {
        const tailBounds = arrow.tail.map((co) => cellBounds(grid, co))
        const headBounds = headValueBounds(grid, arrow.head)
        let tailSumMin = 0
        let tailSumMax = 0
        for (const b of tailBounds) {
          tailSumMin += b.min
          tailSumMax += b.max
        }
        // The valid sum range is the intersection of head and tail bounds.
        const sumLo = Math.max(tailSumMin, headBounds.min)
        const sumHi = Math.min(tailSumMax, headBounds.max)
        if (sumLo > sumHi) continue // contradiction — propagate nothing here

        // Tail cell bounds: each cell's value must lie in
        // [sumLo - sum(other max), sumHi - sum(other min)].
        for (let i = 0; i < arrow.tail.length; i++) {
          const cell = cellAt(grid, arrow.tail[i]!)
          if (cell.value !== null) continue
          const otherMin = tailSumMin - tailBounds[i]!.min
          const otherMax = tailSumMax - tailBounds[i]!.max
          const lo = Math.max(1, sumLo - otherMax)
          const hi = Math.min(grid.shape.size, sumHi - otherMin)
          for (const d of cell.candidates) {
            if (d < lo || d > hi) remove(arrow.tail[i]!, d)
          }
        }

        // Head cells.
        if (arrow.head.length === 1) {
          const cell = cellAt(grid, arrow.head[0]!)
          if (cell.value === null) {
            for (const d of cell.candidates) {
              if (d < sumLo || d > sumHi) remove(arrow.head[0]!, d)
            }
          }
        } else {
          // Two-digit head: a candidate `t` at the tens cell is valid only if
          // 10*t + (some valid ones digit) ∈ [sumLo, sumHi]. Same for ones.
          const tensCell = cellAt(grid, arrow.head[0]!)
          const onesCell = cellAt(grid, arrow.head[1]!)
          const tensCands = tensCell.value !== null ? [tensCell.value] : [...tensCell.candidates]
          const onesCands = onesCell.value !== null ? [onesCell.value] : [...onesCell.candidates]
          if (tensCell.value === null) {
            for (const t of tensCell.candidates) {
              let supported = false
              for (const o of onesCands) {
                const v = 10 * t + o
                if (v >= sumLo && v <= sumHi) {
                  supported = true
                  break
                }
              }
              if (!supported) remove(arrow.head[0]!, t)
            }
          }
          if (onesCell.value === null) {
            for (const o of onesCell.candidates) {
              let supported = false
              for (const t of tensCands) {
                const v = 10 * t + o
                if (v >= sumLo && v <= sumHi) {
                  supported = true
                  break
                }
              }
              if (!supported) remove(arrow.head[1]!, o)
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
      for (const arrow of arrows) {
        const headFull = arrow.head.every(
          (co) => cellAt(grid, co).value !== null,
        )
        const tailFull = arrow.tail.every(
          (co) => cellAt(grid, co).value !== null,
        )
        if (!headFull || !tailFull) continue
        const headVal =
          arrow.head.length === 1
            ? cellAt(grid, arrow.head[0]!).value!
            : 10 * cellAt(grid, arrow.head[0]!).value! +
              cellAt(grid, arrow.head[1]!).value!
        let tailSum = 0
        for (const co of arrow.tail) tailSum += cellAt(grid, co).value!
        if (headVal !== tailSum) {
          for (const co of arrow.head) flag(co)
          for (const co of arrow.tail) flag(co)
        }
      }
      return out
    },
  }
}
