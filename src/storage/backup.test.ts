import { beforeEach, describe, expect, it } from 'vitest'
import {
  _resetDbForTests,
  getSettings,
  getStats,
  listGames,
  putGame,
  putSettings,
  putStats,
  type SavedGame,
} from './db'
import {
  backupToBlob,
  buildBackup,
  clearAllData,
  defaultBackupFilename,
  parseBackup,
  restoreBackup,
} from './backup'

function game(id: string): SavedGame {
  const now = new Date().toISOString()
  return {
    id,
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
  }
}

beforeEach(async () => {
  await _resetDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('logikku')
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
})

describe('storage/backup', () => {
  it('builds a backup with current games, settings, stats', async () => {
    await putGame(game('a'))
    await putSettings({ key: 'v1', theme: 'light' })
    await putStats({
      key: 'v1',
      byBand: { 'classic:easy': { completed: 2, bestTimeMs: 1000, totalTimeMs: 3000 } },
    })
    const backup = await buildBackup()
    expect(backup.version).toBe(1)
    expect(backup.games).toHaveLength(1)
    expect(backup.settings?.theme).toBe('light')
    expect(backup.stats?.byBand['classic:easy']?.completed).toBe(2)
  })

  it('serializes to a Blob and is JSON-parseable', async () => {
    await putGame(game('a'))
    const backup = await buildBackup()
    const blob = backupToBlob(backup)
    expect(blob.type).toBe('application/json')
    const text = await blob.text()
    const parsed = parseBackup(text)
    expect(parsed.games).toHaveLength(1)
  })

  it('parseBackup rejects malformed JSON', () => {
    expect(() => parseBackup('not json')).toThrow()
  })

  it('parseBackup rejects wrong version', () => {
    expect(() => parseBackup(JSON.stringify({ version: 99, games: [] }))).toThrow()
  })

  it('parseBackup rejects games without id', () => {
    expect(() =>
      parseBackup(JSON.stringify({ version: 1, games: [{ noId: 'bad' }] })),
    ).toThrow()
  })

  it('restoreBackup replaces all data', async () => {
    await putGame(game('old'))
    await putSettings({ key: 'v1', theme: 'light' })
    const backup = await buildBackup()

    await putGame(game('new'))
    await restoreBackup(backup)

    const games = await listGames()
    expect(games.map((g) => g.id).sort()).toEqual(['old'])
    const settings = await getSettings()
    expect(settings?.theme).toBe('light')
  })

  it('clearAllData wipes games, settings, stats', async () => {
    await putGame(game('a'))
    await putSettings({ key: 'v1', theme: 'light' })
    await putStats({ key: 'v1', byBand: { 'classic:easy': { completed: 1, bestTimeMs: 100, totalTimeMs: 100 } } })
    await clearAllData()
    expect(await listGames()).toHaveLength(0)
    const s = await getStats()
    expect(s.byBand).toEqual({})
  })

  it('defaultBackupFilename produces YYYY-MM-DD format', () => {
    const name = defaultBackupFilename(new Date('2026-05-12T10:00:00Z'))
    expect(name).toMatch(/^logikku-backup-2026-05-\d\d\.json$/)
  })
})
