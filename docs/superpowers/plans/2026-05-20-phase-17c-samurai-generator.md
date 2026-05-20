# Phase 17c — Samurai Generator + Banks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python samurai generator + `tools/grade.ts` bridge extensions and ship a starter bank (5 puzzles per band × 7 bands) of generated puzzles to replace the hand-crafted demo. Background follow-up script will fill banks to 225 total.

**Architecture:** Extend `samuraiBacktrackingSolve` with seeded randomization. `tools/grade.ts` gains samurai grade dispatch + a `solve_samurai_empty` action. Python `grader_bridge.py` adds matching methods. New `samurai.py` + `samurai_digger.py` generators iteratively remove cells from solved boards, checking uniqueness via the bridge. Bank scripts orchestrate the runs; `promote` packages JSONL into the runtime JSON arrays the loader already accepts.

**Tech Stack:** TypeScript 6 (strict + exactOptionalPropertyTypes), React 19, Vitest 4, bun. Python 3.11 + Click + dataclasses. Playwright (Chromium + iPad gen 7 device profile).

**Spec:** `docs/superpowers/specs/2026-05-20-phase-17c-samurai-generator-design.md`.

**Branch:** main (continues from `phase-17b` tag at `4f55a3f`).

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/engine/solver/samuraiSolver.ts` | Add `randomized` + `seed` opts to `samuraiBacktrackingSolve`; add `solvedBoard` to result. Seeded mulberry32 shuffles value order. |
| Modify | `src/engine/solver/samuraiSolver.test.ts` | Tests for randomization + deterministic-given-seed behavior. |
| Modify | `tools/grade.ts` | New samurai variant dispatch + `action: 'solve_samurai_empty'` branch. |
| Create | `tools/grade.test.ts` | Spawn-the-subprocess tests for the samurai paths. |
| Modify | `vite.config.ts` | Extend test glob to include `tools/**/*.test.ts`. |
| Modify | `gen/src/generator/grader_bridge.py` | Extract `_send_and_recv`; add `grade_samurai` + `solve_samurai_empty`; constructor params for restart cadence + timeout. |
| Modify | `gen/tests/test_bridge.py` | Tests for `grade_samurai` + `solve_samurai_empty` round-trips. |
| Modify | `gen/src/generator/classic.py` | `GeneratedPuzzle` gains optional `samurai_givens` field; `write_bank` gains `append: bool`. |
| Create | `gen/src/generator/samurai_digger.py` | `SHARED_CELL_MAP`, `_pair_rotational`, `_expand_to_shared`, `dig_samurai`. |
| Create | `gen/tests/test_samurai_digger.py` | Unit tests with a mock bridge. |
| Create | `gen/src/generator/samurai.py` | `SAMURAI_DIFFICULTY_BANDS`, `generate_samurai`. |
| Create | `gen/tests/test_samurai.py` | Unit tests with a mock bridge for generator filter logic. |
| Modify | `gen/src/generator/registry.py` | Register `samurai` → `generate_samurai`. |
| Modify | `gen/src/generator/cli.py` | `gen --append` flag; thread to `write_bank`. |
| Create | `gen/scripts/phase17_banks.sh` | Starter: 5/band × 7 bands. Synchronous. Promotes to `src/puzzles/samurai/`. |
| Create | `gen/scripts/phase17_banks_followup.sh` | Background: fills to 225 target. |
| Create | `src/puzzles/samurai/{very-easy,easy,medium,hard,tough,expert,diabolical}.json` | Replaces demo `easy.json`. Each ≥5 records after starter run. |
| Modify | `e2e/samurai.spec.ts` | Two new cases: visible givens, given-rejects-input. |
| Modify | `docs/GOTCHAS.md` | Phase 17c entry. |

---

## Task 1: Randomization in `samuraiBacktrackingSolve`

Add `randomized?: boolean` and `seed?: number` to `SamuraiBacktrackOptions`. Add `solvedBoard?: SamuraiBoard` to `SamuraiBacktrackResult`. Inline a seeded mulberry32 RNG and shuffle candidate value order when `randomized=true`. Determinism is critical: same seed must produce the same board across calls.

**Files:**
- Modify: `src/engine/solver/samuraiSolver.ts`
- Modify: `src/engine/solver/samuraiSolver.test.ts`

- [ ] **Step 1: Write the failing tests in `src/engine/solver/samuraiSolver.test.ts`**

Append AFTER the existing tests, BEFORE the final closing brace:

```ts
import { samuraiIsComplete, samuraiConsistencyCheck } from '@/engine'

describe('samuraiBacktrackingSolve — randomization', () => {
  it('with randomized=false, two calls return the same first solution', () => {
    const a = samuraiBacktrackingSolve(createSamuraiBoard(), { maxSolutions: 1 })
    const b = samuraiBacktrackingSolve(createSamuraiBoard(), { maxSolutions: 1 })
    expect(a.hasSolution).toBe(true)
    expect(b.hasSolution).toBe(true)
    expect(serializeBoard(a)).toBe(serializeBoard(b))
  })

  it('with randomized=true, seed=1 returns a valid solved samurai board', () => {
    const result = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 1,
    })
    expect(result.hasSolution).toBe(true)
    expect(result.solvedBoard).toBeDefined()
    expect(samuraiIsComplete(result.solvedBoard!)).toBe(true)
    expect(() => samuraiConsistencyCheck(result.solvedBoard!)).not.toThrow()
  })

  it('with randomized=true, same seed produces the same board', () => {
    const a = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 42,
    })
    const b = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 42,
    })
    expect(serializeBoard(a)).toBe(serializeBoard(b))
  })

  it('with randomized=true, different seeds produce different boards', () => {
    const a = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 1,
    })
    const b = samuraiBacktrackingSolve(createSamuraiBoard(), {
      maxSolutions: 1,
      randomized: true,
      seed: 2,
    })
    expect(serializeBoard(a)).not.toBe(serializeBoard(b))
  })
})

function serializeBoard(r: { solvedBoard?: { grids: ReadonlyArray<{ cells: ReadonlyArray<ReadonlyArray<{ value: number | null }>> }> } }): string {
  const board = r.solvedBoard
  if (!board) return ''
  const parts: string[] = []
  for (const grid of board.grids) {
    for (const row of grid.cells) {
      for (const cell of row) parts.push(String(cell.value ?? 0))
    }
  }
  return parts.join('')
}
```

You'll also need `createSamuraiBoard` imported at the top of the file (likely already there from existing tests — verify).

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:run src/engine/solver/samuraiSolver.test.ts`
Expected: FAIL — `solvedBoard`, `randomized`, and `seed` are not part of the current API.

- [ ] **Step 3: Extend `SamuraiBacktrackOptions` and `SamuraiBacktrackResult`**

Find the interface declarations near line 79–87 of `src/engine/solver/samuraiSolver.ts` and replace:

```ts
export interface SamuraiBacktrackOptions {
  readonly maxSolutions: number
  readonly randomized?: boolean
  readonly seed?: number
}

export interface SamuraiBacktrackResult {
  readonly solutions: ReadonlyArray<SamuraiBoard>
  readonly hasSolution: boolean
  readonly isUnique: boolean
  readonly solvedBoard?: SamuraiBoard
}
```

- [ ] **Step 4: Add mulberry32 helper at the top of the file**

Insert just AFTER the imports block (around line 11, after `import { techniqueSolve, type TechniqueSolveOptions } from './techniqueSolver'`):

```ts
// Tiny seeded PRNG (mulberry32). Deterministic — same seed yields the same
// sequence. Used to shuffle candidate values during randomized backtracking.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
}
```

- [ ] **Step 5: Wire randomization into `samuraiBacktrackingSolve`**

In `src/engine/solver/samuraiSolver.ts`, modify the body of `samuraiBacktrackingSolve` (around lines 115–173) to use the RNG and populate `solvedBoard`. Replace the entire function with:

