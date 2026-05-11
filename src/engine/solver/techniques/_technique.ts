import type { CandidateRemoval, Coord, Digit, Grid, NamedRegion, Placement, Step, Technique } from '../../types'
import { cellAt } from '../../grid'

export type { Technique, Step, Grid, Coord, Digit, NamedRegion, CandidateRemoval, Placement }

export function regionsOf(grid: Grid): ReadonlyArray<NamedRegion> {
  const out: NamedRegion[] = []
  for (const constraint of grid.constraints) {
    for (const region of constraint.regions) out.push(region)
  }
  return out
}

export function regionCells(grid: Grid, region: NamedRegion) {
  return region.cells.map((coord) => cellAt(grid, coord))
}

export function describeCoord(coord: Coord): string {
  return `r${coord.r + 1}c${coord.c + 1}`
}

export function describeCells(coords: ReadonlyArray<Coord>): string {
  return coords.map(describeCoord).join(',')
}
