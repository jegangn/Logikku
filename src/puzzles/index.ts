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
  if (obj['regions'] !== undefined) {
    if (!Array.isArray(obj['regions'])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: 'regions' must be an array`)
    }
    for (const region of obj['regions'] as unknown[]) {
      if (!Array.isArray(region) || region.some((v) => typeof v !== 'number')) {
        throw new Error(
          `bank ${key.variant}/${key.difficulty}: each region must be a number[]`,
        )
      }
    }
  }
  if (obj['parityMask'] !== undefined && typeof obj['parityMask'] !== 'string') {
    throw new Error(
      `bank ${key.variant}/${key.difficulty}: 'parityMask' must be a string`,
    )
  }
  for (const field of ['littleKillerClues', 'sandwichClues', 'skyscraperClues'] as const) {
    if (obj[field] === undefined) continue
    if (!Array.isArray(obj[field])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: '${field}' must be an array`)
    }
    for (const item of obj[field] as unknown[]) {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: each ${field} entry must be an object`)
      }
      const e = item as Record<string, unknown>
      if (typeof e['id'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: ${field} id must be a string`)
      }
      if (typeof e['side'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: ${field} side must be a string`)
      }
      if (typeof e['index'] !== 'number') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: ${field} index must be a number`)
      }
    }
  }
  if (obj['cages'] !== undefined) {
    if (!Array.isArray(obj['cages'])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: 'cages' must be an array`)
    }
    for (const cage of obj['cages'] as unknown[]) {
      if (typeof cage !== 'object' || cage === null) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: each cage must be an object`)
      }
      const ca = cage as Record<string, unknown>
      if (typeof ca['id'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: cage id must be a string`)
      }
      if (typeof ca['sum'] !== 'number') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: cage sum must be a number`)
      }
      if (!Array.isArray(ca['cells'])) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: cage cells must be an array`)
      }
      for (const pt of ca['cells'] as unknown[]) {
        if (typeof pt !== 'object' || pt === null) {
          throw new Error(`bank ${key.variant}/${key.difficulty}: cage cell must be {r,c}`)
        }
        const p = pt as Record<string, unknown>
        if (typeof p['r'] !== 'number' || typeof p['c'] !== 'number') {
          throw new Error(`bank ${key.variant}/${key.difficulty}: cage cell must have numeric r,c`)
        }
      }
    }
  }
  if (obj['arrows'] !== undefined) {
    if (!Array.isArray(obj['arrows'])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: 'arrows' must be an array`)
    }
    for (const arrow of obj['arrows'] as unknown[]) {
      if (typeof arrow !== 'object' || arrow === null) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: each arrow must be an object`)
      }
      const a = arrow as Record<string, unknown>
      if (typeof a['id'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: arrow id must be a string`)
      }
      for (const part of ['head', 'tail'] as const) {
        if (!Array.isArray(a[part])) {
          throw new Error(`bank ${key.variant}/${key.difficulty}: arrow ${part} must be an array`)
        }
        for (const pt of a[part] as unknown[]) {
          if (typeof pt !== 'object' || pt === null) {
            throw new Error(`bank ${key.variant}/${key.difficulty}: arrow ${part} entry must be {r,c}`)
          }
          const p = pt as Record<string, unknown>
          if (typeof p['r'] !== 'number' || typeof p['c'] !== 'number') {
            throw new Error(`bank ${key.variant}/${key.difficulty}: arrow ${part} entry must have numeric r,c`)
          }
        }
      }
    }
  }
  if (obj['thermometers'] !== undefined) {
    if (!Array.isArray(obj['thermometers'])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: 'thermometers' must be an array`)
    }
    for (const thermo of obj['thermometers'] as unknown[]) {
      if (typeof thermo !== 'object' || thermo === null) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: each thermometer must be an object`)
      }
      const t = thermo as Record<string, unknown>
      if (typeof t['id'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: thermometer id must be a string`)
      }
      if (!Array.isArray(t['path'])) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: thermometer path must be an array`)
      }
      for (const pt of t['path'] as unknown[]) {
        if (typeof pt !== 'object' || pt === null) {
          throw new Error(`bank ${key.variant}/${key.difficulty}: thermometer path entry must be {r,c}`)
        }
        const p = pt as Record<string, unknown>
        if (typeof p['r'] !== 'number' || typeof p['c'] !== 'number') {
          throw new Error(`bank ${key.variant}/${key.difficulty}: thermometer path entry must have numeric r,c`)
        }
      }
    }
  }
  if (obj['paths'] !== undefined) {
    if (!Array.isArray(obj['paths'])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: 'paths' must be an array`)
    }
    for (const path of obj['paths'] as unknown[]) {
      if (typeof path !== 'object' || path === null) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: each path must be an object`)
      }
      const p = path as Record<string, unknown>
      if (typeof p['id'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: path id must be a string`)
      }
      if (typeof p['kind'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: path kind must be a string`)
      }
      if (!Array.isArray(p['cells'])) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: path cells must be an array`)
      }
      for (const pt of p['cells'] as unknown[]) {
        if (typeof pt !== 'object' || pt === null) {
          throw new Error(`bank ${key.variant}/${key.difficulty}: path cell must be {r,c}`)
        }
        const cell = pt as Record<string, unknown>
        if (typeof cell['r'] !== 'number' || typeof cell['c'] !== 'number') {
          throw new Error(`bank ${key.variant}/${key.difficulty}: path cell must have numeric r,c`)
        }
      }
    }
  }
  if (obj['edges'] !== undefined) {
    if (!Array.isArray(obj['edges'])) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: 'edges' must be an array`)
    }
    for (const edge of obj['edges'] as unknown[]) {
      if (typeof edge !== 'object' || edge === null) {
        throw new Error(`bank ${key.variant}/${key.difficulty}: each edge must be an object`)
      }
      const e = edge as Record<string, unknown>
      if (typeof e['kind'] !== 'string') {
        throw new Error(`bank ${key.variant}/${key.difficulty}: edge kind must be a string`)
      }
      for (const endpoint of ['from', 'to'] as const) {
        const ep = e[endpoint]
        if (typeof ep !== 'object' || ep === null) {
          throw new Error(
            `bank ${key.variant}/${key.difficulty}: edge ${endpoint} must be {r,c}`,
          )
        }
        const pt = ep as Record<string, unknown>
        if (typeof pt['r'] !== 'number' || typeof pt['c'] !== 'number') {
          throw new Error(
            `bank ${key.variant}/${key.difficulty}: edge ${endpoint} must have numeric r,c`,
          )
        }
      }
    }
  }
  if (obj['samuraiGivens'] !== undefined) {
    if (!Array.isArray(obj['samuraiGivens']) || obj['samuraiGivens'].length !== 5) {
      throw new Error(
        `bank ${key.variant}/${key.difficulty}: 'samuraiGivens' must be a 5-element array`,
      )
    }
    for (const s of obj['samuraiGivens'] as unknown[]) {
      if (typeof s !== 'string' || s.length !== 81) {
        throw new Error(
          `bank ${key.variant}/${key.difficulty}: each samuraiGivens entry must be an 81-char string`,
        )
      }
    }
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
