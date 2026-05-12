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

export interface XDiagonalParams {
  readonly shape?: GridShape
  readonly id?: string
}

export const DIAGONAL_NW_SE_ID = 'diagonal-nw-se'
export const DIAGONAL_NE_SW_ID = 'diagonal-ne-sw'

export function diagonalRegions(shape: GridShape): ReadonlyArray<NamedRegion> {
  const { size } = shape
  const nwSe: Coord[] = []
  const neSw: Coord[] = []
  for (let i = 0; i < size; i++) {
    nwSe.push({ r: i, c: i })
    neSw.push({ r: i, c: size - 1 - i })
  }
  return [
    { kind: 'diagonal', cells: nwSe, id: DIAGONAL_NW_SE_ID },
    { kind: 'diagonal', cells: neSw, id: DIAGONAL_NE_SW_ID },
  ]
}

export function createXDiagonalConstraint(params: XDiagonalParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const regions = diagonalRegions(shape)
  const id = params.id ?? `x-diagonal:${++counter}`

  return {
    id,
    kind: 'x-diagonal',
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
