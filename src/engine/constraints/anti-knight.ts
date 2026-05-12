import { CLASSIC_9 } from '../grid'
import type { Constraint, GridShape } from '../types'
import { createPairInequalityConstraint } from './_base/pairInequality'

let counter = 0

export const KNIGHT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
]

export interface AntiKnightParams {
  readonly shape?: GridShape
  readonly id?: string
}

export function createAntiKnightConstraint(params: AntiKnightParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `anti-knight:${++counter}`
  return createPairInequalityConstraint({
    kind: 'anti-knight',
    id,
    shape,
    offsets: KNIGHT_OFFSETS,
    forbids: (a, b) => a === b,
  })
}
