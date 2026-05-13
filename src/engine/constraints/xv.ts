import { CLASSIC_9 } from '../grid'
import type { Constraint, Digit, GridShape } from '../types'
import { createEdgeConstraint, type Edge } from './_base/edgeConstraint'

let counter = 0

export type XVKind = 'x' | 'v'

export interface XVEdge {
  readonly from: { readonly r: number; readonly c: number }
  readonly to: { readonly r: number; readonly c: number }
  readonly kind: XVKind
}

export interface XVParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly edges?: ReadonlyArray<XVEdge>
  /** Strict XV: absence of mark forbids both sum-5 and sum-10. */
  readonly strict?: boolean
}

function sumsTo(a: Digit, b: Digit, total: number): boolean {
  return a + b === total
}

export function createXVConstraint(params: XVParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `xv:${++counter}`
  const edges: Edge[] = (params.edges ?? []).map((e) => ({
    from: { r: e.from.r, c: e.from.c },
    to: { r: e.to.r, c: e.to.c },
    kind: e.kind,
  }))
  const strict = params.strict ?? true

  return createEdgeConstraint({
    kind: 'xv',
    id,
    shape,
    edges,
    predicate: (edge) => {
      const total = edge.kind === 'x' ? 10 : 5
      return (a, b) => sumsTo(a, b, total)
    },
    ...(strict
      ? {
          strictAbsence: (a: Digit, b: Digit) =>
            sumsTo(a, b, 5) || sumsTo(a, b, 10),
        }
      : {}),
  })
}
