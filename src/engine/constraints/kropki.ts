import { CLASSIC_9 } from '../grid'
import type { Constraint, Digit, GridShape } from '../types'
import { createEdgeConstraint, type Edge } from './_base/edgeConstraint'

let counter = 0

export type KropkiKind = 'white-dot' | 'black-dot'

export interface KropkiEdge {
  readonly from: { readonly r: number; readonly c: number }
  readonly to: { readonly r: number; readonly c: number }
  readonly kind: KropkiKind
}

export interface KropkiParams {
  readonly shape?: GridShape
  readonly id?: string
  readonly edges?: ReadonlyArray<KropkiEdge>
  /** Strict Kropki: absence of a dot forbids both consecutive and 1:2. */
  readonly strict?: boolean
}

function isConsecutive(a: Digit, b: Digit): boolean {
  return Math.abs(a - b) === 1
}

function isRatio2(a: Digit, b: Digit): boolean {
  return a === b * 2 || b === a * 2
}

export function createKropkiConstraint(params: KropkiParams = {}): Constraint {
  const shape = params.shape ?? CLASSIC_9
  const id = params.id ?? `kropki:${++counter}`
  const edges: Edge[] = (params.edges ?? []).map((e) => ({
    from: { r: e.from.r, c: e.from.c },
    to: { r: e.to.r, c: e.to.c },
    kind: e.kind,
  }))
  const strict = params.strict ?? true

  return createEdgeConstraint({
    kind: 'kropki',
    id,
    shape,
    edges,
    predicate: (edge) => {
      if (edge.kind === 'white-dot') return isConsecutive
      return isRatio2
    },
    ...(strict
      ? {
          strictAbsence: (a: Digit, b: Digit) =>
            isConsecutive(a, b) || isRatio2(a, b),
        }
      : {}),
  })
}
