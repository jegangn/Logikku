import type { Difficulty } from '@/engine/grader/se'
import type { PuzzleBank, PuzzleRecord } from './types'

const BANKS = import.meta.glob<PuzzleBank>('./*/*.json', {
  eager: true,
  import: 'default',
})

export interface BankKey {
  readonly variant: string
  readonly difficulty: Difficulty
}

function parseKey(path: string): BankKey | null {
  const match = /^\.\/([^/]+)\/([^/.]+)\.json$/.exec(path)
  if (!match) return null
  const variant = match[1]!
  const difficulty = match[2]! as Difficulty
  return { variant, difficulty }
}

function bankMap(): ReadonlyMap<string, PuzzleBank> {
  const out = new Map<string, PuzzleBank>()
  for (const [path, mod] of Object.entries(BANKS)) {
    const key = parseKey(path)
    if (!key) continue
    out.set(`${key.variant}:${key.difficulty}`, validateBank(mod, key))
  }
  return out
}

const banks = bankMap()

function validateBank(records: unknown, key: BankKey): PuzzleBank {
  if (!Array.isArray(records)) {
    throw new Error(`bank ${key.variant}/${key.difficulty} is not an array`)
  }
  for (const r of records) {
    assertRecord(r, key)
  }
  return records as PuzzleBank
}

function assertRecord(r: unknown, key: BankKey): asserts r is PuzzleRecord {
  if (typeof r !== 'object' || r === null) throw new Error('record not an object')
  const obj = r as Record<string, unknown>
  for (const field of ['id', 'variant', 'givens', 'difficulty', 'generatedAt'] as const) {
    if (typeof obj[field] !== 'string') {
      throw new Error(`bank ${key.variant}/${key.difficulty}: '${field}' must be a string`)
    }
  }
  for (const field of ['size', 'se', 'hardestTier', 'steps'] as const) {
    if (typeof obj[field] !== 'number') {
      throw new Error(`bank ${key.variant}/${key.difficulty}: '${field}' must be a number`)
    }
  }
  if (obj['difficulty'] !== key.difficulty) {
    throw new Error(
      `bank ${key.variant}/${key.difficulty}: record difficulty=${String(obj['difficulty'])} mismatch`,
    )
  }
}

export function getBank(variant: string, difficulty: Difficulty): PuzzleBank {
  const bank = banks.get(`${variant}:${difficulty}`)
  if (!bank) {
    throw new Error(`no bank found for ${variant}/${difficulty}`)
  }
  return bank
}

export function hasBank(variant: string, difficulty: Difficulty): boolean {
  return banks.has(`${variant}:${difficulty}`)
}

export function listBanks(): ReadonlyArray<BankKey> {
  return [...banks.keys()].map((k) => {
    const [variant, difficulty] = k.split(':') as [string, Difficulty]
    return { variant, difficulty }
  })
}

export function pickPuzzle(
  variant: string,
  difficulty: Difficulty,
  seed: number,
): PuzzleRecord {
  const bank = getBank(variant, difficulty)
  if (bank.length === 0) {
    throw new Error(`empty bank for ${variant}/${difficulty}`)
  }
  const index = ((seed | 0) % bank.length + bank.length) % bank.length
  return bank[index]!
}

export type { PuzzleBank, PuzzleRecord } from './types'
