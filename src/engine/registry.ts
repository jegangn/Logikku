import type { Constraint, ConstraintKind } from './types'
import { createClassicConstraint } from './constraints/classic'
import { createStubConstraint } from './constraints/_stub'

export const ALL_CONSTRAINT_KINDS: ReadonlyArray<ConstraintKind> = [
  'classic',
  'x-diagonal',
  'hyper',
  'anti-knight',
  'anti-king',
  'non-consecutive',
  'jigsaw',
  'even-odd',
  'kropki',
  'xv',
  'greater-than',
  'thermometer',
  'arrow',
  'killer',
  'little-killer',
  'sandwich',
  'skyscraper',
  'palindrome',
  'renban',
  'german-whispers',
]

type Factory = (params: Record<string, unknown>) => Constraint

const registry = new Map<ConstraintKind, Factory>()

function register(kind: ConstraintKind, factory: Factory): void {
  registry.set(kind, factory)
}

register('classic', (p) => createClassicConstraint(p as object))
for (const kind of ALL_CONSTRAINT_KINDS) {
  if (kind === 'classic') continue
  register(kind, () => createStubConstraint(kind))
}

export const ConstraintRegistry = {
  has(kind: ConstraintKind): boolean {
    return registry.has(kind)
  },
  create(kind: ConstraintKind, params: Record<string, unknown> = {}): Constraint {
    const factory = registry.get(kind)
    if (!factory) throw new Error(`unknown constraint kind: ${kind}`)
    return factory(params)
  },
  kinds(): ReadonlyArray<ConstraintKind> {
    return ALL_CONSTRAINT_KINDS
  },
}
