import { classicRegions, cellAt, CLASSIC_9 } from '../grid'
import type {
  CandidateRemoval,
  Constraint,
  Digit,
  Eliminations,
  Grid,
  GridShape,
  NamedRegion,
  Placement,
} from '../types'

let counter = 0

export interface ClassicParams {
  readonly shape?: GridShape
  readonly id?: string
}

export function createClassicConstraint(params: ClassicParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const regions = classicRegions(shape)
  const id = params.id ?? `classic:${++counter}`

  return {
    id,
    kind: 'classic',
    regions,
    validate(grid: Grid): boolean {
      return classicValidate(grid, regions)
    },
    propagate(grid: Grid): Eliminations {
      return classicPropagate(grid, regions)
    },
  }
}

function classicValidate(grid: Grid, regions: ReadonlyArray<NamedRegion>): boolean {
  for (const region of regions) {
    const seen = new Set<Digit>()
    for (const coord of region.cells) {
      const cell = cellAt(grid, coord)
      if (cell.value === null) continue
      if (seen.has(cell.value)) return false
      seen.add(cell.value)
    }
  }
  return true
}

function classicPropagate(grid: Grid, regions: ReadonlyArray<NamedRegion>): Eliminations {
  const removals: CandidateRemoval[] = []
  const placements: Placement[] = []
  const placedKeys = new Set<string>()
  const removedKeys = new Set<string>()
  const placedDigits = new Set<string>()

  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value !== null) continue
      if (cell.candidates.size === 1) {
        const digit = [...cell.candidates][0]!
        const key = `${r},${c}`
        if (!placedKeys.has(key)) {
          placedKeys.add(key)
          placedDigits.add(`${key}:${digit}`)
          placements.push({ coord: { r, c }, digit })
        }
      }
    }
  }

  for (const region of regions) {
    const positions = new Map<Digit, { r: number; c: number }[]>()
    for (let d = 1; d <= grid.shape.size; d++) positions.set(d, [])
    for (const coord of region.cells) {
      const cell = cellAt(grid, coord)
      if (cell.value !== null) continue
      for (const d of cell.candidates) {
        positions.get(d)!.push(coord)
      }
    }
    for (const [digit, coords] of positions) {
      if (coords.length === 1) {
        const coord = coords[0]!
        const key = `${coord.r},${coord.c}`
        if (placedKeys.has(key)) continue
        placedKeys.add(key)
        placedDigits.add(`${key}:${digit}`)
        placements.push({ coord, digit })
      }
    }
  }

  for (const placement of placements) {
    const cell = cellAt(grid, placement.coord)
    for (const d of cell.candidates) {
      if (d === placement.digit) continue
      const key = `${placement.coord.r},${placement.coord.c}:${d}`
      if (removedKeys.has(key)) continue
      removedKeys.add(key)
      removals.push({ coord: placement.coord, digit: d })
    }
  }

  return { removals, placements }
}
