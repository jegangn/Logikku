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
 * A Killer cage: a polyomino of cells that must sum to `sum` and contain
 * pairwise-distinct digits. Cages do NOT respect box boundaries — they can
 * straddle any number of rows / columns / boxes.
 */
export interface Cage {
  readonly id: string
  readonly cells: ReadonlyArray<Coord>
  readonly sum: number
}

export interface KillerParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly cages?: ReadonlyArray<Cage>
}

function validateCageShape(cage: Cage, shape: GridShape): void {
  if (cage.cells.length === 0) {
    throw new Error(`cage ${cage.id} must have at least 1 cell`)
  }
  if (cage.cells.length > shape.size) {
    throw new Error(
      `cage ${cage.id} has ${cage.cells.length} cells; max is ${shape.size}`,
    )
  }
  if (!Number.isInteger(cage.sum) || cage.sum < 1) {
    throw new Error(`cage ${cage.id} must have a positive integer sum`)
  }
  const seen = new Set<string>()
  for (const co of cage.cells) {
    const key = `${co.r},${co.c}`
    if (seen.has(key)) throw new Error(`cage ${cage.id} repeats cell ${key}`)
    seen.add(key)
  }
}

/**
 * Enumerate distinct digit assignments (one per cell, all distinct overall,
 * none in `excluded`) summing to `target`. Returns up to `cap` solutions to
 * bound worst-case work on large cages.
 */
function enumerateCageCombos(
  perCellCands: ReadonlyArray<ReadonlyArray<Digit>>,
  target: number,
  excluded: ReadonlySet<Digit>,
  cap: number,
): Digit[][] {
  const results: Digit[][] = []
  const used = new Set<Digit>()
  const current: Digit[] = []
  const sortedCands = perCellCands.map((cs) =>
    [...cs].filter((d) => !excluded.has(d)).sort((a, b) => a - b),
  )

  function recurse(idx: number, remaining: number): boolean {
    if (results.length >= cap) return true
    if (idx === sortedCands.length) {
      if (remaining === 0) results.push([...current])
      return false
    }
    // Lower / upper bounds for remaining cells (using K-i largest / smallest
    // distinct unused digits) — prune when impossible.
    const cellsLeft = sortedCands.length - idx
    let minPossible = 0
    let maxPossible = 0
    {
      let need = cellsLeft
      let pickLo = 1
      while (need > 0 && pickLo <= 9) {
        if (!used.has(pickLo as Digit) && !excluded.has(pickLo as Digit)) {
          minPossible += pickLo
          need--
        }
        pickLo++
      }
      need = cellsLeft
      let pickHi = 9
      while (need > 0 && pickHi >= 1) {
        if (!used.has(pickHi as Digit) && !excluded.has(pickHi as Digit)) {
          maxPossible += pickHi
          need--
        }
        pickHi--
      }
    }
    if (remaining < minPossible || remaining > maxPossible) return false

    for (const d of sortedCands[idx]!) {
      if (used.has(d)) continue
      if (d > remaining) break
      used.add(d)
      current.push(d)
      const stop = recurse(idx + 1, remaining - d)
      used.delete(d)
      current.pop()
      if (stop) return true
    }
    return false
  }

  recurse(0, target)
  return results
}

