import { cagesOf, type Cage } from '../../../constraints/killer'
import { cellAt } from '../../../grid'
import { describeCoord, type Technique } from '../_technique'
import type { Coord, NamedRegion } from '../../../types'

/**
 * Cage 45 (single innie / outie). A row, column, or box sums to 45 on a 9×9
 * grid. If we can find a set of cages that, taken together, cover a unit
 * (row / col / box) plus or minus exactly one cell, that cell's value is
 * determined. Operates only on regions of the classic 9×9 stack (kind = row,
 * column, or box).
 *
 *   targetSum   = sum of all cages we consider
 *   outiesSum   = sum of cage cells that lie outside the unit
 *   inniesSum   = sum of unit cells not in any of those cages
 *   sum(unit)   = targetSum - outiesSum + inniesSum   (== 45 for full 9×9 row)
 *
 * In the single-innie case (outies empty, innies = one cell), that one cell =
 * 45 - targetSum. In the single-outie case (innies empty, outies = one cell),
 * the outie cell = targetSum - 45.
 */
export const cage45Innie: Technique = {
  id: 'cage-45-innie',
  tier: 2,
  name: 'Cage 45 (Innie / Outie)',
  apply(grid) {
    const cages = cagesOf(grid)
    if (cages.length === 0) return null
    const size = grid.shape.size
    if (size !== 9) return null

    const cageByCell = new Map<string, Cage>()
    for (const cage of cages) {
      for (const co of cage.cells) cageByCell.set(`${co.r},${co.c}`, cage)
    }

    const units: NamedRegion[] = []
    for (const constraint of grid.constraints) {
      for (const region of constraint.regions) {
        if (
          region.kind === 'row' ||
          region.kind === 'column' ||
          region.kind === 'box'
        ) {
          units.push(region)
        }
      }
    }

    for (const unit of units) {
      const unitSet = new Set(unit.cells.map((co) => `${co.r},${co.c}`))
      // Collect cages that have any cell in this unit.
      const touching = new Set<Cage>()
      for (const co of unit.cells) {
        const cage = cageByCell.get(`${co.r},${co.c}`)
        if (cage) touching.add(cage)
      }
      if (touching.size === 0) continue
      let cageSum = 0
      const cageCellKeys = new Set<string>()
      for (const cage of touching) {
        cageSum += cage.sum
        for (const co of cage.cells) cageCellKeys.add(`${co.r},${co.c}`)
      }

      // Innies = unit cells not in any touching cage.
      const innies: Coord[] = []
      for (const co of unit.cells) {
        if (!cageCellKeys.has(`${co.r},${co.c}`)) innies.push(co)
      }
      // Outies = cage cells not in this unit.
      const outies: Coord[] = []
      for (const cage of touching) {
        for (const co of cage.cells) {
          if (!unitSet.has(`${co.r},${co.c}`)) outies.push(co)
        }
      }

      // Single innie, no outies. Innie value = 45 - cageSum.
      if (innies.length === 1 && outies.length === 0) {
        const coord = innies[0]!
        const cell = cellAt(grid, coord)
        if (cell.value !== null) continue
        const value = 45 - cageSum
        if (value < 1 || value > size) continue
        if (!cell.candidates.has(value)) continue
        return {
          technique: 'cage-45-innie',
          tier: 2,
          eliminations: {
            removals: [],
            placements: [{ coord, digit: value }],
          },
          explanation: `Cage 45 innie in ${unit.id ?? unit.kind}: ${describeCoord(coord)} = ${value}`,
        }
      }

      // Single outie, no innies. Outie value = cageSum - 45.
      if (outies.length === 1 && innies.length === 0) {
        const coord = outies[0]!
        const cell = cellAt(grid, coord)
        if (cell.value !== null) continue
        const value = cageSum - 45
        if (value < 1 || value > size) continue
        if (!cell.candidates.has(value)) continue
        return {
          technique: 'cage-45-innie',
          tier: 2,
          eliminations: {
            removals: [],
            placements: [{ coord, digit: value }],
          },
          explanation: `Cage 45 outie in ${unit.id ?? unit.kind}: ${describeCoord(coord)} = ${value}`,
        }
      }
    }
    return null
  },
}
