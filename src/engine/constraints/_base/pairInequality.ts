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

export type PairForbidPredicate = (a: Digit, b: Digit) => boolean

export interface PairInequalityParams {
  readonly kind: ConstraintKind
  readonly id: string
  readonly shape: GridShape
  readonly offsets: ReadonlyArray<readonly [number, number]>
  readonly forbids: PairForbidPredicate
}

export function createPairInequalityConstraint(params: PairInequalityParams): Constraint {
  const { kind, id, shape, offsets, forbids } = params
  const size = shape.size

  function* iteratePairs(grid: Grid): Generator<{
    readonly a: Coord
    readonly b: Coord
    readonly aValue: Digit
    readonly bValue: Digit | null
  }> {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = cellAt(grid, { r, c })
        if (cell.value === null) continue
        for (const [dr, dc] of offsets) {
          const nr = r + dr
          const nc = c + dc
          if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
          const peer = cellAt(grid, { r: nr, c: nc })
          yield {
            a: { r, c },
            b: { r: nr, c: nc },
            aValue: cell.value,
            bValue: peer.value,
          }
        }
      }
    }
  }

  return {
    id,
    kind,
    regions: [],
    validate(grid: Grid): boolean {
      for (const { aValue, bValue } of iteratePairs(grid)) {
        if (bValue === null) continue
        if (forbids(aValue, bValue)) return false
      }
      return true
    },
    propagate(grid: Grid): Eliminations {
      const removals: CandidateRemoval[] = []
      const removedKeys = new Set<string>()
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = cellAt(grid, { r, c })
          if (cell.value === null) continue
          const v = cell.value
          for (const [dr, dc] of offsets) {
            const nr = r + dr
            const nc = c + dc
            if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
            const peer = cellAt(grid, { r: nr, c: nc })
            if (peer.value !== null) continue
            for (const d of peer.candidates) {
              if (!forbids(v, d)) continue
              const key = `${nr},${nc}:${d}`
              if (removedKeys.has(key)) continue
              removedKeys.add(key)
              removals.push({ coord: { r: nr, c: nc }, digit: d })
            }
          }
        }
      }
      return { removals, placements: [] }
    },
    findConflicts(grid: Grid): ReadonlyArray<Coord> {
      const conflicts: Coord[] = []
      const seen = new Set<string>()
      for (const { a, b, aValue, bValue } of iteratePairs(grid)) {
        if (bValue === null) continue
        if (!forbids(aValue, bValue)) continue
        for (const co of [a, b]) {
          const key = `${co.r},${co.c}`
          if (seen.has(key)) continue
          seen.add(key)
          conflicts.push(co)
        }
      }
      return conflicts
    },
  }
}
