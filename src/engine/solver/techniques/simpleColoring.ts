import { cellAt, peersOf } from '../../grid'
import type { CandidateRemoval, Coord, Digit, Grid, Technique } from '../../types'
import { describeCoord, regionsOf } from './_technique'

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

function buildBilocationGraph(
  grid: Grid,
  digit: Digit,
): { nodes: Set<string>; adjacency: Map<string, Set<string>> } {
  const adjacency = new Map<string, Set<string>>()
  const nodes = new Set<string>()
  const regions = regionsOf(grid)
  for (const region of regions) {
    const candidatesInRegion: Coord[] = []
    let placed = false
    for (const coord of region.cells) {
      const cell = cellAt(grid, coord)
      if (cell.value === digit) {
        placed = true
        break
      }
      if (cell.value !== null) continue
      if (cell.candidates.has(digit)) candidatesInRegion.push(coord)
    }
    if (placed) continue
    if (candidatesInRegion.length !== 2) continue
    const [a, b] = candidatesInRegion as [Coord, Coord]
    const aKey = coordKey(a)
    const bKey = coordKey(b)
    nodes.add(aKey)
    nodes.add(bKey)
    if (!adjacency.has(aKey)) adjacency.set(aKey, new Set())
    if (!adjacency.has(bKey)) adjacency.set(bKey, new Set())
    adjacency.get(aKey)!.add(bKey)
    adjacency.get(bKey)!.add(aKey)
  }
  return { nodes, adjacency }
}

function parseKey(key: string): Coord {
  const [r, c] = key.split(',').map(Number) as [number, number]
  return { r, c }
}

export const simpleColoring: Technique = {
  id: 'simple-coloring',
  tier: 4,
  name: 'Simple Coloring',
  apply(grid) {
    const N = grid.shape.size
    for (let digit = 1; digit <= N; digit++) {
      const { nodes, adjacency } = buildBilocationGraph(grid, digit)
      // Count total edges (each undirected edge counted once).
      let edgeCount = 0
      for (const [, neighbors] of adjacency) edgeCount += neighbors.size
      edgeCount = edgeCount / 2
      if (edgeCount < 2) continue

      // BFS color each connected component.
      const color = new Map<string, 0 | 1>()
      const componentOf = new Map<string, number>()
      let componentIdx = 0
      for (const start of nodes) {
        if (color.has(start)) continue
        componentIdx++
        color.set(start, 0)
        componentOf.set(start, componentIdx)
        const queue: string[] = [start]
        while (queue.length > 0) {
          const u = queue.shift()!
          const uColor = color.get(u)!
          for (const v of adjacency.get(u) ?? []) {
            if (!color.has(v)) {
              color.set(v, (uColor === 0 ? 1 : 0) as 0 | 1)
              componentOf.set(v, componentIdx)
              queue.push(v)
            }
          }
        }
      }

      // Group cells by (component, color).
      const groups = new Map<string, Coord[]>()
      for (const key of nodes) {
        const comp = componentOf.get(key)!
        const col = color.get(key)!
        const g = `${comp}:${col}`
        if (!groups.has(g)) groups.set(g, [])
        groups.get(g)!.push(parseKey(key))
      }

      // Skip tiny chains (< 3 links is too small to produce coloring eliminations).
      if (edgeCount < 3) {
        // Even with 2 edges (3 nodes in a line), a trap might exist if the two
        // ends share a region. But the spec asks us to skip components that
        // can't produce eliminations. Keep going - just continue checking.
      }

      // Color trap: two same-color cells of the same component that see each other.
      for (const [groupKey, cells] of groups) {
        for (let i = 0; i < cells.length; i++) {
          for (let j = i + 1; j < cells.length; j++) {
            if (arePeers(cells[i]!, cells[j]!, grid)) {
              // Entire color is OFF - eliminate D from all cells of this color.
              const removals: CandidateRemoval[] = []
              for (const c of cells) {
                const cell = cellAt(grid, c)
                if (cell.candidates.has(digit)) {
                  removals.push({ coord: c, digit })
                }
              }
              if (removals.length > 0) {
                const trapped = cells.map(describeCoord).join(',')
                return {
                  technique: 'simple-coloring',
                  tier: 4,
                  eliminations: { removals, placements: [] },
                  explanation: `Simple Coloring on ${digit}: color trap at ${groupKey}, ${describeCoord(cells[i]!)} and ${describeCoord(cells[j]!)} see each other; eliminate ${digit} from {${trapped}}`,
                }
              }
            }
          }
        }
      }

      // Color wrap: any cell outside the component that sees both a color-0 and
      // a color-1 cell of the same component cannot be D.
      // Build map of component -> {0: cells, 1: cells}
      const compColorMap = new Map<number, { 0: Coord[]; 1: Coord[] }>()
      for (const [groupKey, cells] of groups) {
        const [compStr, colStr] = groupKey.split(':') as [string, string]
        const comp = Number(compStr)
        const col = Number(colStr) as 0 | 1
        if (!compColorMap.has(comp)) compColorMap.set(comp, { 0: [], 1: [] })
        compColorMap.get(comp)![col] = cells
      }

      const wrapRemovals: CandidateRemoval[] = []
      const seenWrap = new Set<string>()
      for (const [, byColor] of compColorMap) {
        if (byColor[0].length === 0 || byColor[1].length === 0) continue
        const set0 = new Set(byColor[0].map(coordKey))
        const set1 = new Set(byColor[1].map(coordKey))
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const key = `${r},${c}`
            if (set0.has(key) || set1.has(key)) continue
            const cell = cellAt(grid, { r, c })
            if (cell.value !== null) continue
            if (!cell.candidates.has(digit)) continue
            let seesZero = false
            let seesOne = false
            for (const p of peersOf({ r, c }, grid.shape)) {
              const pk = coordKey(p)
              if (set0.has(pk)) seesZero = true
              if (set1.has(pk)) seesOne = true
              if (seesZero && seesOne) break
            }
            if (seesZero && seesOne) {
              if (!seenWrap.has(key)) {
                seenWrap.add(key)
                wrapRemovals.push({ coord: { r, c }, digit })
              }
            }
          }
        }
      }
      if (wrapRemovals.length > 0) {
        return {
          technique: 'simple-coloring',
          tier: 4,
          eliminations: { removals: wrapRemovals, placements: [] },
          explanation: `Simple Coloring on ${digit}: color wrap - ${wrapRemovals.length} cell(s) see both colors`,
        }
      }
    }
    return null
  },
}
