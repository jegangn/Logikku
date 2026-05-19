import type { Constraint, ConstraintKind } from './types'
import { createClassicConstraint } from './constraints/classic'
import { createXDiagonalConstraint } from './constraints/x-diagonal'
import { createHyperConstraint } from './constraints/hyper'
import { createAntiKnightConstraint } from './constraints/anti-knight'
import { createAntiKingConstraint } from './constraints/anti-king'
import { createNonConsecutiveConstraint } from './constraints/non-consecutive'
import { createJigsawConstraint } from './constraints/jigsaw'
import { createEvenOddConstraint } from './constraints/even-odd'
import { createKropkiConstraint } from './constraints/kropki'
import { createXVConstraint } from './constraints/xv'
import { createGreaterThanConstraint } from './constraints/greater-than'
import { createThermometerConstraint } from './constraints/thermometer'
import { createArrowConstraint } from './constraints/arrow'
import { createKillerConstraint } from './constraints/killer'
import { createLittleKillerConstraint } from './constraints/little-killer'
import { createSandwichConstraint } from './constraints/sandwich'
import { createSkyscraperConstraint } from './constraints/skyscraper'
import { createPalindromeConstraint } from './constraints/palindrome'
import { createRenbanConstraint } from './constraints/renban'
import { createGermanWhispersConstraint } from './constraints/german-whispers'
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
register('x-diagonal', (p) => createXDiagonalConstraint(p as object))
register('hyper', (p) => createHyperConstraint(p as object))
register('anti-knight', (p) => createAntiKnightConstraint(p as object))
register('anti-king', (p) => createAntiKingConstraint(p as object))
register('non-consecutive', (p) => createNonConsecutiveConstraint(p as object))
register('jigsaw', (p) => createJigsawConstraint(p as object))
register('even-odd', (p) => createEvenOddConstraint(p as object))
register('kropki', (p) => createKropkiConstraint(p as object))
register('xv', (p) => createXVConstraint(p as object))
register('greater-than', (p) => createGreaterThanConstraint(p as object))
register('thermometer', (p) => createThermometerConstraint(p as object))
register('arrow', (p) => createArrowConstraint(p as object))
register('killer', (p) => createKillerConstraint(p as object))
register('little-killer', (p) => createLittleKillerConstraint(p as object))
register('sandwich', (p) => createSandwichConstraint(p as object))
register('skyscraper', (p) => createSkyscraperConstraint(p as object))
register('palindrome', (p) => createPalindromeConstraint(p as object))
register('renban', (p) => createRenbanConstraint(p as object))
register('german-whispers', (p) => createGermanWhispersConstraint(p as object))
for (const kind of ALL_CONSTRAINT_KINDS) {
  if (registry.has(kind)) continue
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
