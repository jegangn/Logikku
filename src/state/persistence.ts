import { serializeGameForSave, useGameStore, type GameState } from './gameStore'
import { useStatsStore } from './statsStore'
import { getGame, putGame } from '@/storage/db'

const DEBOUNCE_MS = 80

let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedPuzzleId: string | null = null
let lastSavedCompletedAt: string | null = null
let unsubscribe: (() => void) | null = null

function scheduleSave(state: GameState): void {
  if (!state.puzzleId || !state.grid) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    const saved = serializeGameForSave(useGameStore.getState())
    if (saved) {
      void putGame(saved).catch((err) => {
        console.error('failed to persist game', err)
      })
    }
  }, DEBOUNCE_MS)
}

export function wireGamePersistence(): () => void {
  if (unsubscribe) unsubscribe()
  unsubscribe = useGameStore.subscribe((state, prev) => {
    if (
      state.grid !== prev.grid ||
      state.history !== prev.history ||
      state.elapsedMs !== prev.elapsedMs ||
      state.completedAt !== prev.completedAt
    ) {
      scheduleSave(state)
    }
    if (
      state.completedAt &&
      state.completedAt !== lastSavedCompletedAt &&
      state.puzzleId !== lastSavedPuzzleId
    ) {
      lastSavedCompletedAt = state.completedAt
      lastSavedPuzzleId = state.puzzleId
      void useStatsStore
        .getState()
        .recordCompletion(state.variant, state.difficulty, state.elapsedMs)
    }
  })
  return () => {
    if (unsubscribe) unsubscribe()
    unsubscribe = null
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }
}

export async function flushSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  const saved = serializeGameForSave(useGameStore.getState())
  if (saved) await putGame(saved)
}

export async function tryHydrate(puzzleId: string): Promise<boolean> {
  const saved = await getGame(puzzleId)
  if (!saved) return false
  useGameStore.getState().hydrate(saved)
  return true
}