```ts
export function samuraiBacktrackingSolve(
  input: SamuraiBoard,
  opts: SamuraiBacktrackOptions,
): SamuraiBacktrackResult {
  const solutions: SamuraiBoard[] = []
  const max = Math.max(1, opts.maxSolutions)
  const rand = opts.randomized ? mulberry32(opts.seed ?? 0) : null

  function step(current: SamuraiBoard): void {
    if (solutions.length >= max) return

    const propagated = samuraiTechniqueSolve(current)
    const board = propagated.board

    for (let g = 0; g < 5; g++) {
      for (const constraint of board.grids[g]!.constraints) {
        if (!constraint.validate(board.grids[g]!)) return
      }
    }

    for (let g = 0; g < 5; g++) {
      const grid = board.grids[g]!
      for (let r = 0; r < grid.shape.size; r++) {
        for (let c = 0; c < grid.shape.size; c++) {
          const cell = cellAt(grid, { r, c })
          if (cell.value === null && cell.candidates.size === 0) return
        }
      }
    }

    if (boardIsFull(board)) {
      solutions.push(board)
      return
    }

    const pick = pickMRV(board)
    if (!pick) {
      solutions.push(board)
      return
    }
    if (pick.candidates.length === 0) return

    const order = [...pick.candidates]
    if (rand) shuffleInPlace(order, rand)
    for (const digit of order) {
      const next = samuraiCloneBoard(board)
      setValueShared(next, pick.gridIdx, pick.coord, digit as Digit)
      step(next)
      if (solutions.length >= max) return
    }
  }

  step(samuraiCloneBoard(input))
  const solvedBoard = solutions.length === 1 && max === 1 ? solutions[0] : undefined
  return {
    solutions,
    hasSolution: solutions.length > 0,
    isUnique: solutions.length === 1,
    ...(solvedBoard !== undefined ? { solvedBoard } : {}),
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun run test:run src/engine/solver/samuraiSolver.test.ts`
Expected: PASS — all 4 new tests + existing tests.

- [ ] **Step 7: Run the full engine + UI suite as a regression sweep**

Run: `bun run test:run src/engine src/state src/ui && bun run typecheck && bun run lint`
Expected: typecheck + lint clean, all suites green. The 17a samurai tests + 17b cruciform tests should still pass — randomization defaults to off, so existing behavior is preserved.

- [ ] **Step 8: Commit**

```bash
git add src/engine/solver/samuraiSolver.ts src/engine/solver/samuraiSolver.test.ts
git commit -m "feat(engine): seedable randomization in samuraiBacktrackingSolve

Adds optional { randomized, seed } to SamuraiBacktrackOptions and exposes
the matched solvedBoard on the result. Backs the Phase 17c generator's
need for random solved samurai boards. Mulberry32 inline (no deps);
default behavior unchanged."
```

---

## Task 2: `tools/grade.ts` samurai dispatch + `solve_samurai_empty` action

The existing `tools/grade.ts` reads JSON-or-tab-or-bare lines, treats them all as grade requests. We add two paths: (a) `variant: 'samurai'` is now a valid grade request shape (with `samuraiGivens` instead of `puzzle`); (b) a new `action: 'solve_samurai_empty'` top-level branch that produces a random solved board.

**Files:**
- Modify: `tools/grade.ts`
- Create: `tools/grade.test.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Extend the vitest test glob in `vite.config.ts`**

Find the `test` block (around line 61). Update the `include` field:

```ts
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tools/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    css: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**', 'src/**/*.test.*', 'src/main.tsx'],
    },
  },
```

Only the `include` array changed.

- [ ] **Step 2: Write the failing test file `tools/grade.test.ts`**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const ROOT = resolve(__dirname, '..')
const SCRIPT = resolve(ROOT, 'tools/grade.ts')

interface GradeChild {
  send(line: string): Promise<unknown>
  close(): void
}

function spawnGrader(): GradeChild {
  const proc: ChildProcess = spawn('bun', ['run', SCRIPT], {
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
```

- [ ] **Step 3: Run the failing test**

Run: `bun run test:run tools/grade.test.ts`
Expected: FAIL — either with the existing handler throwing "unknown variant: samurai" or returning a malformed response.

- [ ] **Step 4: Extend `tools/grade.ts` — add samurai imports**

In `tools/grade.ts`, find the existing `import { ... } from '../src/engine/index'` block (around lines 19–62). The original block does NOT include `cellAt`. Add these six names to the import (alphabetize as you go):

```ts
  cellAt,
  createSamuraiBoard,
  gradeSamurai,
  samuraiBacktrackingSolve,
  samuraiConsistencyCheck,
  serializePuzzle,
```

All other existing imports stay verbatim. The helper introduced in Step 5 uses `cellAt` to write values directly (no `setValue` needed).

- [ ] **Step 5: Add `buildSamuraiFromGivens` helper inside `tools/grade.ts`**

Insert this helper just BEFORE the `rl.on('line', ...)` block:

```ts
function buildSamuraiFromGivens(givens: ReadonlyArray<string>): ReturnType<typeof createSamuraiBoard> {
  if (givens.length !== 5) {
    throw new Error(`samurai requires samuraiGivens of length 5, got ${givens.length}`)
  }
  const board = createSamuraiBoard()
  for (let g = 0; g < 5; g++) {
    const s = givens[g]!
    if (s.length !== 81) {
      throw new Error(`samuraiGivens[${g}] must be 81 chars, got ${s.length}`)
    }
    const grid = board.grids[g]!
    for (let i = 0; i < 81; i++) {
      const ch = s[i]!
      if (ch === '0') continue
      const r = Math.floor(i / 9)
      const c = i % 9
      const digit = parseInt(ch, 16)
      const cell = cellAt(grid, { r, c })
      cell.value = digit as never
      cell.given = true
    }
  }
  samuraiConsistencyCheck(board)
  // Recompute candidates per sub-grid (parsePuzzle did this for classic; we
  // must do it manually here since we wrote values directly).
  for (let g = 0; g < 5; g++) {
    const grid = board.grids[g]!
    recomputeCandidates(grid)
  }
  return board
}
```


Wait — actually we are NOT calling setValue here. Re-check Step 4 and remove `setValue` from imports if eslint flags it. The helper uses `cellAt` to set value directly + then `recomputeCandidates`.

- [ ] **Step 6: Add the samurai variant branch to the request handler in `tools/grade.ts`**

Find the `rl.on('line', (raw) => { ... })` block (around lines 250–305). Wrap the existing body so the samurai variant and the solve action are handled FIRST, then fall through to the existing classic+variant handler. Replace the whole listener with:

```ts
rl.on('line', (raw) => {
  const trimmed = raw.trim()
  if (!trimmed) return
  try {
    // Action branch (solve_samurai_empty) is a non-grade request.
    if (trimmed.startsWith('{')) {
      const obj = JSON.parse(trimmed) as Record<string, unknown>
      if (obj['action'] === 'solve_samurai_empty') {
        const seed = typeof obj['seed'] === 'number' ? obj['seed'] : 0
        const result = samuraiBacktrackingSolve(createSamuraiBoard(), {
          maxSolutions: 1,
          randomized: true,
          seed,
        })
        if (!result.hasSolution || !result.solvedBoard) {
          process.stdout.write(JSON.stringify({ ok: false }) + '\n')
          return
        }
        const givens = result.solvedBoard.grids.map((g) => serializePuzzle(g))
        process.stdout.write(
          JSON.stringify({ ok: true, samuraiGivens: givens }) + '\n',
        )
        return
      }
      if (obj['variant'] === 'samurai') {
        const samGivens = obj['samuraiGivens']
        if (!Array.isArray(samGivens)) {
          process.stdout.write(
            JSON.stringify({ ok: false, error: 'samurai requires samuraiGivens' }) + '\n',
          )
          return
        }
        const board = buildSamuraiFromGivens(samGivens as ReadonlyArray<string>)
        const grade = gradeSamurai(board)
        const techniqueOnly = grade.se < 9.0
        const bt = samuraiBacktrackingSolve(board, { maxSolutions: 2 })
        process.stdout.write(
          JSON.stringify({
            ok: true,
            variant: 'samurai',
            se: grade.se,
            difficulty: grade.difficulty,
            hardestTier: grade.hardestTier,
            steps: grade.stepsBySubgrid.reduce((s, arr) => s + arr.length, 0),
            techniqueOnly,
            unique: bt.isUnique,
          }) + '\n',
        )
        return
      }
    }
    // Existing classic / variant grade path (unchanged below).
    const req = parseLine(trimmed)
    const shape = shapeForRequest(req)
    const constraints = constraintsForRequest(req, shape)
    const grid = { ...parsePuzzle(req.puzzle, shape), constraints }
    if (
      req.variant === 'jigsaw' ||
      req.variant === 'even-odd' ||
      req.variant === 'kropki' ||
      req.variant === 'xv' ||
      req.variant === 'greater-than' ||
      req.variant === 'thermometer' ||
      req.variant === 'arrow' ||
      req.variant === 'killer' ||
      req.variant === 'little-killer' ||
      req.variant === 'sandwich' ||
      req.variant === 'skyscraper' ||
      req.variant === 'palindrome' ||
      req.variant === 'renban' ||
      req.variant === 'german-whispers'
    ) {
      recomputeCandidates(grid)
    }
    const grade = gradePuzzle(grid)
    const techniqueOnly = grade.solvable && grade.hardestTier <= 4
    let backtrackUnique = false
    if (!techniqueOnly) {
      const bt = backtrackingSolve(grid, { maxSolutions: 2 })
      backtrackUnique = bt.isUnique
    } else {
      backtrackUnique = true
    }
    process.stdout.write(
      JSON.stringify({
        ok: true,
        variant: req.variant,
        se: grade.se,
        difficulty: grade.difficulty,
        hardestTier: grade.hardestTier,
        steps: grade.steps.length,
        techniqueOnly,
        unique: backtrackUnique,
      }) + '\n',
    )
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: String(err) }) + '\n')
  }
})
```

