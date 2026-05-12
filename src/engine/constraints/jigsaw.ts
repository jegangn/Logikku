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

export interface JigsawParams {
  readonly shape?: GridShape
  readonly id?: string
  /** Nine polyomino pieces, each a 9-cell coord list. Replaces classic boxes. */
  readonly pieces?: ReadonlyArray<ReadonlyArray<Coord>>
}

/** Classic 3x3 box partition as the registry-friendly default. */
export function defaultClassicJigsawPieces(
  shape: GridShape,
): ReadonlyArray<ReadonlyArray<Coord>> {
  const pieces: Coord[][] = []
  for (let br = 0; br < shape.size; br += shape.boxRows) {
    for (let bc = 0; bc < shape.size; bc += shape.boxCols) {
      const piece: Coord[] = []
      for (let r = br; r < br + shape.boxRows; r++) {
        for (let c = bc; c < bc + shape.boxCols; c++) {
          piece.push({ r, c })
        }
      }
      pieces.push(piece)
    }
  }
  return pieces
}

function rowAndColumnRegions(shape: GridShape): NamedRegion[] {
  const { size } = shape
  const regions: NamedRegion[] = []
  for (let r = 0; r < size; r++) {
    const cells: Coord[] = []
    for (let c = 0; c < size; c++) cells.push({ r, c })
    regions.push({ kind: 'row', cells, id: `row-${r}` })
  }
  for (let c = 0; c < size; c++) {
    const cells: Coord[] = []
    for (let r = 0; r < size; r++) cells.push({ r, c })
    regions.push({ kind: 'column', cells, id: `col-${c}` })
  }
  return regions
}

export function jigsawPieceRegions(
  pieces: ReadonlyArray<ReadonlyArray<Coord>>,
): NamedRegion[] {
  return pieces.map((piece, i) => ({
    kind: 'jigsaw',
    cells: piece.map((co) => ({ r: co.r, c: co.c })),
    id: `jigsaw-${i + 1}`,
  }))
}

function validatePieces(
  pieces: ReadonlyArray<ReadonlyArray<Coord>>,
  shape: GridShape,
): void {
  const expected = shape.size
  if (pieces.length !== expected) {
    throw new Error(`jigsaw needs ${expected} pieces, got ${pieces.length}`)
  }
  const seen = new Set<string>()
  for (const piece of pieces) {
    if (piece.length !== expected) {
      throw new Error(`each jigsaw piece must have ${expected} cells`)
    }
    for (const coord of piece) {
      const key = `${coord.r},${coord.c}`
      if (seen.has(key)) {
        throw new Error(`jigsaw piece coords overlap at ${key}`)
      }
      seen.add(key)
    }
  }
  if (seen.size !== expected * expected) {
    throw new Error(`jigsaw pieces do not cover all ${expected * expected} cells`)
  }
}

export function createJigsawConstraint(params: JigsawParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `jigsaw:${++counter}`
  const pieces = params.pieces ?? defaultClassicJigsawPieces(shape)
  validatePieces(pieces, shape)
  const regions: NamedRegion[] = [
    ...rowAndColumnRegions(shape),
    ...jigsawPieceRegions(pieces),
  ]

  return {
    id,
    kind: 'jigsaw',
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
      const placedKeys = new Set<string>()
      const removedKeys = new Set<string>()

      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const cell = cellAt(grid, { r, c })
          if (cell.value !== null) continue
          if (cell.candidates.size === 1) {
            const digit = [...cell.candidates][0]!
            const key = `${r},${c}`
            if (placedKeys.has(key)) continue
            placedKeys.add(key)
            placements.push({ coord: { r, c }, digit })
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
          if (coords.length === 1) {
            const coord = coords[0]!
            const key = `${coord.r},${coord.c}`
            if (placedKeys.has(key)) continue
            placedKeys.add(key)
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
    },
  }
}

/** Helper: convert a flat-index region (cell = r*size + c) into Coord[]. */
export function flatToCoords(
  flat: ReadonlyArray<number>,
  size: number,
): Coord[] {
  return flat.map((i) => ({ r: Math.floor(i / size), c: i % size }))
}
