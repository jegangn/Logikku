import { cellAt } from '../../grid'
import type { CandidateRemoval, Coord, Digit } from '../../types'
import { describeCells, regionsOf, type Technique } from './_technique'

function combinations<T>(items: ReadonlyArray<T>, size: number): T[][] {
  const out: T[][] = []
  const buf: T[] = []
  function recurse(start: number) {
    if (buf.length === size) {
      out.push(buf.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      buf.push(items[i]!)
      recurse(i + 1)
      buf.pop()
    }
  }
  recurse(0)
  return out
}

function findHiddenSubset(
  grid: Parameters<Technique['apply']>[0],
  size: number,
  technique: string,
  techLabel: string,
) {
  const N = grid.shape.size
  for (const region of regionsOf(grid)) {
    const digitToCells = new Map<Digit, Coord[]>()
    for (let d = 1; d <= N; d++) digitToCells.set(d, [])
    const placedDigits = new Set<Digit>()
    for (const coord of region.cells) {
      const cell = cellAt(grid, coord)
      if (cell.value !== null) {
        placedDigits.add(cell.value)
        continue
      }
      for (const d of cell.candidates) {
        digitToCells.get(d)!.push({ r: coord.r, c: coord.c })
      }
    }

    const eligibleDigits: Digit[] = []
    for (let d = 1; d <= N; d++) {
      if (placedDigits.has(d)) continue
      const cells = digitToCells.get(d)!
      if (cells.length >= 2 && cells.length <= size) eligibleDigits.push(d)
    }
    if (eligibleDigits.length < size) continue

    for (const combo of combinations(eligibleDigits, size)) {
      const cellKeys = new Set<string>()
      const cellCoords: Coord[] = []
      for (const d of combo) {
        for (const coord of digitToCells.get(d)!) {
          const key = `${coord.r},${coord.c}`
          if (cellKeys.has(key)) continue
          cellKeys.add(key)
          cellCoords.push(coord)
        }
      }
      if (cellCoords.length !== size) continue

      const digitSet = new Set<Digit>(combo)
      const removals: CandidateRemoval[] = []
      for (const coord of cellCoords) {
        const cell = cellAt(grid, coord)
        for (const d of cell.candidates) {
          if (!digitSet.has(d)) {
            removals.push({ coord: { r: coord.r, c: coord.c }, digit: d })
          }
        }
      }
      if (removals.length === 0) continue

      const label = region.id ?? region.kind
      const digits = [...combo].sort((a, b) => a - b)
      const sortedCellCoords = [...cellCoords].sort((a, b) => a.r - b.r || a.c - b.c)
      return {
        technique,
        tier: 3,
        eliminations: { removals, placements: [] },
        explanation:
          `${techLabel} {${digits.join(',')}} in ${label}: ` +
          `${describeCells(sortedCellCoords)} → keep ${digits.join(',')}, eliminate others`,
      }
    }
  }
  return null
}

export const hiddenPair: Technique = {
  id: 'hidden-pair',
  tier: 3,
  name: 'Hidden Pair',
  apply(grid) {
    return findHiddenSubset(grid, 2, 'hidden-pair', 'Hidden Pair')
  },
}

export const hiddenTriple: Technique = {
  id: 'hidden-triple',
  tier: 3,
  name: 'Hidden Triple',
  apply(grid) {
    return findHiddenSubset(grid, 3, 'hidden-triple', 'Hidden Triple')
  },
}

export const hiddenQuad: Technique = {
  id: 'hidden-quad',
  tier: 3,
  name: 'Hidden Quad',
  apply(grid) {
    return findHiddenSubset(grid, 4, 'hidden-quad', 'Hidden Quad')
  },
}
