import type { Cell, Coord, Digit, SamuraiBoard } from './types'
import { CLASSIC_9, cellAt, cloneGrid, createGrid, recomputeCandidates, setValue } from './grid'
import { createClassicConstraint } from './constraints/classic'

export type CornerRole = 'NW' | 'NE' | 'SW' | 'SE'

export interface CornerLayout {
  readonly idx: number
  readonly role: CornerRole
  readonly centerBox: { readonly r: number; readonly c: number }
  readonly cornerBox: { readonly r: number; readonly c: number }
}

export const SAMURAI_LAYOUT: {
  readonly centerIdx: number
  readonly corners: ReadonlyArray<CornerLayout>
} = {
  centerIdx: 0,
  corners: [
    { idx: 1, role: 'NW', centerBox: { r: 0, c: 0 }, cornerBox: { r: 2, c: 2 } },
    { idx: 2, role: 'NE', centerBox: { r: 0, c: 2 }, cornerBox: { r: 2, c: 0 } },
    { idx: 3, role: 'SW', centerBox: { r: 2, c: 0 }, cornerBox: { r: 0, c: 2 } },
    { idx: 4, role: 'SE', centerBox: { r: 2, c: 2 }, cornerBox: { r: 0, c: 0 } },
  ],
}

export function globalCoordKey(gridIdx: number, coord: Coord): string {
  return `${gridIdx},${coord.r},${coord.c}`
}

export interface SharedLocation {
  readonly grid: number
  readonly coord: Coord
}

/**
 * Computes the shared-cells map for the standard cruciform topology.
 * Keys are canonical center-grid global keys (e.g. "0,1,1"); values are
 * the list of (grid, coord) pairs representing the same global cell.
 * Each overlap contributes 9 entries (one per cell in a 3×3 box).
 */
export function computeSharedCells(): ReadonlyMap<string, ReadonlyArray<SharedLocation>> {
  const map = new Map<string, SharedLocation[]>()
  for (const corner of SAMURAI_LAYOUT.corners) {
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const centerCoord: Coord = {
          r: corner.centerBox.r * 3 + dr,
          c: corner.centerBox.c * 3 + dc,
        }
        const cornerCoord: Coord = {
          r: corner.cornerBox.r * 3 + dr,
          c: corner.cornerBox.c * 3 + dc,
        }
        const key = globalCoordKey(SAMURAI_LAYOUT.centerIdx, centerCoord)
        map.set(key, [
          { grid: SAMURAI_LAYOUT.centerIdx, coord: centerCoord },
          { grid: corner.idx, coord: cornerCoord },
        ])
      }
    }
  }
  return map
}

export function createSamuraiBoard(): SamuraiBoard {
  const grids = [0, 1, 2, 3, 4].map(() => {
    const shape = CLASSIC_9
    return createGrid(shape, [createClassicConstraint({ shape })])
  }) as unknown as readonly [
    SamuraiBoard['grids'][0],
    SamuraiBoard['grids'][1],
    SamuraiBoard['grids'][2],
    SamuraiBoard['grids'][3],
    SamuraiBoard['grids'][4],
  ]
  const sharedCells = computeSharedCells()
  return { grids, sharedCells }
}

export function samuraiCellAt(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): Cell {
  const grid = board.grids[gridIdx]
  if (!grid) throw new RangeError(`gridIdx ${gridIdx} out of range`)
  return cellAt(grid, coord)
}

/**
 * Returns all (grid, coord) pairs representing the same global cell.
 * For an unshared cell, returns [{grid: gridIdx, coord}]. For a shared cell,
 * returns 2 entries (the center+corner pair).
 */
export function samuraiSharedLocations(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): ReadonlyArray<SharedLocation> {
  for (const entries of board.sharedCells.values()) {
    for (const e of entries) {
      if (e.grid === gridIdx && e.coord.r === coord.r && e.coord.c === coord.c) {
        return entries
      }
    }
  }
  return [{ grid: gridIdx, coord }]
}

export function setValueShared(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
  digit: Digit,
): void {
  const locations = samuraiSharedLocations(board, gridIdx, coord)
  for (const loc of locations) {
    setValue(board.grids[loc.grid]!, loc.coord, digit)
  }
}

export function eraseShared(
  board: SamuraiBoard,
  gridIdx: number,
  coord: Coord,
): void {
  const locations = samuraiSharedLocations(board, gridIdx, coord)
  for (const loc of locations) {
    const cell = cellAt(board.grids[loc.grid]!, loc.coord)
    cell.value = null
  }
  const affectedGrids = new Set(locations.map((l) => l.grid))
  for (const idx of affectedGrids) {
    recomputeCandidates(board.grids[idx]!)
  }
}

export function samuraiIsComplete(board: SamuraiBoard): boolean {
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        if (cellAt(grid, { r, c }).value === null) return false
      }
    }
  }
  return true
}

export function samuraiCloneBoard(board: SamuraiBoard): SamuraiBoard {
  const grids = board.grids.map((g) => cloneGrid(g)) as unknown as SamuraiBoard['grids']
  // sharedCells is structural — safe to share by reference, since map is
  // ReadonlyMap and entries are readonly.
  return { grids, sharedCells: board.sharedCells }
}

export function samuraiConsistencyCheck(board: SamuraiBoard): void {
  for (const [key, entries] of board.sharedCells) {
    if (entries.length < 2) continue
    const values = entries.map((e) => cellAt(board.grids[e.grid]!, e.coord).value)
    const first = values[0]
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== first) {
        const cornerLayout = SAMURAI_LAYOUT.corners.find((c) => c.idx === entries[i]!.grid)
        const role = cornerLayout?.role ?? `grid${entries[i]!.grid}`
        const centerCoord = entries[0]!.coord
        throw new Error(
          `shared cell mismatch at ${key}: center (${centerCoord.r},${centerCoord.c}) has ${first}, ${role} corner has ${values[i]}`,
        )
      }
    }
  }
}

/**
 * Returns the set of cells (by global key "gridIdx,r,c") that are involved in a
 * peer conflict within any of their containing sub-grids. The grader and UI
 * use this to highlight problem cells.
 */
export function samuraiConflicts(board: SamuraiBoard): ReadonlySet<string> {
  const out = new Set<string>()
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    for (const constraint of grid.constraints) {
      for (const region of constraint.regions) {
        const positions = new Map<Digit, Coord[]>()
        for (const coord of region.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value === null) continue
          const list = positions.get(cell.value) ?? []
          list.push(coord)
          positions.set(cell.value, list)
        }
        for (const list of positions.values()) {
          if (list.length > 1) {
            for (const co of list) out.add(globalCoordKey(g, co))
          }
        }
      }
    }
  }
  return out
}
