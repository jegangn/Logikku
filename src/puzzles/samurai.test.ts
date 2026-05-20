import { describe, it, expect } from 'vitest'
import type { PuzzleRecord } from './types'

describe('PuzzleRecord.samuraiGivens (type + validation surface)', () => {
  it('PuzzleRecord type accepts samuraiGivens at compile time', () => {
    const rec: PuzzleRecord = {
      id: 'x', variant: 'samurai', size: 9, givens: '', difficulty: 'easy',
      se: 1, hardestTier: 0, steps: 0, generatedAt: '2026-05-20T00:00:00Z',
      samuraiGivens: ['0'.repeat(81), '0'.repeat(81), '0'.repeat(81), '0'.repeat(81), '0'.repeat(81)],
    }
    expect(rec.samuraiGivens?.length).toBe(5)
  })

  // We can't easily test the validator in isolation because import.meta.glob
  // runs at module load. Task 5 lands the demo JSON; if it's malformed the
  // module import in Play.samurai.test.tsx fails loudly. This file just
  // documents the shape contract.
})