- [ ] **Step 7: Run the tools tests + typecheck**

Run: `bun run test:run tools/grade.test.ts && bun run typecheck && bun run lint`
Expected: all 6 tools/grade tests pass; typecheck + lint clean.


- [ ] **Step 8: Run the full test suite as a regression sweep**

Run: `bun run test:run`
Expected: all green. The full Vitest suite now includes the 6 new tools/grade cases.

- [ ] **Step 9: Commit**

```bash
git add tools/grade.ts tools/grade.test.ts vite.config.ts
git commit -m "feat(tools): samurai grade dispatch + solve_samurai_empty action

tools/grade.ts learns variant=samurai (parses samuraiGivens, runs
gradeSamurai + uniqueness check) and a top-level action verb
'solve_samurai_empty' (returns one randomized solved board via the
17a backtracker). Vitest config now also globs tools/**/*.test.ts."
```

---

## Task 3: `grader_bridge.py` — extract `_send_and_recv`; add samurai methods

Refactor the existing `grade()` to share its send/recv path with two new methods. Add constructor parameters for restart cadence and per-call timeout.

**Files:**
- Modify: `gen/src/generator/grader_bridge.py`
- Modify: `gen/tests/test_bridge.py`

- [ ] **Step 1: Append failing tests to `gen/tests/test_bridge.py`**

Open `gen/tests/test_bridge.py`. Append the following AFTER the existing tests:

```python
import pytest
from generator.grader_bridge import GraderBridge

EMPTY_81 = "0" * 81


@pytest.mark.slow
def test_grade_samurai_empty_returns_unique_false():
    with GraderBridge() as g:
        result = g.grade_samurai([EMPTY_81] * 5)
    assert result.get("ok") is True
    # An empty samurai has many solutions; unique should be False.
    assert result.get("unique") is False


@pytest.mark.slow
def test_solve_samurai_empty_returns_5_strings_of_length_81():
    with GraderBridge() as g:
        givens = g.solve_samurai_empty(seed=1)
    assert isinstance(givens, list)
    assert len(givens) == 5
    for s in givens:
        assert isinstance(s, str)
        assert len(s) == 81
        assert "0" not in s


@pytest.mark.slow
def test_solve_samurai_empty_is_deterministic_per_seed():
    with GraderBridge() as g:
        a = g.solve_samurai_empty(seed=42)
        b = g.solve_samurai_empty(seed=42)
    assert a == b


@pytest.mark.slow
def test_grade_samurai_rejects_wrong_length():
    with GraderBridge() as g:
        result = g.grade_samurai([EMPTY_81, EMPTY_81])
    assert result.get("ok") is False
```

If `pytest` isn't already configured to recognize the `@pytest.mark.slow` marker, add a `conftest.py` next to the tests:

```python
# gen/tests/conftest.py (create if missing)
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (run with --runslow)"
    )
```

And in `pytest.ini` or `pyproject.toml` make sure slow tests run by default — actually they should just run; the marker is purely informational here.

- [ ] **Step 2: Verify the tests fail**

Run: `cd gen && .venv/bin/python -m pytest tests/test_bridge.py -v -k samurai 2>&1 | tail -20` (or wherever the Python interpreter lives — see existing scripts for the path)
Expected: FAIL — `AttributeError: 'GraderBridge' object has no attribute 'grade_samurai'`.

- [ ] **Step 3: Refactor `grader_bridge.py`**

Open `gen/src/generator/grader_bridge.py`. Replace the `__init__`, `grade`, and surrounding method bodies. Apply this full replacement to the class (keep the helpers like `_spawn`, `_restart`, etc.):

Update the constructor:

```python
class GraderBridge:
    def __init__(
        self,
        bun: Path | str | None = None,
        script: Path | str | None = None,
        *,
        restart_every: int = 3000,
        grade_timeout_s: float = 60.0,
    ):
        self._bun = Path(bun) if bun else BUN_PATH
        self._script = Path(script) if script else GRADE_SCRIPT
        if not self._bun.exists():
            for cand in ("bun", "bun.exe"):
                from shutil import which
                p = which(cand)
                if p:
                    self._bun = Path(p)
                    break
        if not self._bun.exists():
            raise FileNotFoundError(f"bun not found at {self._bun}")
        if not self._script.exists():
            raise FileNotFoundError(f"grade.ts not found at {self._script}")
        self._proc: subprocess.Popen[str] | None = None
        self._call_count = 0
        self._restart_every = restart_every
        self._grade_timeout_s = grade_timeout_s
```

Add a `_send_and_recv` method (insert just before `grade`):

```python
    def _send_and_recv(self, payload: dict) -> dict:
        if not self._proc or not self._proc.stdin or not self._proc.stdout:
            raise RuntimeError("GraderBridge not entered")
        line = json.dumps(payload, separators=(",", ":")) + "\n"
        if self._call_count >= self._restart_every:
            print(
                f"grader: preemptive restart after {self._call_count} calls",
                file=sys.stderr,
                flush=True,
            )
            self._restart()
        import threading
        watchdog = threading.Timer(self._grade_timeout_s, lambda: self._proc and self._proc.kill())
        watchdog.daemon = True
        for attempt in range(2):
            try:
                if not self._proc or not self._proc.stdin or not self._proc.stdout:
                    raise RuntimeError("grader subprocess not running")
                watchdog.cancel()
                watchdog = threading.Timer(self._grade_timeout_s, lambda: self._proc and self._proc.kill())
                watchdog.daemon = True
                watchdog.start()
                self._proc.stdin.write(line)
                self._proc.stdin.flush()
                out = self._proc.stdout.readline()
                watchdog.cancel()
                if not out:
                    raise RuntimeError("grader subprocess returned no data")
                self._call_count += 1
                return json.loads(out)
            except (OSError, RuntimeError) as err:
                watchdog.cancel()
                if attempt >= 1:
                    raise
                print(
                    f"grader subprocess died ({err}); restarting and retrying once",
                    file=sys.stderr,
                    flush=True,
                )
                self._restart()
        raise RuntimeError("unreachable")
```

Refactor `grade` to delegate (keep its public signature):

