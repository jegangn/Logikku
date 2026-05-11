import { cellAt, coordKey } from '../../grid'
import {
  describeCells,
  regionsOf,
  type CandidateRemoval,
  type Coord,
  type NamedRegion,
  type Technique,
} from './_technique'

function boxIndexOf(coord: Coord, boxRows: number, boxCols: number): string {
  return `${Math.floor(coord.r / boxRows)},${Math.floor(coord.c / boxCols)}`
}

export const lockedCandidatesClaiming: Technique = {
  id: 'locked-candidates-claiming',
  tier: 2,
  name: 'Locked Candidates (Claiming)',
  apply(grid) {
    const regions = regionsOf(grid)
    const boxes = regions.filter((r) => r.kind === 'box')
    const lines: NamedRegion[] = regions.filter(
      (r) => r.kind === 'row' || r.kind === 'column',
    )
    const { boxRows, boxCols } = grid.shape

    const boxByIndex = new Map<string, NamedRegion>()
    for (const box of boxes) {
      const first = box.cells[0]
      if (!first) continue
      boxByIndex.set(boxIndexOf(first, boxRows, boxCols), box)
    }

    for (const line of lines) {
      const lineKeys = new Set(line.cells.map(coordKey))

      for (let digit = 1; digit <= grid.shape.size; digit++) {
        const positions: Coord[] = []
        for (const coord of line.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value !== null) continue
          if (cell.candidates.has(digit)) positions.push(coord)
        }
        if (positions.length < 2) continue

        const firstBox = boxIndexOf(positions[0]!, boxRows, boxCols)
        const sameBox = positions.every(
          (p) => boxIndexOf(p, boxRows, boxCols) === firstBox,
        )
        if (!sameBox) continue

        const box = boxByIndex.get(firstBox)
        if (!box) continue

        const removals: CandidateRemoval[] = []
        for (const coord of box.cells) {
          if (lineKeys.has(coordKey(coord))) continue
          const cell = cellAt(grid, coord)
          if (cell.value !== null) continue
          if (cell.candidates.has(digit)) removals.push({ coord, digit })
        }
        if (removals.length > 0) {
          return {
            technique: 'locked-candidates-claiming',
            tier: 2,
            eliminations: { removals, placements: [] },
            explanation: `Claiming: digit ${digit} in ${line.id} only in ${box.id} -> eliminate ${digit} from ${describeCells(removals.map((r) => r.coord))}`,
          }
        }
      }
    }
    return null
  },
}
