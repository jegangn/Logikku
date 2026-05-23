# Lazy Puzzle-Bank Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop inlining all 96 puzzle banks (~6.5 MB) into the entry chunk by loading banks lazily, shrinking `dist/assets/index-*.js` from ~6.85 MB so the iPad PWA can hit Lighthouse Performance ≥ 80 — while keeping every variant playable offline.

**Architecture:** Switch `src/puzzles/index.ts`'s `import.meta.glob` from eager to lazy. The glob's keys form a synchronous manifest (`listBanks`/`hasBank` unchanged); its values are lazy `import()` loaders that Vite emits as one code-split chunk per bank. `getBank`/`pickPuzzle` become async (load + validate + memoize on first use). The only data consumer, `Play.tsx`, already loads puzzles in an async effect, so the ripple is small. Workbox already precaches `**/*.js`, so the split bank chunks stay cached for offline.

**Tech Stack:** Vite 8, React 19 + TS 6 strict, Vitest 4, vite-plugin-pwa (Workbox), bun.

---

## Conventions for the implementer

- **bun, never npm.** If `bun` isn't found: `export PATH="/c/Users/JeganGN/.bun/bin:$PATH"`.
- TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). No `any`. `as` only where already present (the JSON-shape casts in `validateBank`/`assertRecord` are pre-existing and stay). Path alias `@/*`.
- No comments explaining *what*; only non-obvious *why*.
- `src/engine/` is not touched (purity preserved). `src/puzzles/` is allowed to be async.
- Vitest applies the Vite config, so `import.meta.glob` behaves the same in tests as in build.

## File structure

**Modify**
- `src/puzzles/index.ts` — non-eager glob; sync manifest + sync `listBanks`/`hasBank`; async `getBank`/`pickPuzzle` with a validated-bank cache. `parseKey`, `validateBank`, `assertRecord`, `BankKey`, and the re-exports stay unchanged.
- `src/puzzles/index.test.ts` — `await` the now-async data accessors; add an async-signature test and a sync-manifest test.
- `src/ui/pages/Play.tsx` — `await pickPuzzle(...)` in the `go()` effect and in `handleNew`.

