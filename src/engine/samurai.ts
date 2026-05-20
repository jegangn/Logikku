import type { Coord } from './types'

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