```python
    def grade(
        self,
        puzzle: str,
        variant: str = "classic",
        *,
        size: int | None = None,
        regions: list[list[int]] | None = None,
        parity_mask: str | None = None,
        edges: list[dict] | None = None,
        thermometers: list[dict] | None = None,
        arrows: list[dict] | None = None,
        cages: list[dict] | None = None,
        little_killer_clues: list[dict] | None = None,
        sandwich_clues: list[dict] | None = None,
        skyscraper_clues: list[dict] | None = None,
        paths: list[dict] | None = None,
    ) -> dict:
        needs_json = (
            regions is not None
            or parity_mask is not None
            or edges is not None
            or thermometers is not None
            or arrows is not None
            or cages is not None
            or little_killer_clues is not None
            or sandwich_clues is not None
            or skyscraper_clues is not None
            or paths is not None
            or size is not None
        )
        if not needs_json:
            # Fast path: tab-separated for classic-shaped requests.
            if not self._proc or not self._proc.stdin or not self._proc.stdout:
                raise RuntimeError("GraderBridge not entered")
            line = f"{variant}\t{puzzle}\n"
            for attempt in range(2):
                try:
                    self._proc.stdin.write(line)
                    self._proc.stdin.flush()
                    out = self._proc.stdout.readline()
                    if not out:
                        raise RuntimeError("grader subprocess returned no data")
                    self._call_count += 1
                    return json.loads(out)
                except (OSError, RuntimeError) as err:
                    if attempt >= 1:
                        raise
                    print(
                        f"grader subprocess died ({err}); restarting and retrying once",
                        file=sys.stderr,
                        flush=True,
                    )
                    self._restart()
            raise RuntimeError("unreachable")
        payload: dict = {"variant": variant, "puzzle": puzzle}
        if size is not None:
            payload["size"] = size
        if regions is not None:
            payload["regions"] = regions
        if parity_mask is not None:
            payload["parityMask"] = parity_mask
        if edges is not None:
            payload["edges"] = edges
        if thermometers is not None:
            payload["thermometers"] = thermometers
        if arrows is not None:
            payload["arrows"] = arrows
        if cages is not None:
            payload["cages"] = cages
        if little_killer_clues is not None:
            payload["littleKillerClues"] = little_killer_clues
        if sandwich_clues is not None:
            payload["sandwichClues"] = sandwich_clues
        if skyscraper_clues is not None:
            payload["skyscraperClues"] = skyscraper_clues
        if paths is not None:
            payload["paths"] = paths
        return self._send_and_recv(payload)

    def grade_samurai(self, samurai_givens: list[str]) -> dict:
        return self._send_and_recv({"variant": "samurai", "samuraiGivens": samurai_givens})

    def solve_samurai_empty(self, seed: int) -> list[str]:
        result = self._send_and_recv({"action": "solve_samurai_empty", "seed": seed})
        if not result.get("ok"):
            raise RuntimeError(f"samurai solve failed: {result}")
        givens = result.get("samuraiGivens")
        if not isinstance(givens, list) or len(givens) != 5:
            raise RuntimeError(f"samurai solve returned malformed payload: {result}")
        return givens
```

Delete the `RESTART_EVERY` module-level constant (replaced by the constructor parameter) — find the line near the top of the file and remove it.

- [ ] **Step 4: Run the failing tests + verify pass**

Run: `cd gen && .venv/bin/python -m pytest tests/test_bridge.py -v -k samurai 2>&1 | tail -20`
Expected: all 4 new samurai tests PASS. Each test may take a few seconds (bridge startup + bun load).

- [ ] **Step 5: Run the existing bridge tests to confirm no regression**

Run: `cd gen && .venv/bin/python -m pytest tests/test_bridge.py -v 2>&1 | tail -10`
Expected: all tests pass, including the pre-existing ones.

- [ ] **Step 6: Commit**

```bash
git add gen/src/generator/grader_bridge.py gen/tests/test_bridge.py gen/tests/conftest.py
git commit -m "feat(gen): grader_bridge.grade_samurai + solve_samurai_empty

Refactors send/recv into _send_and_recv so grade(), grade_samurai(),
and solve_samurai_empty() share the protocol. RESTART_EVERY now a
constructor parameter (default 3000); generators that hammer samurai
will pass 1000. Adds a watchdog-thread timeout (default 60s) so a
pathological solve can't wedge a long-running generation."
```

---

## Task 4: `samurai_digger.py`

Iterative cell removal with rotational symmetry and shared-cell propagation. Uses the bridge for uniqueness checks.

**Files:**
- Create: `gen/src/generator/samurai_digger.py`
- Create: `gen/tests/test_samurai_digger.py`

- [ ] **Step 1: Write the failing tests `gen/tests/test_samurai_digger.py`**

```python
"""Tests for the samurai digger module."""

from __future__ import annotations

import random
from unittest.mock import MagicMock

import pytest

from generator.samurai_digger import (
    SHARED_CELL_MAP,
    _expand_to_shared,
    _pair_rotational,
    dig_samurai,
)

SOLVED = "1" * 81  # placeholder; doesn't matter for digger tests with mock bridge.


def test_pair_rotational_returns_symmetric_partner():
    pairs = _pair_rotational(0, 1, 2)
    assert (0, 1, 2) in pairs
    assert (0, 7, 6) in pairs
    assert len(pairs) == 2


def test_pair_rotational_self_pair_at_center():
    pairs = _pair_rotational(0, 4, 4)
    assert pairs == [(0, 4, 4)]


def test_expand_to_shared_adds_partners_for_shared_cells():
    # Center (0,0) is in box (0,0), shared with NW cornerBox (2,2) → NW (6,6).
    result = _expand_to_shared([(0, 0, 0)])
    assert (0, 0, 0) in result
    assert (1, 6, 6) in result


def test_expand_to_shared_no_op_for_non_shared_cells():
    # Center (4,4) is in middle box (1,1), not shared with any corner.
    result = _expand_to_shared([(0, 4, 4)])
    assert result == [(0, 4, 4)]


def test_shared_cell_map_has_9_pairs_per_corner():
    # 4 corners × 9 shared cells each = 36 keys (one direction per pair, both
    # directions stored).
    assert len(SHARED_CELL_MAP) == 4 * 9 * 2  # 72 entries (bidirectional).


def test_dig_samurai_removes_cells_when_bridge_says_unique():
    bridge = MagicMock()
    bridge.grade_samurai.return_value = {"ok": True, "unique": True}
    rng = random.Random(1)
    result = dig_samurai([SOLVED] * 5, rng, bridge, max_removals=20)
    total_empty = sum(s.count("0") for s in result)
    assert total_empty >= 20
    assert total_empty <= 30  # symmetry + shared-cell expansion may overshoot.


def test_dig_samurai_no_removal_when_bridge_says_not_unique():
    bridge = MagicMock()
    bridge.grade_samurai.return_value = {"ok": True, "unique": False}
    rng = random.Random(1)
    result = dig_samurai([SOLVED] * 5, rng, bridge, max_removals=20)
    total_empty = sum(s.count("0") for s in result)
    assert total_empty == 0


def test_dig_samurai_rotational_symmetry_preserved():
    bridge = MagicMock()
    bridge.grade_samurai.return_value = {"ok": True, "unique": True}
    rng = random.Random(1)
    result = dig_samurai([SOLVED] * 5, rng, bridge, max_removals=8, symmetry="rotational")
    for g in range(5):
        for r in range(9):
            for c in range(9):
                if result[g][r * 9 + c] == "0":
                    # The rotational partner must also be empty (unless it's
                    # the same cell, i.e. (4,4)).
                    pr, pc = 8 - r, 8 - c
                    if (r, c) != (pr, pc):
                        assert result[g][pr * 9 + pc] == "0", (
                            f"asymmetric dig at g={g}, r={r}, c={c}"
                        )
```

- [ ] **Step 2: Verify failing**

Run: `cd gen && .venv/bin/python -m pytest tests/test_samurai_digger.py -v 2>&1 | tail -20`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `gen/src/generator/samurai_digger.py`**

