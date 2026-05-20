import type { Cell, Coord, SamuraiBoard } from './types'
import { CLASSIC_9, cellAt, createGrid } from './grid'
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
