import { cellAt } from '../../grid'
import type { CandidateRemoval, Digit, Grid, Step, Technique } from '../../types'

type Orientation = 'row' | 'column'

function positionsInRow(grid: Grid, row: number, digit: Digit): number[] {
  const out: number[] = []
  for (let c = 0; c < grid.shape.size; c++) {
    const cell = cellAt(grid, { r: row, c })
    if (cell.value !== null) continue
    if (cell.candidates.has(digit)) out.push(c)
  }
  return out
}

function positionsInCol(grid: Grid, col: number, digit: Digit): number[] {
  const out: number[] = []
  for (let r = 0; r < grid.shape.size; r++) {
    const cell = cellAt(grid, { r, c: col })
    if (cell.value !== null) continue
    if (cell.candidates.has(digit)) out.push(r)
  }
  return out
}

function combinations(values: number[], size: number): number[][] {
  const out: number[][] = []
  const pick: number[] = []
  function recurse(start: number) {
    if (pick.length === size) {
      out.push([...pick])
      return
    }
    for (let i = start; i < values.length; i++) {
      pick.push(values[i]!)
      recurse(i + 1)
      pick.pop()
    }
  }
  recurse(0)
  return out
}

function findFish(grid: Grid, size: number, name: 'x-wing' | 'swordfish'): Step | null {
  const N = grid.shape.size
  for (let digit = 1; digit <= N; digit++) {
    // Row-based fish: pick `size` rows whose digit-columns union to exactly `size` columns.
    const candidateRows: number[] = []
    const rowCols: Map<number, number[]> = new Map()
    for (let r = 0; r < N; r++) {
      const cols = positionsInRow(grid, r, digit)
      if (cols.length >= 2 && cols.length <= size) {
        candidateRows.push(r)
        rowCols.set(r, cols)
      }
    }
    for (const combo of combinations(candidateRows, size)) {
      const colSet = new Set<number>()
      for (const r of combo) for (const c of rowCols.get(r)!) colSet.add(c)
      if (colSet.size !== size) continue
      const cols = [...colSet]
      const removals: CandidateRemoval[] = []
      for (const c of cols) {
        for (let r = 0; r < N; r++) {
          if (combo.includes(r)) continue
          const cell = cellAt(grid, { r, c })
          if (cell.value !== null) continue
          if (cell.candidates.has(digit)) {
            removals.push({ coord: { r, c }, digit })
          }
        }
      }
      if (removals.length > 0) {
        return buildStep(name, digit, 'row', combo, cols, removals)
      }
    }

    // Column-based fish
    const candidateCols: number[] = []
    const colRows: Map<number, number[]> = new Map()
    for (let c = 0; c < N; c++) {
      const rows = positionsInCol(grid, c, digit)
      if (rows.length >= 2 && rows.length <= size) {
        candidateCols.push(c)
        colRows.set(c, rows)
      }
    }
    for (const combo of combinations(candidateCols, size)) {
      const rowSet = new Set<number>()
      for (const c of combo) for (const r of colRows.get(c)!) rowSet.add(r)
      if (rowSet.size !== size) continue
      const rows = [...rowSet]
      const removals: CandidateRemoval[] = []
      for (const r of rows) {
        for (let c = 0; c < N; c++) {
          if (combo.includes(c)) continue
          const cell = cellAt(grid, { r, c })
          if (cell.value !== null) continue
          if (cell.candidates.has(digit)) {
            removals.push({ coord: { r, c }, digit })
          }
        }
      }
      if (removals.length > 0) {
        return buildStep(name, digit, 'column', combo, rows, removals)
      }
    }
  }
  return null
}

function buildStep(
  name: 'x-wing' | 'swordfish',
  digit: Digit,
  base: Orientation,
  baseIndices: number[],
  coverIndices: number[],
  removals: CandidateRemoval[],
): Step {
  const baseLabel = baseIndices.map((i) => (base === 'row' ? `r${i + 1}` : `c${i + 1}`)).join(',')
  const coverLabel = coverIndices
    .map((i) => (base === 'row' ? `c${i + 1}` : `r${i + 1}`))
    .join(',')
  const display = name === 'x-wing' ? 'X-Wing' : 'Swordfish'
  return {
    technique: name,
    tier: 4,
    eliminations: { removals, placements: [] },
    explanation: `${display} on ${digit}: ${base}s ${baseLabel} share ${coverLabel}`,
  }
}

export const xWing: Technique = {
  id: 'x-wing',
  tier: 4,
  name: 'X-Wing',
  apply(grid) {
    return findFish(grid, 2, 'x-wing')
  },
}

export const swordfish: Technique = {
  id: 'swordfish',
  tier: 4,
  name: 'Swordfish',
  apply(grid) {
    return findFish(grid, 3, 'swordfish')
  },
}
