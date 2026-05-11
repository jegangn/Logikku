import {
  _resetDbForTests,
  getSettings,
  getStats,
  listGames,
  putGame,
  putSettings,
  putStats,
  deleteGame,
  type SavedGame,
  type SavedSettings,
  type SavedStats,
} from './db'

const BACKUP_VERSION = 1

export interface BackupFile {
  readonly version: 1
  readonly exportedAt: string
  readonly games: ReadonlyArray<SavedGame>
  readonly settings: SavedSettings | null
  readonly stats: SavedStats | null
}

export async function buildBackup(): Promise<BackupFile> {
  const [games, settings, stats] = await Promise.all([
    listGames(),
    getSettings().then((s) => s ?? null),
    getStats().then((s) => (s.byBand && Object.keys(s.byBand).length === 0 ? null : s)),
  ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    games,
    settings,
    stats,
  }
}

export function backupToBlob(backup: BackupFile): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
}

export function defaultBackupFilename(now: Date = new Date()): string {
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `logikku-backup-${yyyy}-${mm}-${dd}.json`
}

export function parseBackup(json: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('not valid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('backup is not an object')
  const obj = parsed as Record<string, unknown>
  if (obj['version'] !== BACKUP_VERSION) throw new Error(`unsupported backup version ${String(obj['version'])}`)
  if (!Array.isArray(obj['games'])) throw new Error('backup missing games array')
  for (const g of obj['games']) {
    if (typeof g !== 'object' || g === null) throw new Error('game is not an object')
    const gg = g as Record<string, unknown>
    if (typeof gg['id'] !== 'string' || typeof gg['givens'] !== 'string') {
      throw new Error('game missing required string fields')
    }
  }
  return parsed as BackupFile
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  await clearAllData()
  for (const game of backup.games) await putGame(game)
  if (backup.settings) await putSettings(backup.settings)
  if (backup.stats) await putStats(backup.stats)
}

export async function clearAllData(): Promise<void> {
  const games = await listGames()
  await Promise.all(games.map((g) => deleteGame(g.id)))
  await putSettings({ key: 'v1' })
  await putStats({ key: 'v1', byBand: {} })
}

export const _internal = { _resetDbForTests }
