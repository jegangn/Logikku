import type {
  Cell,
  CandidateRemoval,
  Coord,
  Digit,
  Eliminations,
  Grid,
  GridShape,
  NamedRegion,
  Placement,
} from './types'

export const CLASSIC_6: GridShape = { size: 6, boxRows: 2, boxCols: 3 }
export const CLASSIC_9: GridShape = { size: 9, boxRows: 3, boxCols: 3 }
export const CLASSIC_16: GridShape = { size: 16, boxRows: 4, boxCols: 4 }

function fullCandidates(size: number): Set<Digit> {
  const s = new Set<Digit>()
  for (let d = 1; d <= size; d++) s.add(d)
  return s
}

export function createGrid(shape: GridShape, constraints: Grid['constraints'] = []): Grid {
  const cells: Cell[][] = []
  for (let r = 0; r < shape.size; r++) {
    const row: Cell[] = []
    for (let c = 0; c < shape.size; c++) {
      row.push({
        coord: { r, c },
        value: null,
        candidates: fullCandidates(shape.size),
        given: false,
      })
    }
    cells.push(row)
  }
  return { shape, cells, constraints }
}

export function cellAt(grid: Grid, coord: Coord): Cell {
  const { r, c } = coord
  if (r < 0 || c < 0 || r >= grid.shape.size || c >= grid.shape.size) {
    throw new RangeError(`coord (${r}, ${c}) out of bounds for size ${grid.shape.size}`)
  }
  const row = grid.cells[r]
  if (!row) throw new RangeError(`row ${r} missing`)
  const cell = row[c]
  if (!cell) throw new RangeError(`col ${c} missing in row ${r}`)
  return cell
}

export function peersOf(coord: Coord, shape: GridShape): ReadonlyArray<Coord> {
  const { r, c } = coord
  const { size, boxRows, boxCols } = shape
  const set = new Set<string>()
  const out: Coord[] = []
  const add = (rr: number, cc: number) => {
    if (rr === r && cc === c) return
    const key = `${rr},${cc}`
    if (set.has(key)) return
    set.add(key)
    out.push({ r: rr, c: cc })
  }
  for (let cc = 0; cc < size; cc++) add(r, cc)
  for (let rr = 0; rr < size; rr++) add(rr, c)
  const br = Math.floor(r / boxRows) * boxRows
  const bc = Math.floor(c / boxCols) * boxCols
  for (let rr = br; rr < br + boxRows; rr++) {
    for (let cc = bc; cc < bc + boxCols; cc++) {
      add(rr, cc)
    }
  }
  return out
}

export function classicRegions(shape: GridShape): ReadonlyArray<NamedRegion> {
  const { size, boxRows, boxCols } = shape
  const regions: NamedRegion[] = []
  for (let r = 0; r < size; r++) {
    const cells: Coord[] = []
    for (let c = 0; c < size; c++) cells.push({ r, c })
    regions.push({ kind: 'row', cells, id: `row-${r}` })
  }
  for (let c = 0; c < size; c++) {
    const cells: Coord[] = []
    for (let r = 0; r < size; r++) cells.push({ r, c })
    regions.push({ kind: 'column', cells, id: `col-${c}` })
  }
  for (let br = 0; br < size; br += boxRows) {
    for (let bc = 0; bc < size; bc += boxCols) {
      const cells: Coord[] = []
      for (let r = br; r < br + boxRows; r++) {
        for (let c = bc; c < bc + boxCols; c++) {
          cells.push({ r, c })
        }
      }
      regions.push({ kind: 'box', cells, id: `box-${br / boxRows}-${bc / boxCols}` })
    }
  }
  return regions
}

export function cloneGrid(grid: Grid): Grid {
  const cells: Cell[][] = grid.cells.map((row) =>
    row.map((cell) => ({
      coord: cell.coord,
      value: cell.value,
      candidates: new Set(cell.candidates),
      given: cell.given,
    })),
  )
  return { shape: grid.shape, cells, constraints: grid.constraints }
}

