import type { Difficulty } from '@/engine/grader/se'

export interface PuzzleRecord {
  readonly id: string
  readonly variant: string
  readonly size: number
  readonly givens: string
  readonly difficulty: Difficulty
  readonly se: number
  readonly hardestTier: number
  readonly steps: number
  readonly generatedAt: string
}

export type PuzzleBank = ReadonlyArray<PuzzleRecord>