export function createKillerConstraint(params: KillerParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `killer:${++counter}`
  const cages = params.cages ?? []
  for (const cage of cages) validateCageShape(cage, shape)

  const regions: NamedRegion[] = cages.map((cage) => ({
    kind: 'cage',
    cells: cage.cells.map((co) => ({ r: co.r, c: co.c })),
    id: cage.id,
    sum: cage.sum,
  }))

  // Combination-search cap. K up to 6 fits comfortably; larger cages fall
  // back to no-repeat + cumulative-sum sanity (combination filter skipped).
  const COMBO_CELL_CAP = 6
  const COMBO_RESULT_CAP = 4096

  return {
    id,
    kind: 'killer',
    regions,
    validate(grid: Grid): boolean {
      for (const cage of cages) {
        let total = 0
        let placedCount = 0
        const seen = new Set<Digit>()
        for (const co of cage.cells) {
          const cell = cellAt(grid, co)
          if (cell.value === null) continue
          if (seen.has(cell.value)) return false
          seen.add(cell.value)
          total += cell.value
          placedCount++
        }
        if (placedCount === cage.cells.length) {
          if (total !== cage.sum) return false
        } else if (total > cage.sum) {
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

      for (const cage of cages) {
        const placed = new Set<Digit>()
        const emptyCoords: Coord[] = []
        let sumPlaced = 0
        for (const co of cage.cells) {
          const cell = cellAt(grid, co)
          if (cell.value !== null) {
            placed.add(cell.value)
            sumPlaced += cell.value
          } else {
            emptyCoords.push(co)
          }
        }
        if (emptyCoords.length === 0) continue
        const remaining = cage.sum - sumPlaced
        if (remaining < 1) continue

        // No-repeat: any empty cell can't hold an already-placed digit.
        for (const co of emptyCoords) {
          for (const d of placed) remove(co, d)
        }

        // Quick min/max sweep (always cheap).
        for (let i = 0; i < emptyCoords.length; i++) {
          const cell = cellAt(grid, emptyCoords[i]!)
          if (cell.candidates.size === 0) continue
          // Min cell candidates for OTHER empty cells, given distinctness.
          let othersMin = 0
          let othersMax = 0
          {
            const others = emptyCoords.filter((_, j) => j !== i)
            // Sum of K-1 smallest distinct allowed digits (rough lower bound).
            let need = others.length
            for (let d = 1; d <= shape.size && need > 0; d++) {
              if (placed.has(d as Digit)) continue
              othersMin += d
              need--
            }
            need = others.length
            for (let d = shape.size; d >= 1 && need > 0; d--) {
              if (placed.has(d as Digit)) continue
              othersMax += d
              need--
            }
          }
          const lo = remaining - othersMax
          const hi = remaining - othersMin
          for (const d of cell.candidates) {
            if (d < lo || d > hi) remove(emptyCoords[i]!, d)
          }
        }

        // Full combination filter for small cages.
        if (emptyCoords.length > COMBO_CELL_CAP) continue
        const perCellCands: Digit[][] = emptyCoords.map((co) => {
          const cell = cellAt(grid, co)
          return [...cell.candidates].filter((d) => !placed.has(d))
        })
        if (perCellCands.some((cs) => cs.length === 0)) continue
        const combos = enumerateCageCombos(
          perCellCands,
          remaining,
          placed,
          COMBO_RESULT_CAP,
        )
        if (combos.length === 0) continue
        if (combos.length >= COMBO_RESULT_CAP) continue
        for (let i = 0; i < emptyCoords.length; i++) {
          const supported = new Set<Digit>()
          for (const combo of combos) supported.add(combo[i]!)
          const cell = cellAt(grid, emptyCoords[i]!)
          for (const d of cell.candidates) {
            if (!supported.has(d)) remove(emptyCoords[i]!, d)
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
      for (const cage of cages) {
        let total = 0
        let placedCount = 0
        const digitCoords = new Map<Digit, Coord[]>()
        for (const co of cage.cells) {
          const cell = cellAt(grid, co)
          if (cell.value === null) continue
          total += cell.value
          placedCount++
          const list = digitCoords.get(cell.value) ?? []
          list.push(co)
          digitCoords.set(cell.value, list)
        }
        for (const [, coords] of digitCoords) {
          if (coords.length > 1) for (const co of coords) flag(co)
        }
        if (placedCount === cage.cells.length) {
          if (total !== cage.sum) for (const co of cage.cells) flag(co)
        } else if (total > cage.sum) {
          for (const co of cage.cells) flag(co)
        }
      }
      return out
    },
  }
}

/** Read the cage list out of a grid (looks up regions with kind 'cage'). */
export function cagesOf(grid: Grid): ReadonlyArray<Cage> {
  const out: Cage[] = []
  for (const constraint of grid.constraints) {
    if (constraint.kind !== 'killer') continue
    for (const region of constraint.regions) {
      if (region.kind !== 'cage') continue
      if (region.sum === undefined) continue
      out.push({
        id: region.id ?? `cage:${out.length + 1}`,
        cells: region.cells,
        sum: region.sum,
      })
    }
  }
  return out
}
