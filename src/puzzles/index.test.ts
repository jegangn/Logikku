import { describe, it, expect } from 'vitest'
import { listBanks, getBank, hasBank, pickPuzzle } from './index'
import { createClassicConstraint } from '@/engine/constraints/classic'
import { CLASSIC_9, parsePuzzle } from '@/engine/grid'
import { gradePuzzle } from '@/engine/grader/se'

const DIFFICULTIES = ['very-easy', 'easy', 'medium', 'hard', 'tough', 'expert', 'diabolical'] as const

describe('puzzles index', () => {
  it('discovers at least one variant via import.meta.glob', () => {
    expect(listBanks().length).toBeGreaterThan(0)
  })

  it('exposes the Classic variant with easy/medium/hard/tough/expert bands populated', () => {
    const present = listBanks().filter((b) => b.variant === 'classic').map((b) => b.difficulty)
    const required = ['easy', 'medium', 'hard', 'tough', 'expert'] as const
    for (const d of required) {
      expect(present).toContain(d)
    }
  })

  it.each(DIFFICULTIES)('classic/%s bank has ≥100 unique puzzles when present', (difficulty) => {
    if (!hasBank('classic', difficulty)) return
    const bank = getBank('classic', difficulty)
    expect(bank.length).toBeGreaterThanOrEqual(100)
    const ids = new Set(bank.map((p) => p.id))
    expect(ids.size).toBe(bank.length)
    const givens = new Set(bank.map((p) => p.givens))
    expect(givens.size).toBe(bank.length)
  })

  it.each(DIFFICULTIES)('classic/%s records have valid shape', (difficulty) => {
    if (!hasBank('classic', difficulty)) return
    const bank = getBank('classic', difficulty)
    for (const p of bank.slice(0, 5)) {
      expect(p.size).toBe(9)
      expect(p.variant).toBe('classic')
      expect(p.givens).toHaveLength(81)
      expect(p.difficulty).toBe(difficulty)
      expect(p.hardestTier).toBeGreaterThanOrEqual(1)
      expect(p.steps).toBeGreaterThanOrEqual(0)
    }
  })

  it('sampled puzzles re-grade to their declared difficulty band', () => {
    if (!hasBank('classic', 'easy')) return
    const bank = getBank('classic', 'easy')
    const sample = bank.slice(0, 3)
    for (const record of sample) {
      const constraint = createClassicConstraint({ shape: CLASSIC_9 })
      const grid = { ...parsePuzzle(record.givens, CLASSIC_9), constraints: [constraint] }
      const result = gradePuzzle(grid)
      expect(result.difficulty).toBe(record.difficulty)
    }
  })

  it('pickPuzzle deterministically selects by seed', () => {
    if (!hasBank('classic', 'easy')) return
    const a = pickPuzzle('classic', 'easy', 7)
    const b = pickPuzzle('classic', 'easy', 7)
    expect(a).toBe(b)
  })
})