```python
"""Samurai digger: iteratively remove cells from a solved board, keeping the
puzzle uniquely solvable. Mirrors the engine's SAMURAI_LAYOUT (17a) for
overlap propagation.
"""

from __future__ import annotations

import random
from typing import Iterable, Literal

from .grader_bridge import GraderBridge

Symmetry = Literal["rotational", "none"]

# SAMURAI_LAYOUT mirror: each corner reports its (centerBox, cornerBox)
# 3×3 anchor positions. Box (r, c) covers cells in rows r*3..r*3+2 and
# cols c*3..c*3+2. Center idx is 0; corners are 1=NW, 2=NE, 3=SW, 4=SE.
_LAYOUT: tuple[tuple[int, tuple[int, int], tuple[int, int]], ...] = (
    (1, (0, 0), (2, 2)),  # NW: center box (0,0) ↔ NW cornerBox (2,2)
    (2, (0, 2), (2, 0)),  # NE
    (3, (2, 0), (0, 2)),  # SW
    (4, (2, 2), (0, 0)),  # SE
)


def _compute_shared_map() -> dict[tuple[int, int, int], tuple[int, int, int]]:
    """Build a bidirectional cell-to-partner map for the cruciform overlap."""
    m: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for corner_idx, (cbr, cbc), (xbr, xbc) in _LAYOUT:
        for dr in range(3):
            for dc in range(3):
                center = (0, cbr * 3 + dr, cbc * 3 + dc)
                corner = (corner_idx, xbr * 3 + dr, xbc * 3 + dc)
                m[center] = corner
                m[corner] = center
    return m


SHARED_CELL_MAP = _compute_shared_map()


def _pair_rotational(g: int, r: int, c: int) -> list[tuple[int, int, int]]:
    pr, pc = 8 - r, 8 - c
    if (r, c) == (pr, pc):
        return [(g, r, c)]
    return [(g, r, c), (g, pr, pc)]


def _expand_to_shared(cells: Iterable[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    out: list[tuple[int, int, int]] = []
    seen: set[tuple[int, int, int]] = set()
    for cell in cells:
        if cell in seen:
            continue
        seen.add(cell)
        out.append(cell)
        partner = SHARED_CELL_MAP.get(cell)
        if partner is not None and partner not in seen:
            seen.add(partner)
            out.append(partner)
    return out


def _cell_at(state: list[str], cell: tuple[int, int, int]) -> str:
    g, r, c = cell
    return state[g][r * 9 + c]


def _set_cell(s: str, r: int, c: int, ch: str) -> str:
    i = r * 9 + c
    return s[:i] + ch + s[i + 1 :]


def dig_samurai(
    solved: list[str],
    rng: random.Random,
    bridge: GraderBridge,
    max_removals: int,
    symmetry: Symmetry = "rotational",
) -> list[str]:
    """Returns a new list[str] of length 5 with cells removed."""
    if len(solved) != 5:
        raise ValueError(f"expected 5 solved sub-grids, got {len(solved)}")
    for i, s in enumerate(solved):
        if len(s) != 81:
            raise ValueError(f"solved[{i}] must be 81 chars, got {len(s)}")
    state = list(solved)
    cells: list[tuple[int, int, int]] = [
        (g, r, c) for g in range(5) for r in range(9) for c in range(9)
    ]
    rng.shuffle(cells)
    removed = 0
    for (g, r, c) in cells:
        if removed >= max_removals:
            break
        if symmetry == "rotational":
            base = _pair_rotational(g, r, c)
        else:
            base = [(g, r, c)]
        targets = _expand_to_shared(base)
        if all(_cell_at(state, t) == "0" for t in targets):
            continue
        before = list(state)
        for (xg, xr, xc) in targets:
            state[xg] = _set_cell(state[xg], xr, xc, "0")
        result = bridge.grade_samurai(state)
        if not result.get("ok") or not result.get("unique"):
            state = before
            continue
        removed += sum(1 for t in targets if _cell_at(before, t) != "0")
    return state
```

- [ ] **Step 4: Run the digger tests**

Run: `cd gen && .venv/bin/python -m pytest tests/test_samurai_digger.py -v 2>&1 | tail -20`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add gen/src/generator/samurai_digger.py gen/tests/test_samurai_digger.py
git commit -m "feat(gen): samurai_digger with rotational symmetry + shared propagation

SHARED_CELL_MAP precomputed from SAMURAI_LAYOUT. dig_samurai removes
cells while keeping the puzzle uniquely solvable (uniqueness checked
via the bridge). Rotational symmetry within each sub-grid; shared
cells always dig in lockstep with their partner."
```

---

## Task 5: `samurai.py` generator + `GeneratedPuzzle` extension

The orchestrator that runs the solve → dig → grade → filter pipeline. Also extends `GeneratedPuzzle` so it can carry `samurai_givens`.

**Files:**
- Modify: `gen/src/generator/classic.py`
- Create: `gen/src/generator/samurai.py`
- Create: `gen/tests/test_samurai.py`

- [ ] **Step 1: Write the failing tests `gen/tests/test_samurai.py`**

```python
"""Tests for gen/src/generator/samurai.py."""

from __future__ import annotations

import random
from unittest.mock import MagicMock

import pytest

from generator.samurai import SAMURAI_DIFFICULTY_BANDS, generate_samurai


SOLVED = "1" * 81  # placeholder; the mock bridge will fake the grade response.


def make_mock_bridge(grade_result: dict, solve_result: list[str] | None = None) -> MagicMock:
    bridge = MagicMock()
    bridge.grade_samurai.return_value = grade_result
    bridge.solve_samurai_empty.return_value = solve_result or ([SOLVED] * 5)
    return bridge


def test_bands_cover_all_seven_user_facing_labels():
    expected = {"very-easy", "easy", "medium", "hard", "tough", "expert", "diabolical"}
    assert set(SAMURAI_DIFFICULTY_BANDS.keys()) == expected


def test_generate_samurai_yields_count_records_when_grades_match():
    bridge = make_mock_bridge({
        "ok": True,
        "unique": True,
        "se": 2.0,
        "hardestTier": 1,
        "steps": 10,
        "techniqueOnly": True,
    })
    records = list(generate_samurai(count=3, difficulty="easy", seed=1, bridge=bridge))
    assert len(records) == 3
    for rec in records:
        assert rec.variant == "samurai"
        assert rec.samurai_givens is not None
        assert len(rec.samurai_givens) == 5


def test_generate_samurai_skips_out_of_band_se():
    # easy band is 1.5-2.4. Return 5.0 — should never accept.
    bridge = make_mock_bridge({
        "ok": True,
        "unique": True,
        "se": 5.0,
        "hardestTier": 4,
        "steps": 10,
        "techniqueOnly": True,
    })
    # Limit by mock side_effect to avoid infinite loop on never-emit.
    bridge.grade_samurai.return_value = {
        "ok": True, "unique": True, "se": 5.0, "hardestTier": 4, "steps": 10, "techniqueOnly": True,
    }

    # We can't loop forever; the digger sees True so it will infinite-loop.
    # Trick: make solve return enough seeds, count attempts on grade calls,
    # then stop the generator after a bounded number of yielded items via
    # itertools.islice.
    import itertools
    result = list(itertools.islice(
        generate_samurai(count=100, difficulty="easy", seed=1, bridge=bridge),
        0,  # take none — we expect no yields because SE is out of band.
    ))
    assert result == []


def test_generate_samurai_diabolical_requires_technique_only_false():
    bridge = make_mock_bridge({
        "ok": True,
        "unique": True,
        "se": 9.0,
        "hardestTier": 9,
        "steps": 50,
        "techniqueOnly": False,  # required for diabolical
    })
    records = list(generate_samurai(count=2, difficulty="diabolical", seed=1, bridge=bridge))
    assert len(records) == 2


def test_generate_samurai_to_dict_writes_samuraiGivens_field():
    bridge = make_mock_bridge({
        "ok": True, "unique": True, "se": 2.0, "hardestTier": 1, "steps": 5, "techniqueOnly": True,
    })
    records = list(generate_samurai(count=1, difficulty="easy", seed=1, bridge=bridge))
    d = records[0].to_dict()
    assert "samuraiGivens" in d
    assert isinstance(d["samuraiGivens"], list)
    assert len(d["samuraiGivens"]) == 5
    assert d["givens"] == ""
```

- [ ] **Step 2: Verify failing**

Run: `cd gen && .venv/bin/python -m pytest tests/test_samurai.py -v 2>&1 | tail -20`
Expected: FAIL — `generate_samurai` not found.

- [ ] **Step 3: Extend `GeneratedPuzzle` in `gen/src/generator/classic.py`**

In `gen/src/generator/classic.py`, find the `@dataclass(frozen=True) class GeneratedPuzzle` block (around lines 28–51). Replace the whole dataclass with:

```python
@dataclass(frozen=True)
class GeneratedPuzzle:
    id: str
    variant: str
    size: int
    givens: str
    difficulty: str
    se: float
    hardest_tier: int
    steps: int
    generated_at: str
    samurai_givens: tuple[str, ...] | None = None

    def to_dict(self) -> dict:
        out: dict = {
            "id": self.id,
            "variant": self.variant,
            "size": self.size,
            "givens": self.givens,
            "difficulty": self.difficulty,
            "se": self.se,
            "hardestTier": self.hardest_tier,
            "steps": self.steps,
            "generatedAt": self.generated_at,
        }
        if self.samurai_givens is not None:
            out["samuraiGivens"] = list(self.samurai_givens)
        return out
