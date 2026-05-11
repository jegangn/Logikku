import { create } from 'zustand'
import type { Difficulty } from '@/engine'
import { getStats, putStats, type SavedStats } from '@/storage/db'

export interface BandStat {
  readonly completed: number
  readonly bestTimeMs: number | null
  readonly totalTimeMs: number
}

export interface StatsState {
  readonly byBand: Readonly<Record<string, BandStat>>
  readonly loaded: boolean
  loadFromDb: () => Promise<void>
  recordCompletion: (variant: string, difficulty: Difficulty, elapsedMs: number) => Promise<void>
  getBand: (variant: string, difficulty: Difficulty) => BandStat
}

function key(variant: string, difficulty: Difficulty): string {
  return `${variant}:${difficulty}`
}

const EMPTY: BandStat = { completed: 0, bestTimeMs: null, totalTimeMs: 0 }

export const useStatsStore = create<StatsState>((set, get) => ({
  byBand: {},
  loaded: false,

  loadFromDb: async () => {
    const saved = await getStats()
    set({ byBand: saved.byBand, loaded: true })
  },

  recordCompletion: async (variant, difficulty, elapsedMs) => {
    const k = key(variant, difficulty)
    const prev = get().byBand[k] ?? EMPTY
    const next: BandStat = {
      completed: prev.completed + 1,
      bestTimeMs: prev.bestTimeMs === null ? elapsedMs : Math.min(prev.bestTimeMs, elapsedMs),
      totalTimeMs: prev.totalTimeMs + elapsedMs,
    }
    const byBand = { ...get().byBand, [k]: next }
    set({ byBand })
    const stats: SavedStats = { key: 'v1', byBand }
    await putStats(stats)
  },

  getBand: (variant, difficulty) => {
    return get().byBand[key(variant, difficulty)] ?? EMPTY
  },
}))
