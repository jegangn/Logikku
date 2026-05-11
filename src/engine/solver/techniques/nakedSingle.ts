import { cellAt } from '../../grid'
import { describeCoord, type Technique } from './_technique'

export const nakedSingle: Technique = {
  id: 'naked-single',
  tier: 1,
  name: 'Naked Single',
  apply(grid) {
    for (let r = 0; r < grid.shape.size; r++) {
      for (let c = 0; c < grid.shape.size; c++) {
        const cell = cellAt(grid, { r, c })
        if (cell.value !== null) continue
        if (cell.candidates.size !== 1) continue
        const digit = [...cell.candidates][0]!
        return {
          technique: 'naked-single',
          tier: 1,
          eliminations: {
            removals: [],
            placements: [{ coord: { r, c }, digit }],
          },
          explanation: `Naked Single: ${describeCoord({ r, c })} = ${digit}`,
        }
      }
    }
    return null
  },
}