```

Also: in the same file, modify `write_bank` to support append mode. Replace its body:

```python
def write_bank(
    path: Path,
    puzzles: Iterator[GeneratedPuzzle],
    *,
    append: bool = False,
) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    mode = "a" if append else "w"
    with path.open(mode, encoding="utf-8", newline="\n") as f:
        for p in puzzles:
            f.write(json.dumps(p.to_dict(), separators=(",", ":")) + "\n")
            f.flush()
            count += 1
    return count
```

- [ ] **Step 4: Create `gen/src/generator/samurai.py`**

```python
"""Samurai 5×9×9 cruciform generator.

Pipeline per puzzle: solve_samurai_empty → dig_samurai → grade_samurai →
SE-band + technique-mode filter → emit.
"""

from __future__ import annotations

import random
import time
from typing import Iterator

from .classic import GeneratedPuzzle
from .grader_bridge import GraderBridge
from .samurai_digger import dig_samurai


# Each tuple: (se_lo, se_hi, max_removals). max_removals empirically tuned
# during 17c starter run; cells = 405 across cruciform.
SAMURAI_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "very-easy": (0.0, 1.4, 200),
    "easy":      (1.5, 2.4, 230),
    "medium":    (2.5, 3.9, 260),
    "hard":      (4.0, 5.9, 285),
    "tough":     (6.0, 6.4, 295),
    "expert":    (6.5, 7.9, 305),
    "diabolical":(8.0, 99.9,320),
}


