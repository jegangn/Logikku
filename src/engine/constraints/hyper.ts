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
  Placement,
} from '../types'

let counter = 0

export interface HyperParams {
  readonly shape?: GridShape
  readonly id?: string
}

export const HYPER_WINDOW_ORIGINS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, 5],
  [5, 1],
  [5, 5],
]

export function hyperRegions(shape: GridShape): ReadonlyArray<NamedRegion> {
  if (shape.size !== 9 || shape.boxRows !== 3 || shape.boxCols !== 3) {
    throw new Error('Hyper / Windoku is defined only for the 9×9 (3×3 box) grid')
  }
  const regions: NamedRegion[] = []
  for (let i = 0; i < HYPER_WINDOW_ORIGINS.length; i++) {
    const origin = HYPER_WINDOW_ORIGINS[i]!
    const [r0, c0] = origin
    const cells: Coord[] = []
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        cells.push({ r: r0 + dr, c: c0 + dc })
      }
    }
    regions.push({ kind: 'window', cells, id: `window-${i + 1}` })
  }
  return regions
}

export function createHyperConstraint(params: HyperParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const regions = hyperRegions(shape)
  const id = params.id ?? `hyper:${++counter}`

  return {
    id,
    kind: 'hyper',
    regions,
    validate(grid: Grid): boolean {
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
    },
    propagate(grid: Grid): Eliminations {
      const removals: CandidateRemoval[] = []
      const placements: Placement[] = []
      const removedKeys = new Set<string>()
      const placedKeys = new Set<string>()

      for (const region of regions) {
        for (const coord of region.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value === null) continue
          const v = cell.value
          for (const peer of region.cells) {
            if (peer.r === coord.r && peer.c === coord.c) continue
            const peerCell = cellAt(grid, peer)
            if (peerCell.value !== null) continue
            if (!peerCell.candidates.has(v)) continue
            const key = `${peer.r},${peer.c}:${v}`
            if (removedKeys.has(key)) continue
            removedKeys.add(key)
            removals.push({ coord: peer, digit: v })
          }
        }
      }

      for (const region of regions) {
        const positions = new Map<Digit, Coord[]>()
        for (let d = 1; d <= grid.shape.size; d++) positions.set(d, [])
        for (const coord of region.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value !== null) continue
          for (const d of cell.candidates) {
            positions.get(d)!.push(coord)
          }
        }
        for (const [digit, coords] of positions) {
          if (coords.length !== 1) continue
          const coord = coords[0]!
          const key = `${coord.r},${coord.c}`
          if (placedKeys.has(key)) continue
          placedKeys.add(key)
          placements.push({ coord, digit })
        }
      }

      return { removals, placements }
    },
  }
}
