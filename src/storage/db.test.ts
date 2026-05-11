import { beforeEach, describe, expect, it } from 'vitest'
import {
  _resetDbForTests,
  getGame,
  getSettings,
  getStats,
  listGames,
  mostRecentUnfinished,
  putGame,
  putSettings,
  putStats,
  type SavedGame,
} from './db'

function game(overrides: Partial<SavedGame> = {}): SavedGame {
  const now = new Date().toISOString()
  return {
    id: 'classic-easy-1',
    variant: 'classic',
    difficulty: 'easy',
    givens: '0'.repeat(81),
    cells: Array.from({ length: 81 }, () => ({ v: null, c: [], g: false })),
    history: [],
    historyIndex: -1,
    elapsedMs: 0,
    startedAt: now,
    lastPlayedAt: now,
    completedAt: null,
    ...overrides,
  }
}

beforeEach(async () => {
  await _resetDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('logikku')
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe('storage/db', () => {
  it('round-trips a game through put/get', async () => {
    const g = game({ id: 'a' })
    await putGame(g)
    const got = await getGame('a')
    expect(got).toEqual(g)
  })

  it('lists all games', async () => {
    await putGame(game({ id: 'a' }))
    await putGame(game({ id: 'b' }))
    const list = await listGames()
    expect(list).toHaveLength(2)
  })

  it('mostRecentUnfinished returns the latest lastPlayedAt with completedAt=null', async () => {
    await putGame(game({ id: 'old', lastPlayedAt: '2026-01-01T00:00:00Z' }))
    await putGame(game({ id: 'new', lastPlayedAt: '2026-05-12T00:00:00Z' }))
    await putGame(
      game({
        id: 'done',
        lastPlayedAt: '2026-06-01T00:00:00Z',
        completedAt: '2026-06-01T01:00:00Z',
      }),
    )
    const most = await mostRecentUnfinished()
    expect(most?.id).toBe('new')
  })

  it('returns null when no unfinished games exist', async () => {
    expect(await mostRecentUnfinished()).toBeNull()
  })

  it('settings round-trip', async () => {
    await putSettings({ key: 'v1', theme: 'dark' })
    const s = await getSettings()
    expect(s?.theme).toBe('dark')
  })

  it('stats default to empty when not yet stored', async () => {
    const s = await getStats()
    expect(s.byBand).toEqual({})
  })

  it('stats round-trip', async () => {
    await putStats({
      key: 'v1',
      byBand: { 'classic:easy': { completed: 3, bestTimeMs: 12345, totalTimeMs: 50000 } },
    })
    const s = await getStats()
    expect(s.byBand['classic:easy']?.completed).toBe(3)
  })
})
