import { CLASSIC_9 } from '../grid'
import type { Constraint, GridShape } from '../types'
import { createEdgeConstraint, type Edge } from './_base/edgeConstraint'

let counter = 0

/**
 * Directed inequality between two orthogonally-adjacent cells.
 * `gt`: from > to. `lt`: from < to.
 * The edge's `from` -> `to` direction is the directed arrow.
 */
export type GreaterThanKind = 'gt' | 'lt'

export interface GreaterThanEdge {
  readonly from: { readonly r: number; readonly c: number }
  readonly to: { readonly r: number; readonly c: number }
  readonly kind: GreaterThanKind
}

export interface GreaterThanParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly edges?: ReadonlyArray<GreaterThanEdge>
}

export function createGreaterThanConstraint(
  params: GreaterThanParams = {},
): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `greater-than:${++counter}`
  const edges: Edge[] = (params.edges ?? []).map((e) => ({
    from: { r: e.from.r, c: e.from.c },
    to: { r: e.to.r, c: e.to.c },
    kind: e.kind,
  }))

  return createEdgeConstraint({
    kind: 'greater-than',
    id,
    shape,
    edges,
    predicate: (edge) =>
      edge.kind === 'gt' ? (a, b) => a > b : (a, b) => a < b,
  })
}
