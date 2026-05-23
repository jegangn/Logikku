import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

// Every case here drives a spawned bun subprocess that solves 5 overlapping 9×9
// samurai grids; under parallel-test load this blows past the 5s default.
vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

const ROOT = resolve(__dirname, '..')
const SCRIPT = resolve(ROOT, 'tools/grade.ts')

// Resolve bun executable: vitest runs inside bun so process.execPath is the bun
// binary. We also try common Windows install paths as a fallback.
function resolveBun(): string {
  if (process.execPath && process.execPath.toLowerCase().includes('bun')) {
    return process.execPath
  }
  // Common Windows install locations used by the bun installer
  const candidates = [
    `${process.env['USERPROFILE']}\\.bun\\bin\\bun.exe`,
    'C:\\Users\\JeganGN\\.bun\\bin\\bun.exe',
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return 'bun'
}
const BUN_BIN = resolveBun()

interface GradeChild {
  send(line: string): Promise<unknown>
  close(): void
}

function spawnGrader(): GradeChild {
  const proc: ChildProcess = spawn(BUN_BIN, ['run', SCRIPT], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const queue: Array<(line: string) => void> = []
  let buf = ''
  proc.stdout!.setEncoding('utf-8')
  proc.stdout!.on('data', (chunk: string) => {
    buf += chunk
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl)
      buf = buf.slice(nl + 1)
      const next = queue.shift()
      if (next) next(line)
    }
  })
  return {
    send(line) {
      return new Promise((res) => {
        queue.push((output) => res(JSON.parse(output)))
        proc.stdin!.write(line + '\n')
      })
    },
    close() {
      proc.stdin!.end()
      proc.kill()
    },
  }
}

const EMPTY_81 = '0'.repeat(81)
const DEMO_SAMURAI = [EMPTY_81, EMPTY_81, EMPTY_81, EMPTY_81, EMPTY_81]

let grader: GradeChild

beforeAll(async () => {
  grader = spawnGrader()
  // Give bun a moment to load + parse the script.
  await delay(2000)
})

afterAll(() => {
  grader.close()
})

describe('tools/grade.ts samurai dispatch', () => {
  it('grades an empty samurai (all zeros, 5 sub-grids)', async () => {
    const res = (await grader.send(
      JSON.stringify({ variant: 'samurai', samuraiGivens: DEMO_SAMURAI }),
    )) as { ok: boolean; unique: boolean; se: number; hardestTier: number; steps: number; techniqueOnly: boolean }
    expect(res.ok).toBe(true)
    expect(typeof res.se).toBe('number')
    expect(typeof res.hardestTier).toBe('number')
    expect(typeof res.steps).toBe('number')
    expect(typeof res.techniqueOnly).toBe('boolean')
  })

  it('rejects samurai with wrong samuraiGivens length', async () => {
    const res = (await grader.send(
      JSON.stringify({ variant: 'samurai', samuraiGivens: [EMPTY_81, EMPTY_81] }),
    )) as { ok: boolean; error?: string }
    expect(res.ok).toBe(false)
  })

  it('rejects samurai with overlap mismatch', async () => {
    // Center (1,1) shared with NW (7,7). Place '5' at center (1,1) (offset
    // 1*9+1=10) and '6' at NW (7,7) (offset 7*9+7=70). They disagree → throws.
    const center = '0'.repeat(10) + '5' + '0'.repeat(70)
    const nw = '0'.repeat(70) + '6' + '0'.repeat(10)
    const res = (await grader.send(
      JSON.stringify({ variant: 'samurai', samuraiGivens: [center, nw, EMPTY_81, EMPTY_81, EMPTY_81] }),
    )) as { ok: boolean; error?: string }
    expect(res.ok).toBe(false)
  })
})

describe('tools/grade.ts solve_samurai_empty action', () => {
  it('returns 5 × 81-char solved samurai', async () => {
    const res = (await grader.send(
      JSON.stringify({ action: 'solve_samurai_empty', seed: 1 }),
    )) as { ok: boolean; samuraiGivens?: string[] }
    expect(res.ok).toBe(true)
    expect(res.samuraiGivens?.length).toBe(5)
    for (const s of res.samuraiGivens!) {
      expect(s.length).toBe(81)
      // Solved board has no '0' cells.
      expect(s.includes('0')).toBe(false)
    }
  })

  it('same seed produces the same solved board', async () => {
    const a = (await grader.send(
      JSON.stringify({ action: 'solve_samurai_empty', seed: 7 }),
    )) as { ok: boolean; samuraiGivens?: string[] }
    const b = (await grader.send(
      JSON.stringify({ action: 'solve_samurai_empty', seed: 7 }),
    )) as { ok: boolean; samuraiGivens?: string[] }
    expect(a.samuraiGivens).toEqual(b.samuraiGivens)
  })

  it('different seeds produce different solved boards', async () => {
    const a = (await grader.send(
      JSON.stringify({ action: 'solve_samurai_empty', seed: 1 }),
    )) as { samuraiGivens?: string[] }
    const b = (await grader.send(
      JSON.stringify({ action: 'solve_samurai_empty', seed: 2 }),
    )) as { samuraiGivens?: string[] }
    expect(a.samuraiGivens).not.toEqual(b.samuraiGivens)
  })
})
