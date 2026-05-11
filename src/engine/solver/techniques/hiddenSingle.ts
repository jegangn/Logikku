import { cellAt } from '../../grid'
import { describeCoord, regionsOf, type Technique } from './_technique'

export const hiddenSingle: Technique = {
  id: 'hidden-single',
  tier: 1,
  name: 'Hidden Single',
  apply(grid) {
    for (const region of regionsOf(grid)) {
      for (let d = 1; d <= grid.shape.size; d++) {
        let foundCoord: { r: number; c: number } | null = null
        let count = 0
        let alreadyPlaced = false
        for (const coord of region.cells) {
          const cell = cellAt(grid, coord)
          if (cell.value === d) {
            alreadyPlaced = true
            break
          }
          if (cell.value !== null) continue
          if (!cell.candidates.has(d)) continue
          count++
          if (count > 1) break
          foundCoord = { r: coord.r, c: coord.c }
        }
        if (alreadyPlaced) continue
        if (count !== 1 || foundCoord === null) continue
        const label = region.id ?? region.kind
        return {
          technique: 'hidden-single',
          tier: 1,
          eliminations: {
            removals: [],
            placements: [{ coord: foundCoord, digit: d }],
          },
          explanation: `Hidden Single in ${label}: ${describeCoord(foundCoord)} = ${d}`,
        }
      }
    }
    return null
  },
}
