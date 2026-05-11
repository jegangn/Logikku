import { cellAt, coordKey } from '../../grid'
import {
  describeCells,
  regionsOf,
  type CandidateRemoval,
  type Coord,
  type Technique,
} from './_technique'

export const lockedCandidatesPointing: Technique = {
  id: 'locked-candidates-pointing',
  tier: 2,
  name: 'Locked Candidates (Pointing)',
  apply(grid) {
    const regions = regionsOf(grid)
    const boxes = regions.filter((r) => r.kind === 'box')
    const rows = regions.filter((r) => r.kind === 'row')
    const cols = regions.filter((r) => r.kind === 'column')

    const rowById = new Map(rows.map((r) => [r.id ?? '', r]))
    const colById = new Map(cols.map((c) => [c.id ?? '', c]))

    for (const box of boxes) {
      const boxKeys = new Set(box.cells.map(coordKey))

      for (let digit = 1; digit <= grid.shape.size; digit++) {
        const positions: Coord[] = []
        for (const coord of box.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value !== null) continue
          if (cell.candidates.has(digit)) positions.push(coord)
        }
        if (positions.length < 2) continue

        const firstRow = positions[0]!.r
        const sameRow = positions.every((p) => p.r === firstRow)
        if (sameRow) {
          const rowRegion = rowById.get(`row-${firstRow}`)
          if (rowRegion) {
            const removals: CandidateRemoval[] = []
            for (const coord of rowRegion.cells) {
              if (boxKeys.has(coordKey(coord))) continue
              const cell = cellAt(grid, coord)
              if (cell.value !== null) continue
              if (cell.candidates.has(digit)) removals.push({ coord, digit })
            }
            if (removals.length > 0) {
              return {
                technique: 'locked-candidates-pointing',
                tier: 2,
                eliminations: { removals, placements: [] },
                explanation: `Pointing: digit ${digit} in ${box.id} only in row-${firstRow} -> eliminate ${digit} from ${describeCells(removals.map((r) => r.coord))}`,
              }
            }
          }
        }

        const firstCol = positions[0]!.c
        const sameCol = positions.every((p) => p.c === firstCol)
        if (sameCol) {
          const colRegion = colById.get(`col-${firstCol}`)
          if (colRegion) {
            const removals: CandidateRemoval[] = []
            for (const coord of colRegion.cells) {
              if (boxKeys.has(coordKey(coord))) continue
              const cell = cellAt(grid, coord)
              if (cell.value !== null) continue
              if (cell.candidates.has(digit)) removals.push({ coord, digit })
            }
            if (removals.length > 0) {
              return {
                technique: 'locked-candidates-pointing',
                tier: 2,
                eliminations: { removals, placements: [] },
                explanation: `Pointing: digit ${digit} in ${box.id} only in col-${firstCol} -> eliminate ${digit} from ${describeCells(removals.map((r) => r.coord))}`,
              }
            }
          }
        }
      }
    }
    return null
  },
}
