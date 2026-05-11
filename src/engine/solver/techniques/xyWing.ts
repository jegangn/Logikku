import { cellAt, peersOf } from '../../grid'
import type { CandidateRemoval, Coord, Digit, Grid, Technique } from '../../types'
import { describeCoord } from './_technique'

function coordKey(coord: Coord): string {
  return `${coord.r},${coord.c}`
}

function arePeers(a: Coord, b: Coord, grid: Grid): boolean {
  if (a.r === b.r && a.c === b.c) return false
  for (const p of peersOf(a, grid.shape)) {
    if (p.r === b.r && p.c === b.c) return true
  }
  return false
}

function findBivalueCells(grid: Grid): Array<{ coord: Coord; digits: [Digit, Digit] }> {
  const out: Array<{ coord: Coord; digits: [Digit, Digit] }> = []
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value !== null) continue
      if (cell.candidates.size !== 2) continue
      const [a, b] = [...cell.candidates] as [Digit, Digit]
      out.push({ coord: { r, c }, digits: [a, b] })
    }
  }
  return out
}

export const xyWing: Technique = {
  id: 'xy-wing',
  tier: 4,
  name: 'XY-Wing',
  apply(grid) {
    const bivalues = findBivalueCells(grid)
    if (bivalues.length < 3) return null

    for (const pivot of bivalues) {
      const [X, Y] = pivot.digits
      // For each ordering of which digit is "X" and which is "Y", try to find wings.
      for (const [pivotX, pivotY] of [
        [X, Y],
        [Y, X],
      ] as Array<[Digit, Digit]>) {
        for (const wingB of bivalues) {
          if (wingB.coord.r === pivot.coord.r && wingB.coord.c === pivot.coord.c) continue
          if (!arePeers(pivot.coord, wingB.coord, grid)) continue
          // wingB must be {Y, Z} where Z != X
          const bDigits = wingB.digits
          if (!bDigits.includes(pivotY)) continue
          const Z = bDigits[0] === pivotY ? bDigits[1] : bDigits[0]
          if (Z === pivotX) continue
          for (const wingC of bivalues) {
            if (wingC.coord.r === pivot.coord.r && wingC.coord.c === pivot.coord.c) continue
            if (wingC.coord.r === wingB.coord.r && wingC.coord.c === wingB.coord.c) continue
            if (!arePeers(pivot.coord, wingC.coord, grid)) continue
            // wingC must be {X, Z}
            const cDigits = wingC.digits
            if (!cDigits.includes(pivotX)) continue
            const cOther = cDigits[0] === pivotX ? cDigits[1] : cDigits[0]
            if (cOther !== Z) continue

            // Now find common peers of wingB and wingC (excluding pivot and the wings themselves).
            const removals: CandidateRemoval[] = []
            const seen = new Set<string>()
            for (const p of peersOf(wingB.coord, grid.shape)) {
              if (!arePeers(wingC.coord, p, grid)) continue
              const key = coordKey(p)
              if (seen.has(key)) continue
              seen.add(key)
              if (p.r === pivot.coord.r && p.c === pivot.coord.c) continue
              if (p.r === wingB.coord.r && p.c === wingB.coord.c) continue
              if (p.r === wingC.coord.r && p.c === wingC.coord.c) continue
              const cell = cellAt(grid, p)
              if (cell.value !== null) continue
              if (cell.candidates.has(Z)) {
                removals.push({ coord: p, digit: Z })
              }
            }
            if (removals.length > 0) {
              return {
                technique: 'xy-wing',
                tier: 4,
                eliminations: { removals, placements: [] },
                explanation: `XY-Wing: pivot ${describeCoord(pivot.coord)}={${pivotX},${pivotY}}, wings ${describeCoord(wingB.coord)}={${pivotY},${Z}} and ${describeCoord(wingC.coord)}={${pivotX},${Z}} eliminate ${Z}`,
              }
            }
          }
        }
      }
    }
    return null
  },
}