def generate_samurai(
    count: int,
    difficulty: str,
    seed: int,
    bridge: GraderBridge | None = None,
    progress_every: int = 1,
    **_ignored,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in SAMURAI_DIFFICULTY_BANDS:
        raise ValueError(f"unknown samurai band: {difficulty}")
    if bridge is None:
        raise ValueError("bridge is required for samurai generator")
    se_lo, se_hi, max_removals = SAMURAI_DIFFICULTY_BANDS[difficulty]
    rng = random.Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    emitted = 0
    attempts = 0
    consecutive_failures = 0
    while emitted < count:
        attempts += 1
        try:
            solved = bridge.solve_samurai_empty(seed=rng.randint(0, 2**31 - 1))
            dug = dig_samurai(solved, rng, bridge, max_removals)
            result = bridge.grade_samurai(dug)
        except RuntimeError as err:
            consecutive_failures += 1
            if consecutive_failures > 100:
                raise RuntimeError(f"100 consecutive bridge failures: {err}")
            continue
        consecutive_failures = 0
        if not result.get("ok") or not result.get("unique"):
            continue
        se = float(result["se"])
        if difficulty == "diabolical":
            if result.get("techniqueOnly"):
                continue
        else:
            if not result.get("techniqueOnly"):
                continue
        if se < se_lo or se > se_hi:
            continue
        emitted += 1
        if emitted % progress_every == 0 or emitted == count:
            print(
                f"  [samurai/{difficulty}] {emitted}/{count} "
                f"(attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"samurai-{difficulty}-{seed}-{emitted:04d}",
            variant="samurai",
            size=9,
            givens="",
            samurai_givens=tuple(dug),
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
```

- [ ] **Step 5: Run the generator tests**

Run: `cd gen && .venv/bin/python -m pytest tests/test_samurai.py -v 2>&1 | tail -20`
Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add gen/src/generator/classic.py gen/src/generator/samurai.py gen/tests/test_samurai.py
git commit -m "feat(gen): samurai generator + GeneratedPuzzle.samurai_givens

generate_samurai pipelines bridge.solve_samurai_empty → dig_samurai →
bridge.grade_samurai → SE-band filter. Diabolical requires techniqueOnly
== False (samurai's only path to SE=9 in 17a). GeneratedPuzzle gains
optional samurai_givens; to_dict writes it as samuraiGivens. write_bank
gains append: bool for the followup script."
```

---

## Task 6: Registry + CLI `--append`

Wire samurai into the variant registry. Add a `--append` flag to the `gen` command.

**Files:**
- Modify: `gen/src/generator/registry.py`
- Modify: `gen/src/generator/cli.py`

- [ ] **Step 1: Register samurai in `gen/src/generator/registry.py`**

Open the file. Add an import at the top (after the existing `from .renban import ...`):

```python
from .samurai import SAMURAI_DIFFICULTY_BANDS, generate_samurai
```

Find the `REGISTRY` dict (around line 47) and add `"samurai": generate_samurai,` as the last entry:

```python
REGISTRY: dict[str, GeneratorFn] = {
    # ... all existing entries ...
    "german-whispers": generate_german_whispers,
    "samurai": generate_samurai,
}
```

Find the `BANDS_BY_VARIANT` dict and add `"samurai": SAMURAI_DIFFICULTY_BANDS,` as the last entry similarly.

- [ ] **Step 2: Add `--append` to the gen CLI**

Open `gen/src/generator/cli.py`. Find the `gen` command (decorated with `@cli.command()`, around line 20). Add a new option BEFORE `def gen(...)`:

```python
@click.option(
    "--append",
    is_flag=True,
    help="Append to existing JSONL output instead of truncating.",
)
```

Update the function signature to accept it:

```python
def gen(
    variant: str,
    count: int,
    difficulty: str | None,
    all_bands: bool,
    seed: int,
    out: Path | None,
    out_dir: Path | None,
    append: bool,
) -> None:
```

In the function body, find the `with GraderBridge() as grader:` block in the single-band path (the second `with` block, around line 78). Change:

```python
        emitted = write_bank(
            out,
            generator(count=count, difficulty=difficulty, seed=seed, grader=grader),
        )
```

to:

```python
        emitted = write_bank(
            out,
            generator(count=count, difficulty=difficulty, seed=seed, grader=grader),
            append=append,
        )
```

For the `all_bands` path, also pass `append=append`:

```python
                emitted = write_bank(
                    path,
                    generator(count=count, difficulty=band, seed=seed, grader=grader),
                    append=append,
                )
```

- [ ] **Step 3: Smoke-test the CLI accepts `samurai` as a variant**

Run: `cd gen && .venv/bin/python -m generator gen --help 2>&1 | head -20`
Expected: includes `--append` in the options.

Run: `cd gen && .venv/bin/python -m generator gen samurai --help 2>&1 | head -10` (or pass `-n 1 -d easy --out /tmp/test.jsonl` if `--help` doesn't list the variant)

Actually, the CLI uses a `click.argument("variant")` so `--help` for the variant doesn't apply per-variant. Instead just confirm the listing:

Run: `cd gen && .venv/bin/python -c "from generator.registry import list_variants; print(list_variants())"`
Expected: output includes `'samurai'`.

- [ ] **Step 4: Quick generator smoke (1 puzzle, easy band)**

This actually invokes the full pipeline end-to-end. May take 30–90 seconds.

```bash
cd gen
mkdir -p out/samurai
PYTHONPATH=src .venv/bin/python -m generator gen samurai -n 1 -d easy --out out/samurai/easy.jsonl --seed 99
```

Expected: writes one JSON object to `out/samurai/easy.jsonl`. Print line confirms `[samurai/easy] 1/1`.

- [ ] **Step 5: Verify the JSONL output is valid**

```bash
.venv/bin/python -c "
import json
with open('out/samurai/easy.jsonl') as f:
    for line in f:
        rec = json.loads(line)
        assert rec['variant'] == 'samurai'
        assert len(rec['samuraiGivens']) == 5
        for s in rec['samuraiGivens']:
            assert len(s) == 81
        print(f\"OK: {rec['id']} SE={rec['se']}\")
"
```

Expected: prints `OK: samurai-easy-99-0001 SE=<some number between 1.5 and 2.4>`.

- [ ] **Step 6: Clean up the smoke output**

```bash
rm gen/out/samurai/easy.jsonl
```

- [ ] **Step 7: Commit**

```bash
git add gen/src/generator/registry.py gen/src/generator/cli.py
git commit -m "feat(gen): register samurai generator + add --append flag

samurai is now a valid argument to 'python -m generator gen'.
--append opens output JSONL in append mode (used by the followup
script to resume bank generation without rewriting prior emits)."
```

---

## Task 7: Starter bank script + run + commit banks

Run the starter script. Promote into `src/puzzles/samurai/`. Commit the generated banks.

**Files:**
- Create: `gen/scripts/phase17_banks.sh`
- Create (via promote): `src/puzzles/samurai/{very-easy,easy,medium,hard,tough,expert,diabolical}.json`
- Delete: existing `src/puzzles/samurai/easy.json` (hand-crafted demo, will be overwritten by promote)
- Modify: `.gitignore` (add `gen/out/` if not already)

- [ ] **Step 1: Check `.gitignore` for `gen/out/`**

```bash
grep -n "gen/out" .gitignore
```

If absent, append:

```bash
echo "gen/out/" >> .gitignore
```

- [ ] **Step 2: Create `gen/scripts/phase17_banks.sh`**

```bash
#!/usr/bin/env bash
# Phase 17c starter banks: 5 puzzles per band × 7 bands.
# Synchronous run. Total time ~5-30 minutes depending on band acceptance.
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

mkdir -p out/samurai logs
: > logs/phase17-starter.log

run() {
  local band=$1
  local seed=$2
  echo "=== samurai / $band (n=5 seed=$seed) ===" | tee -a logs/phase17-starter.log
  $PYTHON -u -m generator gen samurai -n 5 -d "$band" \
    --out "out/samurai/$band.jsonl" --seed "$seed" 2>&1 | tee -a logs/phase17-starter.log
}

run very-easy  30
run easy       31
run medium     32
run hard       33
run tough      34
run expert     35
run diabolical 36

$PYTHON -m generator promote --src out/samurai --dest ../src/puzzles/samurai 2>&1 | tee -a logs/phase17-starter.log

echo "PHASE17_STARTER_DONE" | tee -a logs/phase17-starter.log
```

Make executable:

```bash
chmod +x gen/scripts/phase17_banks.sh
```

- [ ] **Step 3: Run the starter (this is the long step)**

```bash
bash gen/scripts/phase17_banks.sh
```

Expected: 5–30 minutes runtime. Final output `PHASE17_STARTER_DONE`. Inspect `gen/logs/phase17-starter.log` if anything looks wrong.

If a higher band stalls (no acceptance within several minutes), you may need to bump `max_removals` LOWER in `gen/src/generator/samurai.py` for that band — too aggressive a removal target produces non-unique boards. Note this as a follow-up in your status report rather than blocking.

- [ ] **Step 4: Verify all 7 starter banks promoted**

```bash
ls src/puzzles/samurai/
```

Expected: 7 files — `very-easy.json`, `easy.json`, `medium.json`, `hard.json`, `tough.json`, `expert.json`, `diabolical.json`. The OLD demo `easy.json` is now overwritten with real records.

If any band file is missing (because the band failed to emit), STOP and report. Skipping this gate would silently break `pickPuzzle('samurai', '<missing band>', ...)` at runtime.

- [ ] **Step 5: Verify a couple of generated puzzles load correctly**

```bash
.venv/bin/python -c "
import json
for band in ['easy', 'medium', 'hard']:
    with open(f'src/puzzles/samurai/{band}.json') as f:
        recs = json.load(f)
    assert len(recs) >= 5, f'{band} has only {len(recs)} records'
    for rec in recs:
        assert rec['variant'] == 'samurai'
        assert len(rec['samuraiGivens']) == 5
        for s in rec['samuraiGivens']:
            assert len(s) == 81
    print(f'OK {band}: {len(recs)} records, SE range {min(r[\"se\"] for r in recs):.1f}-{max(r[\"se\"] for r in recs):.1f}')
"
```

- [ ] **Step 6: Run the existing Vitest suite to confirm banks load without errors**

Run: `bun run test:run src/puzzles src/state src/ui && bun run build`
Expected: typecheck + tests + build all clean. The runtime bank validation accepts the new records (their shape was set by 17b Task 4).

- [ ] **Step 7: Commit**

```bash
git add gen/scripts/phase17_banks.sh .gitignore src/puzzles/samurai/*.json
git commit -m "feat(puzzles): generated samurai starter banks (5 puzzles × 7 bands)

Replaces the hand-crafted demo with bank output from
gen/scripts/phase17_banks.sh. Includes very-easy/easy/medium/hard/tough/
expert/diabolical bands with ≥5 records each. Followup script will
fill banks toward 50/50/50/30/20/15/10 in the background."
```

---

## Task 8: Followup bank script

Background-friendly script that appends to the starter JSONL files and re-promotes.

**Files:**
- Create: `gen/scripts/phase17_banks_followup.sh`

- [ ] **Step 1: Create the script**

```bash
#!/usr/bin/env bash
# Phase 17c follow-up: fill banks to target counts. Appends to existing
# JSONLs from the starter run so a Ctrl-C-interrupted session leaves
# earlier output intact.
#
# Targets minus starter (5 already in each):
#   very-easy: 50 → +45
#   easy:      50 → +45
#   medium:    50 → +45
#   hard:      30 → +25
#   tough:     20 → +15
#   expert:    15 → +10
#   diabolical:10 → +5
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

mkdir -p out/samurai logs
: > logs/phase17-followup.log

run() {
  local band=$1
  local n=$2
  local seed=$3
  echo "=== samurai / $band (n=$n seed=$seed) ===" | tee -a logs/phase17-followup.log
  $PYTHON -u -m generator gen samurai -n "$n" -d "$band" \
    --out "out/samurai/$band.jsonl" --append --seed "$seed" 2>&1 | tee -a logs/phase17-followup.log
}

run very-easy  45 40
run easy       45 41
run medium     45 42
run hard       25 43
run tough      15 44
run expert     10 45
run diabolical  5 46

$PYTHON -m generator promote --src out/samurai --dest ../src/puzzles/samurai 2>&1 | tee -a logs/phase17-followup.log

echo "PHASE17_FOLLOWUP_DONE" | tee -a logs/phase17-followup.log
```

Make executable:

```bash
chmod +x gen/scripts/phase17_banks_followup.sh
```

- [ ] **Step 2: Smoke-test the followup with `-n 1` patch**

Don't run the full followup — that's many hours. Instead, verify the `--append` flag works:

```bash
cd gen
PYTHONPATH=src .venv/bin/python -m generator gen samurai -n 1 -d easy --out out/samurai/easy.jsonl --append --seed 99
wc -l out/samurai/easy.jsonl
```

Expected: line count goes UP by 1 (vs. before the smoke run, which had 5 lines). If it went to 1, `--append` didn't work; review Task 6 Step 2 again.

- [ ] **Step 3: Revert the smoke append**

```bash
head -n 5 gen/out/samurai/easy.jsonl > gen/out/samurai/easy.jsonl.tmp
mv gen/out/samurai/easy.jsonl.tmp gen/out/samurai/easy.jsonl
.venv/bin/python -m generator promote --src out/samurai --dest ../src/puzzles/samurai
```

Verify `src/puzzles/samurai/easy.json` is back to 5 records:

```bash
.venv/bin/python -c "import json; print(len(json.load(open('src/puzzles/samurai/easy.json'))))"
```

Expected: `5`.

- [ ] **Step 4: Commit**

```bash
git add gen/scripts/phase17_banks_followup.sh
git commit -m "feat(gen): phase 17c followup script

Runs in background after 17c ships. Appends to starter JSONLs so
banks fill incrementally; promotes the cumulative bank into the
runtime JSON each pass. Targets minus starter: 45/45/45/25/15/10/5."
```

---

## Task 9: e2e samurai real-bank tests

Two new Playwright cases on the iPad device profile. Verify the rendered cruciform now has visible givens (proving the runtime loaded a real bank, not the demo) and that given cells reject user input.

**Files:**
- Modify: `e2e/samurai.spec.ts`

- [ ] **Step 1: Append the new cases**

Open `e2e/samurai.spec.ts`. Append BEFORE the last closing line (the file currently ends with a screenshot test):

```ts
test('real bank puzzle shows visible given cells', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const givens = await page.locator('[data-given="true"]').count()
  expect(givens).toBeGreaterThan(50)
})

test('given cell rejects user input', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const givenCell = page.locator('[data-given="true"]').first()
  const labelBefore = await givenCell.getAttribute('aria-label')
  await givenCell.click()
  await page.keyboard.press('9')
  await expect(givenCell).toHaveAttribute('aria-label', labelBefore!)
})
```

- [ ] **Step 2: Run the e2e samurai suite**

```bash
LOGIKKU_E2E_PORT=5180 LOGIKKU_E2E_URL=http://localhost:5180 bunx playwright test --project=ipad e2e/samurai.spec.ts 2>&1 | tail -20
```

Expected: 11/11 tests pass on the iPad device. The 2 new cases verify the bank wiring; the existing 9 still cover the cruciform UI.

If a given cell isn't found at all (`page.locator('[data-given="true"]').first()` returns nothing), it means the runtime bank didn't load properly — investigate Task 7 first.

- [ ] **Step 3: Commit**

```bash
git add e2e/samurai.spec.ts
git commit -m "test(e2e): samurai real-bank coverage

Two iPad e2e cases verifying the generated bank loads correctly:
- visible givens count (>50 across the cruciform)
- given cell rejects user keyboard input"
```

---

## Task 10: Verification gate + GOTCHAS + tag

Final sweep + Phase 17c entry in `docs/GOTCHAS.md` + tag.

**Files:**
- Modify: `docs/GOTCHAS.md`

- [ ] **Step 1: Run every gate**

```bash
bun run typecheck
bun run lint
bun run test:run
bun run build
cd gen && .venv/bin/python -m pytest tests/ -q
cd ..
LOGIKKU_E2E_PORT=5180 LOGIKKU_E2E_URL=http://localhost:5180 bunx playwright test --project=ipad e2e/samurai.spec.ts
```

Expected: all green. Vitest count should be ~410 (≈ 400 from 17b + ≈6 new tools/grade + ≈4 samuraiSolver randomization tests). Python pytest: passes including the slow samurai bridge tests.

- [ ] **Step 2: Append Phase 17c entry to `docs/GOTCHAS.md`**

Append AT THE BOTTOM (use 2026-05-20 as the date):

```markdown
## 2026-05-20 — Phase 17c samurai generator + banks

**Randomization is opt-in in the samurai backtracker.** Default behavior is unchanged from 17a — `samuraiBacktrackingSolve(board, { maxSolutions: 2 })` still picks values in `1..9` order. Pass `randomized: true, seed: N` to shuffle. Same seed always produces the same board (mulberry32). Used by the Python generator to source independent solved boards per attempt.

**`solvedBoard` is only present when `maxSolutions === 1`.** When the caller wants 2 solutions to test uniqueness, none is "the" solution — the result returns `solutions: [a, b]` with no `solvedBoard`. The bridge solve action explicitly sets `maxSolutions: 1` so this is non-issue in practice.

**`tools/grade.ts` protocol is additive.** The legacy bare-string and tab-separated payloads still work for classic + variants. New JSON payloads with `variant: 'samurai'` carry `samuraiGivens` (not `puzzle`); new top-level `action: 'solve_samurai_empty'` is a non-grade verb. Existing callers don't change.

**The bridge uses a watchdog timer for samurai.** `samuraiBacktrackingSolve` can in principle run for a long time on pathological boards. The bridge defaults to a 60-second timeout per call (killable via `threading.Timer`) and restarts the bun subprocess after every 1000 samurai calls (down from 3000 for classic). Both tunable via `GraderBridge(restart_every=, grade_timeout_s=)`.

**Digger symmetry is per-sub-grid, not cruciform-wide.** Rotational symmetry pairs `(g, r, c) ↔ (g, 8-r, 8-c)`. Each sub-grid is balanced; the cruciform as a whole is not. Shared cells expand to dig both partners in lockstep (otherwise the engine's `samuraiConsistencyCheck` would fail at load).

**`SAMURAI_DIFFICULTY_BANDS.max_removals` runs from 200 (very-easy) to 320 (diabolical) out of 405 total cells.** Empirically tuned during the starter run. If a band stalls (acceptance < 1% per minute), bump `max_removals` DOWN to leave more givens — too-aggressive removal produces non-unique boards.

**Diabolical band requires `techniqueOnly === false`.** Other bands require `techniqueOnly === true`. This matches 17a's `gradeSamurai` which only returns SE=9.0 when technique-solve fails — the diabolical signal.

**Starter bank vs. followup.** `gen/scripts/phase17_banks.sh` ships 5/band × 7 bands committed. `gen/scripts/phase17_banks_followup.sh` runs in background (Phase 16 pattern) to fill banks toward 225 total. Followup uses `--append` so a Ctrl-C-interrupted session leaves prior emits intact.

**`max_removals` tuning followups.** If the followup yields too few diabolical/expert puzzles in a reasonable timeframe, lower max_removals for that band. If the band's SE distribution skews low (most puzzles cluster at the low end of the band), bump max_removals UP. Update the per-band tuple in `gen/src/generator/samurai.py` and re-run.

**Demo `easy.json` from 17b is gone.** The starter bank overwrites it with generated puzzles. The test helper `src/puzzles/samurai-test-helpers.ts` stays — it's used by `src/puzzles/samurai.test.ts` to verify the bank's overlap consistency.

**Pencil mode is still a no-op on samurai (17b).** Real banks don't change this. Implementing pencil marks for samurai cells is post-17c work.
```

- [ ] **Step 3: Commit**

```bash
git add docs/GOTCHAS.md
git commit -m "docs(gotchas): Phase 17c samurai generator notes"
```

- [ ] **Step 4: Tag the phase**

```bash
git tag phase-17c
```

(No `git push --tags` — the user manages remotes.)

- [ ] **Step 5: Print final summary**

Run:

```bash
git log --oneline phase-17b..HEAD
bun run test:run 2>&1 | tail -3
ls src/puzzles/samurai/
git rev-parse phase-17c
```

Report:
- Total commits in Phase 17c
- Final vitest count
- Bank files committed
- Phase tag SHA
- Any concerns about the followup script (acceptance rates from the starter logs, max_removals tuning suggestions)

---

## Self-review checklist (planner, not implementer)

**Spec coverage** — every section of `docs/superpowers/specs/2026-05-20-phase-17c-samurai-generator-design.md` mapped to a task:
- `tools/grade.ts` samurai dispatch + solve action: Task 2.
- `samuraiBacktrackingSolve` randomization + solvedBoard: Task 1.
- `grader_bridge.py` extensions: Task 3.
- `samurai_digger.py`: Task 4.
- `samurai.py` + `GeneratedPuzzle` extension: Task 5.
- Registry + CLI `--append`: Task 6.
- Starter banks committed: Task 7.
- Followup script: Task 8.
- e2e additions: Task 9.
- GOTCHAS entry + tag: Task 10.

**Placeholder scan** — no "TBD", "TODO", "implement later", or vague directives. Code blocks complete; commands runnable.

**Type consistency** — verified:
- `SamuraiBacktrackOptions` and `SamuraiBacktrackResult` field names (Task 1) match the consumer at Task 2 (`result.solvedBoard`, options pass `randomized`, `seed`).
- `GraderBridge.grade_samurai`, `solve_samurai_empty` signatures (Task 3) match the digger (Task 4) and generator (Task 5) consumers.
- `SHARED_CELL_MAP`, `_pair_rotational`, `_expand_to_shared`, `dig_samurai` symbols (Task 4) match the generator's imports (Task 5).
- `samurai_givens: tuple[str, ...] | None` (Task 5) matches the `to_dict()` output (`samuraiGivens` JSON key) consumed by `assertRecord` from 17b.

**Test design** — each new file gets a failing test first. Integration smoke is Task 6 Step 4 (real generator end-to-end). The regression sweep in Task 7 Step 6 catches any UI/state breakage from the new bank format.
