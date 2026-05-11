import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Difficulty } from '@/engine'

const DB_NAME = 'logikku'
const DB_VERSION = 1

export interface SavedCell {
  readonly v: number | null
  readonly c: ReadonlyArray<number>
  readonly g: boolean
}

export interface SavedHistoryEntry {
  readonly k: 'v' | 'p' | 'e'
  readonly r: number
  readonly c: number
  readonly tb: SavedCell
  readonly ta: SavedCell
  readonly pr?: ReadonlyArray<{ r: number; c: number; d: number }>
}

export interface SavedGame {
  readonly id: string
  readonly variant: string
  readonly difficulty: Difficulty
  readonly givens: string
  readonly cells: ReadonlyArray<SavedCell>
  readonly history: ReadonlyArray<SavedHistoryEntry>
  readonly historyIndex: number
  readonly elapsedMs: number
  readonly startedAt: string
  readonly lastPlayedAt: string
  readonly completedAt: string | null
}

export interface SavedSettings {
  readonly key: 'v1'
  readonly theme?: 'light' | 'dark' | 'system'
  readonly highlightConflicts?: boolean
  readonly highlightPeers?: boolean
  readonly pencilAutoClean?: boolean
}

export interface BandKey {
  readonly variant: string
  readonly difficulty: Difficulty
}

export interface SavedStats {
  readonly key: 'v1'
  readonly byBand: Readonly<Record<string, {
    completed: number
    bestTimeMs: number | null
    totalTimeMs: number
  }>>
}

interface Schema extends DBSchema {
  games: {
    key: string
    value: SavedGame
    indexes: { byLastPlayed: string }
  }
  settings: {
    key: string
    value: SavedSettings
  }
  stats: {
    key: string
    value: SavedStats
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const games = database.createObjectStore('games', { keyPath: 'id' })
          games.createIndex('byLastPlayed', 'lastPlayedAt')
          database.createObjectStore('settings', { keyPath: 'key' })
          database.createObjectStore('stats', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export async function putGame(game: SavedGame): Promise<void> {
  const d = await db()
  await d.put('games', game)
}

export async function getGame(id: string): Promise<SavedGame | undefined> {
  const d = await db()
  return d.get('games', id)
}

export async function deleteGame(id: string): Promise<void> {
  const d = await db()
  await d.delete('games', id)
}

export async function listGames(): Promise<ReadonlyArray<SavedGame>> {
  const d = await db()
  return d.getAll('games')
}

export async function mostRecentUnfinished(): Promise<SavedGame | null> {
  const all = await listGames()
  const unfinished = all.filter((g) => g.completedAt === null)
  if (unfinished.length === 0) return null
  unfinished.sort((a, b) => (a.lastPlayedAt < b.lastPlayedAt ? 1 : -1))
  return unfinished[0]!
}

export async function getSettings(): Promise<SavedSettings | undefined> {
  const d = await db()
  return d.get('settings', 'v1')
}

export async function putSettings(settings: SavedSettings): Promise<void> {
  const d = await db()
  await d.put('settings', settings)
}

export async function getStats(): Promise<SavedStats> {
  const d = await db()
  const existing = await d.get('stats', 'v1')
  return existing ?? { key: 'v1', byBand: {} }
}

export async function putStats(stats: SavedStats): Promise<void> {
  const d = await db()
  await d.put('stats', stats)
}

export async function _resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const existing = await dbPromise
    existing.close()
  }
  dbPromise = null
}
