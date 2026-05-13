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

export interface Thermometer {
  readonly id: string
  /** Bulb -> tip; values must strictly increase along this path. */
  readonly path: ReadonlyArray<Coord>
}

export interface ThermometerParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly thermometers?: ReadonlyArray<Thermometer>
}

function validateThermometer(thermo: Thermometer, shape: GridShape): void {
  if (thermo.path.length < 2) {
    throw new Error(`thermometer ${thermo.id} must have at least 2 cells`)
  }
  if (thermo.path.length > shape.size) {
    throw new Error(
      `thermometer ${thermo.id} has ${thermo.path.length} cells; max is ${shape.size} on a ${shape.size}x${shape.size} grid`,
    )
  }
  const seen = new Set<string>()
  for (const coord of thermo.path) {
    const key = `${coord.r},${coord.c}`
    if (seen.has(key)) {
      throw new Error(`thermometer ${thermo.id} repeats cell ${key}`)
    }
    seen.add(key)
  }
}

export function createThermometerConstraint(
  params: ThermometerParams = {},
): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `thermometer:${++counter}`
  const thermometers = params.thermometers ?? []
  for (const t of thermometers) validateThermometer(t, shape)

  // Each thermometer's path is also a "no repeats" region (strictly increasing
  // implies all unique), which lets row/col/region techniques fire.
  const regions: NamedRegion[] = thermometers.map((t) => ({
    kind: 'thermometer',
    cells: t.path.map((co) => ({ r: co.r, c: co.c })),
    id: t.id,
  }))

  function pathMinFor(index: number): Digit {
    return (index + 1) as Digit
  }

  function pathMaxFor(index: number, length: number, size: number): Digit {
    return (size - (length - 1 - index)) as Digit
  }

  return {
    id,
    kind: 'thermometer',
    regions,
    validate(grid: Grid): boolean {
      for (const thermo of thermometers) {
        let prev: Digit | null = null
        for (const coord of thermo.path) {
          const cell = cellAt(grid, coord)
          if (cell.value === null) {
            prev = null
            continue
          }
          if (prev !== null && cell.value <= prev) return false
          prev = cell.value
        }
        // Also enforce the length-based bounds at validate-time.
        for (let i = 0; i < thermo.path.length; i++) {
          const coord = thermo.path[i]!
          const cell = cellAt(grid, coord)
          if (cell.value === null) continue
          if (cell.value < pathMinFor(i)) return false
          if (cell.value > pathMaxFor(i, thermo.path.length, grid.shape.size))
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

      for (const thermo of thermometers) {
        const L = thermo.path.length
        const size = grid.shape.size

        // Length-based bounds. cell k can only hold digits in [k+1, size-L+k+1].
        for (let i = 0; i < L; i++) {
          const coord = thermo.path[i]!
          const cell = cellAt(grid, coord)
          if (cell.value !== null) continue
          const lo = pathMinFor(i)
          const hi = pathMaxFor(i, L, size)
          for (const d of cell.candidates) {
            if (d < lo || d > hi) remove(coord, d)
          }
        }

        // Forward sweep: derive a per-cell `minDigit` from placed values and
        // previous cells' candidates. Each next cell must be strictly greater.
        const minBound: Digit[] = new Array(L).fill(0)
        for (let i = 0; i < L; i++) {
          const coord = thermo.path[i]!
          const cell = cellAt(grid, coord)
          const prevMin = i === 0 ? 0 : minBound[i - 1]!
          let cur: Digit
          if (cell.value !== null) cur = cell.value
          else {
            let m: Digit = pathMinFor(i)
            for (const d of cell.candidates) if (d < m) m = d as Digit
            // strict-increase lower bound from previous cell:
            if (prevMin + 1 > m) m = (prevMin + 1) as Digit
            cur = m
          }
          minBound[i] = cur
        }

        // Backward sweep: derive per-cell `maxDigit`.
        const maxBound: Digit[] = new Array(L).fill(0)
        for (let i = L - 1; i >= 0; i--) {
          const coord = thermo.path[i]!
          const cell = cellAt(grid, coord)
          const nextMax = i === L - 1 ? size + 1 : maxBound[i + 1]!
          let cur: Digit
          if (cell.value !== null) cur = cell.value
          else {
            let m: Digit = pathMaxFor(i, L, size)
            for (const d of cell.candidates) if (d > m) m = d as Digit
            // strict-decrease upper bound from next cell:
            if (nextMax - 1 < m) m = (nextMax - 1) as Digit
            cur = m
          }
          maxBound[i] = cur
        }

        // Eliminate any candidate outside [minBound, maxBound] per cell.
        for (let i = 0; i < L; i++) {
          const coord = thermo.path[i]!
          const cell = cellAt(grid, coord)
          if (cell.value !== null) continue
          const lo = minBound[i]!
          const hi = maxBound[i]!
          for (const d of cell.candidates) {
            if (d < lo || d > hi) remove(coord, d)
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
      for (const thermo of thermometers) {
        let prev: { coord: Coord; value: Digit } | null = null
        for (const coord of thermo.path) {
          const cell = cellAt(grid, coord)
          if (cell.value === null) {
            prev = null
            continue
          }
          if (prev !== null && cell.value <= prev.value) {
            flag(prev.coord)
            flag(coord)
          }
          prev = { coord, value: cell.value }
        }
      }
      return out
    },
  }
}
