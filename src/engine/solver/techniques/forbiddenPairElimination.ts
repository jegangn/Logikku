import type { ConstraintKind } from '../../types'
import type { Technique } from './_technique'

const PAIR_INEQUALITY_KINDS: ReadonlySet<ConstraintKind> = new Set<ConstraintKind>([
  'anti-knight',
  'anti-king',
  'non-consecutive',
])

export const forbiddenPairElimination: Technique = {
  id: 'forbidden-pair-elimination',
  tier: 1,
  name: 'Forbidden Pair Elimination',
  apply(grid) {
    for (const constraint of grid.constraints) {
      if (!PAIR_INEQUALITY_KINDS.has(constraint.kind)) continue
      const e = constraint.propagate(grid)
      if (e.removals.length === 0) continue
      return {
        technique: 'forbidden-pair-elimination',
        tier: 1,
        eliminations: { removals: e.removals, placements: [] },
        explanation: `${constraint.kind}: eliminated ${e.removals.length} candidate(s)`,
      }
    }
    return null
  },
}
