import { cellAt } from '../../grid'
import type {
  CandidateRemoval,
  Constraint,
  ConstraintKind,
  Coord,
  Digit,
  Eliminations,
  Grid,
  GridShape,
} from '../../types'

/** A directed edge between two orthogonally adjacent cells. */
export interface Edge {
  readonly from: Coord
  readonly to: Coord
  readonly kind: string
}

/** Predicate: given the digits at `from` and `to`, is this assignment legal? */
export type EdgePredicate = (a: Digit, b: Digit) => boolean

export interface EdgeConstraintParams {
  readonly kind: ConstraintKind
  readonly id: string
  readonly shape: GridShape
  readonly edges: ReadonlyArray<Edge>
  /**
   * Per-edge predicate. The constraint passes the digit at `edge.from` and
   * `edge.to` (in that order) and the predicate returns true iff the pair
   * is legal under that edge's kind. Subclasses build this from `edge.kind`.
   */
  readonly predicate: (edge: Edge) => EdgePredicate
  /**
   * Strict semantics: if true, every orthogonally-adjacent unmarked pair
   * additionally forbids any pair that would have satisfied SOME edge kind
   * (Kropki: not consecutive AND not 1:2 ratio; XV: sums ≠ 5 AND ≠ 10).
   */
  readonly strictAbsence?: (a: Digit, b: Digit) => boolean
}

interface PreparedEdge {
  readonly from: Coord
  readonly to: Coord
  readonly predicate: EdgePredicate
  readonly kind: string
}

function adjacent(a: Coord, b: Coord): boolean {
  const dr = Math.abs(a.r - b.r)
  const dc = Math.abs(a.c - b.c)
  return dr + dc === 1
}

function coordKey(co: Coord): string {
  return `${co.r},${co.c}`
}

function edgeKey(a: Coord, b: Coord): string {
  const aKey = coordKey(a)
  const bKey = coordKey(b)
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`
}

export function createEdgeConstraint(params: EdgeConstraintParams): Constraint {
  const { kind, id, shape, edges, predicate, strictAbsence } = params
  const size = shape.size
  for (const edge of edges) {
    if (!adjacent(edge.from, edge.to)) {
      throw new Error(
        `edge endpoints not orthogonally adjacent: (${edge.from.r},${edge.from.c}) - (${edge.to.r},${edge.to.c})`,
      )
    }
  }
  const prepared: PreparedEdge[] = edges.map((e) => ({
    from: e.from,
    to: e.to,
    predicate: predicate(e),
    kind: e.kind,
  }))
  const markedKeys = new Set<string>(edges.map((e) => edgeKey(e.from, e.to)))

  function* iterateAbsenceEdges(): Generator<{ readonly a: Coord; readonly b: Coord }> {
    if (!strictAbsence) return
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const [dr, dc] of [
          [0, 1],
          [1, 0],
        ] as ReadonlyArray<readonly [number, number]>) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= size || nc >= size) continue
          const a = { r, c }
          const b = { r: nr, c: nc }
          if (markedKeys.has(edgeKey(a, b))) continue
          yield { a, b }
        }
      }
    }
  }

  return {
    id,
    kind,
    regions: [],
    validate(grid: Grid): boolean {
      for (const edge of prepared) {
        const av = cellAt(grid, edge.from).value
        const bv = cellAt(grid, edge.to).value
        if (av === null || bv === null) continue
        if (!edge.predicate(av, bv)) return false
      }
      if (strictAbsence) {
        for (const { a, b } of iterateAbsenceEdges()) {
          const av = cellAt(grid, a).value
          const bv = cellAt(grid, b).value
          if (av === null || bv === null) continue
          if (strictAbsence(av, bv)) return false
        }
      }
      return true
    },
    propagate(grid: Grid): Eliminations {
      const removals: CandidateRemoval[] = []
      const removedKeys = new Set<string>()

      function remove(coord: Coord, digit: Digit): void {
        const key = `${coord.r},${coord.c}:${digit}`
        if (removedKeys.has(key)) return
        const cell = cellAt(grid, coord)
        if (!cell.candidates.has(digit)) return
        removedKeys.add(key)
        removals.push({ coord, digit })
      }

      for (const edge of prepared) {
        const aCell = cellAt(grid, edge.from)
        const bCell = cellAt(grid, edge.to)
        if (aCell.value !== null) {
          for (const d of bCell.candidates) {
            if (!edge.predicate(aCell.value, d)) remove(edge.to, d)
          }
        } else if (bCell.value !== null) {
          for (const d of aCell.candidates) {
            if (!edge.predicate(d, bCell.value)) remove(edge.from, d)
          }
        } else {
          for (const d of aCell.candidates) {
            let any = false
            for (const e of bCell.candidates) {
              if (edge.predicate(d, e)) {
                any = true
                break
              }
            }
            if (!any) remove(edge.from, d)
          }
          for (const d of bCell.candidates) {
            let any = false
            for (const e of aCell.candidates) {
              if (edge.predicate(e, d)) {
                any = true
                break
              }
            }
            if (!any) remove(edge.to, d)
          }
        }
      }
      if (strictAbsence) {
        for (const { a, b } of iterateAbsenceEdges()) {
          const aCell = cellAt(grid, a)
          const bCell = cellAt(grid, b)
          if (aCell.value !== null) {
            for (const d of bCell.candidates) {
              if (strictAbsence(aCell.value, d)) remove(b, d)
            }
          } else if (bCell.value !== null) {
            for (const d of aCell.candidates) {
              if (strictAbsence(d, bCell.value)) remove(a, d)
            }
          }
        }
      }
      return { removals, placements: [] }
    },
    findConflicts(grid: Grid): ReadonlyArray<Coord> {
      const conflicts: Coord[] = []
      const seen = new Set<string>()
      function flag(co: Coord): void {
        const key = `${co.r},${co.c}`
        if (seen.has(key)) return
        seen.add(key)
        conflicts.push(co)
      }
      for (const edge of prepared) {
        const av = cellAt(grid, edge.from).value
        const bv = cellAt(grid, edge.to).value
        if (av === null || bv === null) continue
        if (!edge.predicate(av, bv)) {
          flag(edge.from)
          flag(edge.to)
        }
      }
      if (strictAbsence) {
        for (const { a, b } of iterateAbsenceEdges()) {
          const av = cellAt(grid, a).value
          const bv = cellAt(grid, b).value
          if (av === null || bv === null) continue
          if (strictAbsence(av, bv)) {
            flag(a)
            flag(b)
          }
        }
      }
      return conflicts
    },
  }
}
