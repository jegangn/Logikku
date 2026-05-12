import { CLASSIC_9 } from '../grid'
import type { Constraint, GridShape } from '../types'
import { createPairInequalityConstraint } from './_base/pairInequality'

let counter = 0

// All 8 king moves. The orthogonal four are redundant with classic row/col
// peers but kept here to make the constraint rule self-evident from the
// offset list. Duplicate eliminations are idempotent.
export const KING_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

export interface AntiKingParams {
  readonly shape?: GridShape
  readonly id?: string
}

export function createAntiKingConstraint(params: AntiKingParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `anti-king:${++counter}`
  return createPairInequalityConstraint({
    kind: 'anti-king',
    id,
    shape,
    offsets: KING_OFFSETS,
    forbids: (a, b) => a === b,
  })
}
