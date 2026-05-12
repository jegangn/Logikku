import { CLASSIC_9 } from '../grid'
import type { Constraint, GridShape } from '../types'
import { createPairInequalityConstraint } from './_base/pairInequality'

let counter = 0

export const ORTHOGONAL_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export interface NonConsecutiveParams {
  readonly shape?: GridShape
  readonly id?: string
}

export function createNonConsecutiveConstraint(
  params: NonConsecutiveParams = {},
): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `non-consecutive:${++counter}`
  return createPairInequalityConstraint({
    kind: 'non-consecutive',
    id,
    shape,
    offsets: ORTHOGONAL_OFFSETS,
    forbids: (a, b) => Math.abs(a - b) === 1,
  })
}
