import { cellAt } from '../../grid'
import type { CandidateRemoval, Coord, Digit } from '../../types'
import { describeCells, regionCells, regionsOf, type Technique } from './_technique'

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

function findNakedSubset(
  grid: Parameters<Technique['apply']>[0],
  size: number,
  technique: string,
  techLabel: string,
) {
  for (const region of regionsOf(grid)) {
    const unsolved = regionCells(grid, region).filter(
      (cell) => cell.value === null && cell.candidates.size >= 2 && cell.candidates.size <= size,
    )
    if (unsolved.length < size) continue

    for (const combo of combinations(unsolved, size)) {
      const union = new Set<Digit>()
      for (const cell of combo) {
        for (const d of cell.candidates) union.add(d)
      }
      if (union.size !== size) continue

      const comboKeys = new Set(combo.map((cell) => `${cell.coord.r},${cell.coord.c}`))
      const removals: CandidateRemoval[] = []
      for (const coord of region.cells) {
        const key = `${coord.r},${coord.c}`
        if (comboKeys.has(key)) continue
        const cell = cellAt(grid, coord)
        if (cell.value !== null) continue
        for (const d of union) {
          if (cell.candidates.has(d)) {
            removals.push({ coord: { r: coord.r, c: coord.c }, digit: d })
          }
        }
      }
      if (removals.length === 0) continue

      const label = region.id ?? region.kind
      const cellCoords: Coord[] = combo.map((cell) => ({ r: cell.coord.r, c: cell.coord.c }))
      const digits = [...union].sort((a, b) => a - b)
      const removedCoords: Coord[] = []
      const seen = new Set<string>()
      for (const rm of removals) {
        const k = `${rm.coord.r},${rm.coord.c}`
        if (seen.has(k)) continue
        seen.add(k)
        removedCoords.push(rm.coord)
      }
      return {
        technique,
        tier: 3,
        eliminations: { removals, placements: [] },
        explanation:
          `${techLabel} {${digits.join(',')}} in ${label}: ` +
          `${describeCells(cellCoords)} → eliminate ${digits.join(',')} from ${describeCells(removedCoords)}`,
      }
    }
  }
  return null
}

export const nakedPair: Technique = {
  id: 'naked-pair',
  tier: 3,
  name: 'Naked Pair',
  apply(grid) {
    return findNakedSubset(grid, 2, 'naked-pair', 'Naked Pair')
  },
}

export const nakedTriple: Technique = {
  id: 'naked-triple',
  tier: 3,
  name: 'Naked Triple',
  apply(grid) {
    return findNakedSubset(grid, 3, 'naked-triple', 'Naked Triple')
  },
}

export const nakedQuad: Technique = {
  id: 'naked-quad',
  tier: 3,
  name: 'Naked Quad',
  apply(grid) {
    return findNakedSubset(grid, 4, 'naked-quad', 'Naked Quad')
  },
}