export function peersFromConstraints(
  coord: Coord,
  grid: Grid,
): ReadonlyArray<Coord> {
  if (grid.constraints.length === 0) {
    return peersOf(coord, grid.shape)
  }
  const seen = new Set<string>()
  const out: Coord[] = []
  for (const constraint of grid.constraints) {
    for (const region of constraint.regions) {
      let inRegion = false
      for (const cell of region.cells) {
        if (cell.r === coord.r && cell.c === coord.c) {
          inRegion = true
          break
        }
      }
      if (!inRegion) continue
      for (const cell of region.cells) {
        if (cell.r === coord.r && cell.c === coord.c) continue
        const key = `${cell.r},${cell.c}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ r: cell.r, c: cell.c })
      }
    }
  }
  return out
}

export function setValue(grid: Grid, coord: Coord, digit: Digit): void {
  const cell = cellAt(grid, coord)
  cell.value = digit
  cell.candidates.clear()
  for (const p of peersFromConstraints(coord, grid)) {
    cellAt(grid, p).candidates.delete(digit)
  }
}

/**
 * Reset every empty cell's candidates to the full 1..size set, then eliminate
 * digits placed elsewhere within each constraint region. Use after attaching
 * variant constraints (jigsaw, etc.) whose region topology differs from
 * `parsePuzzle`'s classic peer-elim.
 */
export function recomputeCandidates(grid: Grid): void {
  const size = grid.shape.size
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value !== null) {
        cell.candidates.clear()
      } else {
        const next = new Set<Digit>()
        for (let d = 1; d <= size; d++) next.add(d)
        cell.candidates = next
      }
    }
  }
  for (const constraint of grid.constraints) {
    for (const region of constraint.regions) {
      for (const coord of region.cells) {
        const cell = cellAt(grid, coord)
        if (cell.value === null) continue
        const v = cell.value
        for (const peer of region.cells) {
          if (peer.r === coord.r && peer.c === coord.c) continue
          cellAt(grid, peer).candidates.delete(v)
        }
      }
    }
  }
}

export function applyEliminations(grid: Grid, e: Eliminations): void {
  for (const removal of e.removals) {
    cellAt(grid, removal.coord).candidates.delete(removal.digit)
  }
  for (const placement of e.placements) {
    setValue(grid, placement.coord, placement.digit)
  }
}

export function parsePuzzle(input: string, shape: GridShape): Grid {
  const expected = shape.size * shape.size
  if (input.length !== expected) {
    throw new Error(`puzzle string length ${input.length} != expected ${expected} for size ${shape.size}`)
  }
  const grid = createGrid(shape)
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    const r = Math.floor(i / shape.size)
    const c = i % shape.size
    if (ch === '0' || ch === '.') continue
    let digit: number
    if (shape.size <= 9) {
      const code = ch.charCodeAt(0)
      if (code < 49 /* '1' */ || code > 48 + shape.size) {
        throw new Error(`invalid digit "${ch}" at index ${i}`)
      }
      digit = code - 48
    } else {
      const code = ch.charCodeAt(0)
      if (code >= 49 && code <= 57) digit = code - 48
      else if (code >= 65 && code <= 90) digit = code - 55
      else if (code >= 97 && code <= 122) digit = code - 87
      else throw new Error(`invalid digit "${ch}" at index ${i}`)
      if (digit < 1 || digit > shape.size) {
        throw new Error(`digit ${digit} out of range 1..${shape.size}`)
      }
    }
    const cell = cellAt(grid, { r, c })
    cell.value = digit
    cell.given = true
    cell.candidates.clear()
  }
  for (let r = 0; r < shape.size; r++) {
    for (let c = 0; c < shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value !== null) {
        for (const p of peersOf({ r, c }, shape)) {
          cellAt(grid, p).candidates.delete(cell.value)
        }
      }
    }
  }
  return grid
}

export function serializePuzzle(grid: Grid): string {
  const { size } = grid.shape
  let out = ''
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value === null) {
        out += '0'
      } else if (size <= 9) {
        out += String(cell.value)
      } else if (cell.value <= 9) {
        out += String(cell.value)
      } else {
        out += String.fromCharCode(55 + cell.value)
      }
    }
  }
  return out
}

export function coordKey(coord: Coord): string {
  return `${coord.r},${coord.c}`
}

export type { Cell, Coord, Digit, Grid, GridShape, NamedRegion }
export type { Eliminations, CandidateRemoval, Placement }
