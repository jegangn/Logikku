# Lazy Puzzle-Bank Loading (Design)

**Date:** 2026-05-23
**Status:** Approved
**Origin:** Phase 20 follow-up — `dist/assets/index-*.js` is ~6.85 MB (759 KB gzip),
tripping Vite's 500 KB warning and threatening the Lighthouse Performance ≥ 80
launch criterion on the iPad PWA.

## Problem

`src/puzzles/index.ts` loads every puzzle bank eagerly:

```ts
const BANKS = import.meta.glob<PuzzleBank>('./*/*.json', { eager: true, import: 'default' })
const banks = bankMap() // validates ALL banks at module-eval time
```

This inlines all **96 JSON banks (~6.5 MB)** into the entry chunk and validates them
on startup. The entry chunk is therefore parsed and executed on the main thread
before the app is interactive — exactly what hurts Lighthouse TBT/TTI/Performance.

But only one consumer needs bank *data*:

| Consumer | API used | Needs |
|---|---|---|
| `src/ui/pages/Home.tsx` | `listBanks()` | which banks exist (keys) |
| `src/ui/components/DifficultyPicker.tsx` | `hasBank(variant, difficulty)` | existence (keys) |
| `src/ui/pages/Play.tsx` | `pickPuzzle(variant, difficulty, seed)` | the actual bank data |

`listBanks`/`hasBank` need only a manifest of keys; `pickPuzzle` needs data, and it
already runs inside an async effect with a loading state (`t.play.loading`).

## Approach (chosen): manifest + lazy banks

Switch the glob to **non-eager**. Its keys form a synchronous manifest; its values
are `() => import()` loaders that Vite emits as one code-split chunk per bank.

- **Sync manifest** (zero data loaded) powers `listBanks()` and `hasBank()` — their
  signatures are unchanged.
- **`getBank()` and `pickPuzzle()` become `async`** — they invoke the per-bank
  loader, run the existing validation on first load, and memoize the validated bank
  in an in-memory `Map` so repeat plays of the same variant don't re-import or
  re-validate.

### Rejected alternatives

- **Hand-written per-variant dynamic-import map** — same effect, more boilerplate,
  not DRY versus the glob. Rejected.
- **Drop precaching; cache banks at first play** — smaller SW install, but a variant
  never opened online would not work offline, violating the non-negotiable "the app
  must work fully offline after first load" (all 23 variants). Rejected.

## Module design — `src/puzzles/index.ts`

```ts
const BANK_LOADERS = import.meta.glob<PuzzleBank>('./*/*.json', { import: 'default' })
// Record<path, () => Promise<PuzzleBank>>  — loaders are NOT called at module init
```

- `parseKey(path)` — unchanged; build a manifest of `BankKey` from `Object.keys(BANK_LOADERS)`.
- `listBanks(): ReadonlyArray<BankKey>` — sync, derived from keys. **Unchanged signature.**
- `hasBank(variant, difficulty): boolean` — sync, key lookup. **Unchanged signature.**
- `getBank(variant, difficulty): Promise<PuzzleBank>` — **async.** Look up the loader
  by `variant:difficulty`; throw `no bank found for …` if absent (preserves current
  behavior); `await loader()`; on first load run `validateBank` (existing logic) and
  store in a module-level `Map<string, PuzzleBank>` cache; return the cached bank on
  subsequent calls.
- `pickPuzzle(variant, difficulty, seed): Promise<PuzzleRecord>` — **async.**
  `const bank = await getBank(...)`; same empty-bank guard and deterministic
  seed-indexing as today.
- `validateBank`/`assertRecord` — unchanged logic, now invoked per-bank on first load
  instead of for all banks at startup.

The `validateBank` no-longer-eager change means a malformed bank surfaces when that
variant is first played, not at app startup. Acceptable: banks are committed,
generated offline by Z3, and the per-bank validation still runs before use.

## Call-site changes

- **`src/ui/pages/Play.tsx`** — two spots:
  - The `go()` effect already `await`s `tryHydrate`; change to `const next = await pickPuzzle(...)`.
  - `handleNew` (a `useCallback`) currently calls `pickPuzzle` synchronously; wrap the
    body in an async IIFE / inner async function and `await pickPuzzle(...)` before
    `loadPuzzle`. No UX change — `loadPuzzle` runs after the (fast, cached-after-first)
    bank resolves.
- **`src/ui/pages/Home.tsx`** — unchanged.
- **`src/ui/components/DifficultyPicker.tsx`** — unchanged.

`src/engine/` is untouched — purity preserved (the puzzles module is not engine code).

## PWA / offline

- `vite.config.ts` workbox `globPatterns` already includes `**/*.js`. Vite compiles
  JSON dynamic imports into `.js` chunks, so the per-bank chunks are **still
  precached** by `generateSW` → every variant remains available offline after first
  load. No globPatterns change required; verify the precache manifest entry count
  rises by ~96.
- `maximumFileSizeToCacheInBytes` (8 MB) remains ample (largest bank ≈ 314 KB).
- The default `chunkSizeWarningLimit` warning should disappear once the entry chunk
  no longer contains the banks. If a stray warning remains, prefer fixing chunking
  over raising the limit.

## Testing

- **`src/puzzles/index.test.ts`** — update `getBank`/`pickPuzzle` call sites to
  `await`; keep all existing assertions (counts, uniqueness, shape, re-grade,
  deterministic seed). Add one test asserting `listBanks()`/`hasBank()` return
  correct results **without** awaiting (manifest is synchronous).
- Existing Play integration/E2E remain valid (puzzle load was already async).
- **Gates:** `bun run typecheck`, `bun run lint`, `bun run test:run`, `bun run build`
  all green.

## Acceptance criteria

- Entry chunk (`dist/assets/index-*.js`) is **meaningfully smaller** — target well
  under 1 MB (from 6.85 MB); puzzle banks emitted as separate chunks.
- Vite's >500 KB chunk warning no longer fires for the entry chunk.
- `dist` still emits per-bank chunks and the service worker precaches them (offline
  preserved).
- All gates green; no behavior change visible to the player beyond the existing
  loading state.

## Out of scope

- Reducing total offline cache size (would break the all-variants-offline guarantee).
- Changing puzzle-bank content, the generator, or the engine.
- Route-level code-splitting of UI pages (separate optimization if ever needed).
