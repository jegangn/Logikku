import { NotImplementedError } from '../types'
import type { Constraint, ConstraintKind, Eliminations, Grid } from '../types'

let counter = 0

export function createStubConstraint(kind: ConstraintKind): Constraint {
  const id = `${kind}:stub-${++counter}`
  return {
    id,
    kind,
    regions: [],
    propagate(_grid: Grid): Eliminations {
      throw new NotImplementedError(kind)
    },
    validate(_grid: Grid): boolean {
      throw new NotImplementedError(kind)
    },
  }
}