**Unchanged (verify, don't edit):** `src/ui/pages/Home.tsx` (`listBanks`), `src/ui/components/DifficultyPicker.tsx` (`hasBank`), `vite.config.ts` (workbox `globPatterns` already includes `**/*.js`).

---

## Task 1: Lazy loader module + consumer + tests (atomic)

This is one atomic task because making `getBank`/`pickPuzzle` async changes their signatures, which would break `Play.tsx`'s typecheck if done separately. Doing the module, its sole data-consumer, and its tests together keeps every gate green at the single commit.

**Files:**
- Modify: `src/puzzles/index.ts`
- Modify: `src/puzzles/index.test.ts`
- Modify: `src/ui/pages/Play.tsx`

- [ ] **Step 1: Write the failing async-signature test**

In `src/puzzles/index.test.ts`, add these two tests inside the `describe('puzzles index', ...)` block (e.g. right after the existing `'discovers at least one variant…'` test):

```ts
  it('getBank is async (returns a Promise) — banks load lazily', async () => {
    const result = getBank('classic', 'easy')
    expect(result).toBeInstanceOf(Promise)
    await result
  })

  it('listBanks and hasBank are synchronous (manifest needs no bank data)', () => {
    expect(listBanks().length).toBeGreaterThan(0)
    expect(hasBank('classic', 'easy')).toBe(true)
    expect(hasBank('does-not-exist', 'easy')).toBe(false)
  })
```

- [ ] **Step 2: Run it to verify the async test fails**

Run: `bun run test:run src/puzzles/index.test.ts`
Expected: FAIL — `getBank is async …` fails because the current `getBank` returns a `PuzzleBank` (array), not a `Promise`. (The sync-manifest test passes on current code; that's fine.)

- [ ] **Step 3: Rewrite the loader internals in `src/puzzles/index.ts`**

Keep the file's `import` lines, the `BankKey` interface, and the `parseKey` function **exactly as they are today** (the regex path-parser is unchanged — do not retype it). Replace ONLY the eager glob declaration and the eager `bankMap()` / `const banks = bankMap()` block with the lazy loaders + manifest below.

Replace the current eager glob:

```ts
const BANK_LOADERS = import.meta.glob<PuzzleBank>('./*/*.json', {
  import: 'default',
})
```

And replace the `bankMap()` function plus the `const banks = bankMap()` line with:

```ts
// Lazy loaders keyed by `${variant}:${difficulty}`. The loader functions are NOT
// invoked at module init, so no bank JSON lands in the entry chunk — each bank is a
// separate code-split chunk fetched on first use.
const loaders = new Map<string, () => Promise<PuzzleBank>>()
const manifest: BankKey[] = []
for (const [path, loader] of Object.entries(BANK_LOADERS)) {
  const key = parseKey(path)
  if (!key) continue
  loaders.set(`${key.variant}:${key.difficulty}`, loader)
  manifest.push(key)
}

const validatedBanks = new Map<string, PuzzleBank>()
```

Leave `validateBank` and `assertRecord` exactly as they are (bodies unchanged). Their only difference now is that they run per-bank on first load instead of for all banks at startup.

- [ ] **Step 4: Replace the accessor functions in `src/puzzles/index.ts`**

Replace the existing `getBank`, `hasBank`, `listBanks`, and `pickPuzzle` exports with:

```ts
export function listBanks(): ReadonlyArray<BankKey> {
  return manifest
}

export function hasBank(variant: string, difficulty: Difficulty): boolean {
  return loaders.has(`${variant}:${difficulty}`)
}

export async function getBank(
  variant: string,
  difficulty: Difficulty,
): Promise<PuzzleBank> {
  const id = `${variant}:${difficulty}`
  const cached = validatedBanks.get(id)
  if (cached) return cached
  const loader = loaders.get(id)
  if (!loader) {
    throw new Error(`no bank found for ${variant}/${difficulty}`)
  }
  const bank = validateBank(await loader(), { variant, difficulty })
  validatedBanks.set(id, bank)
  return bank
}

export async function pickPuzzle(
  variant: string,
  difficulty: Difficulty,
  seed: number,
): Promise<PuzzleRecord> {
  const bank = await getBank(variant, difficulty)
  if (bank.length === 0) {
    throw new Error(`empty bank for ${variant}/${difficulty}`)
  }
  const index = ((seed | 0) % bank.length + bank.length) % bank.length
  return bank[index]!
}
```

Keep the final `export type { PuzzleBank, PuzzleRecord } from './types'` line. Note `validateBank(records: unknown, key)` already accepts `unknown`, so passing the loaded value is fine.

- [ ] **Step 5: Update the existing tests to await the async accessors**

In `src/puzzles/index.test.ts`, the data-access tests must `await`. Apply these changes (the `listBanks`-only tests stay synchronous and unchanged):

```ts
  it.each(DIFFICULTIES)('classic/%s bank has ≥100 unique puzzles when present', async (difficulty) => {
    if (!hasBank('classic', difficulty)) return
    const bank = await getBank('classic', difficulty)
    expect(bank.length).toBeGreaterThanOrEqual(100)
    const ids = new Set(bank.map((p) => p.id))
    expect(ids.size).toBe(bank.length)
    const givens = new Set(bank.map((p) => p.givens))
    expect(givens.size).toBe(bank.length)
  })

  it.each(DIFFICULTIES)('classic/%s records have valid shape', async (difficulty) => {
    if (!hasBank('classic', difficulty)) return
    const bank = await getBank('classic', difficulty)
    for (const p of bank.slice(0, 5)) {
      expect(p.size).toBe(9)
      expect(p.variant).toBe('classic')
      expect(p.givens).toHaveLength(81)
      expect(p.difficulty).toBe(difficulty)
      expect(p.hardestTier).toBeGreaterThanOrEqual(1)
      expect(p.steps).toBeGreaterThanOrEqual(0)
    }
  })

  it('sampled puzzles re-grade to their declared difficulty band', async () => {
    if (!hasBank('classic', 'easy')) return
    const bank = await getBank('classic', 'easy')
    const sample = bank.slice(0, 3)
    for (const record of sample) {
      const constraint = createClassicConstraint({ shape: CLASSIC_9 })
      const grid = { ...parsePuzzle(record.givens, CLASSIC_9), constraints: [constraint] }
      const result = gradePuzzle(grid)
      expect(result.difficulty).toBe(record.difficulty)
    }
  })

  it('pickPuzzle deterministically selects by seed', async () => {
    if (!hasBank('classic', 'easy')) return
    const a = await pickPuzzle('classic', 'easy', 7)
    const b = await pickPuzzle('classic', 'easy', 7)
    expect(a).toBe(b)
  })
```

(`pickPuzzle … deterministically` still passes: `getBank` memoizes the bank, so the same record reference returns → `toBe` holds.)

- [ ] **Step 6: Run the puzzle tests to verify they pass**

Run: `bun run test:run src/puzzles/index.test.ts`
Expected: PASS — the new `getBank is async` test now green, all awaited tests green.

- [ ] **Step 7: Update `Play.tsx` call sites to await `pickPuzzle`**

In `src/ui/pages/Play.tsx` there are exactly two `pickPuzzle` calls.

(a) Inside the async `go()` function in the puzzle-loading `useEffect`, change:

```ts
      const next = pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
```

to:

```ts
      const next = await pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
```

(b) `handleNew` is a synchronous `useCallback`. Wrap its body in an async IIFE so it can await. Replace the entire current `handleNew` definition:

```ts
  const handleNew = useCallback(() => {
    const next = pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
    loadPuzzle({
      id: next.id,
      variant,
      difficulty,
      givens: next.givens,
      ...(next.regions ? { regions: next.regions } : {}),
      ...(next.parityMask ? { parityMask: next.parityMask } : {}),
      ...(next.edges
        ? { edges: next.edges as ReadonlyArray<EdgeMarkRecord> }
        : {}),
      ...(next.thermometers ? { thermometers: next.thermometers } : {}),
      ...(next.arrows ? { arrows: next.arrows } : {}),
      ...(next.cages ? { cages: next.cages } : {}),
      ...(next.littleKillerClues
        ? { littleKillerClues: next.littleKillerClues }
        : {}),
      ...(next.sandwichClues ? { sandwichClues: next.sandwichClues } : {}),
      ...(next.skyscraperClues
        ? { skyscraperClues: next.skyscraperClues }
        : {}),
      ...(next.paths ? { paths: next.paths } : {}),
      ...(next.samuraiGivens ? { samuraiGivens: next.samuraiGivens } : {}),
    })
    setParams({ variant, difficulty, puzzleId: next.id }, { replace: true })
  }, [variant, difficulty, loadPuzzle, setParams])
```

with this async-IIFE version:

```ts
  const handleNew = useCallback(() => {
    void (async () => {
      const next = await pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
      loadPuzzle({
        id: next.id,
        variant,
        difficulty,
        givens: next.givens,
        ...(next.regions ? { regions: next.regions } : {}),
        ...(next.parityMask ? { parityMask: next.parityMask } : {}),
        ...(next.edges
          ? { edges: next.edges as ReadonlyArray<EdgeMarkRecord> }
          : {}),
        ...(next.thermometers ? { thermometers: next.thermometers } : {}),
        ...(next.arrows ? { arrows: next.arrows } : {}),
        ...(next.cages ? { cages: next.cages } : {}),
        ...(next.littleKillerClues
          ? { littleKillerClues: next.littleKillerClues }
          : {}),
        ...(next.sandwichClues ? { sandwichClues: next.sandwichClues } : {}),
        ...(next.skyscraperClues
          ? { skyscraperClues: next.skyscraperClues }
          : {}),
        ...(next.paths ? { paths: next.paths } : {}),
        ...(next.samuraiGivens ? { samuraiGivens: next.samuraiGivens } : {}),
      })
      setParams({ variant, difficulty, puzzleId: next.id }, { replace: true })
    })()
  }, [variant, difficulty, loadPuzzle, setParams])
```

- [ ] **Step 8: Verify all gates green**

Run each and confirm clean:
- `bun run typecheck` → no errors (proves `Play.tsx` correctly awaits the now-async `pickPuzzle`).
- `bun run lint` → no errors/warnings.
- `bun run test:run` → all pass (baseline 510; the two new puzzle tests bring it to ~512).

- [ ] **Step 9: Commit**

```bash
git add src/puzzles/index.ts src/puzzles/index.test.ts src/ui/pages/Play.tsx
git commit -m "perf(puzzles): load banks lazily (sync manifest + async getBank/pickPuzzle)"
```

---

## Task 2: Build verification — entry chunk shrinks, banks split, offline preserved

**Files:** none (verification only; commit only if a fix was needed).

- [ ] **Step 1: Production build**

Run: `bun run build`
Expected: `tsc -b` clean + `vite build` succeeds. The previous
`(!) Some chunks are larger than 500 kB` warning for the entry chunk should **no
longer fire** (banks are no longer in `index-*.js`). The PWA summary should report
**more precache entries** than the previous 46 (≈ 46 + 96 bank chunks).

- [ ] **Step 2: Confirm the entry chunk is meaningfully smaller and banks are split**

Run:
```bash
echo "--- entry chunk ---"
ls -l dist/assets/index-*.js | awk '{printf "%.1f KB  %s\n", $5/1024, $9}'
echo "--- number of JS chunks ---"
ls -1 dist/assets/*.js | wc -l
echo "--- five largest JS chunks ---"
ls -l dist/assets/*.js | awk '{printf "%.1f KB  %s\n", $5/1024, $9}' | sort -rn | head -5
```
Expected: `index-*.js` is **well under 1 MB** (down from ~6.85 MB); there are ~96
additional bank chunks; the largest chunk is roughly the largest bank (~314 KB
source).

- [ ] **Step 3: Confirm the service worker still precaches the bank chunks (offline preserved)**

Inspect the `precache N entries` line printed by Step 1's build, or run:
```bash
grep -oE "precache [0-9]+ entries" dist/sw.js || true
```
Expected: the precache count is ~46 + ~96 ≈ 140+ entries — the split bank chunks are
included, so every variant is cached for offline play after first load.

- [ ] **Step 4: Re-confirm the unit suite once more (sanity)**

Run: `bun run test:run`
Expected: all pass (~512).

- [ ] **Step 5: Commit only if a fix was required**

If Steps 1–3 surfaced a problem (e.g. a bank chunk not precached, or the entry chunk
still huge) and you had to change config/code to fix it:

```bash
git add -A
git commit -m "perf(puzzles): build-verification fixes for lazy banks"
```

If everything was green with nothing to change, skip this commit.

---

## After all tasks

Use **superpowers:finishing-a-development-branch** to complete (verify tests, then
merge `perf-lazy-puzzle-banks` → `main`). Report the before/after entry-chunk size.
