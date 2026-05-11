# Gotchas

> Append-only log of pitfalls we've actually hit. Each entry: short title, date, what bit us, the fix.

## Setup

### `--no-src-dir=false` is ambiguous — 2026-05-11
Vite always uses `src/` at root, so the original Next.js-era flag is moot under the current stack.

### Vitest 4 needs `defineConfig` from `vitest/config`, not `vite` — 2026-05-11
Putting a `test` field on a `vite.config.ts` that imports `defineConfig` from `'vite'` fails typecheck:
`Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'.`
Fix: `import { defineConfig } from 'vitest/config'`.

### Vitest picks up Playwright `.spec.ts` files by default — 2026-05-11
Vitest's default include glob is `**/*.{test,spec}.?(c|m)[jt]s?(x)`, which catches `e2e/*.spec.ts`. Playwright's `test()` then errors because it's not running under Playwright. Fix: `test.include` and `test.exclude` in vitest config.

### TS 6 deprecates `baseUrl` — 2026-05-11
`paths` works without `baseUrl` in TS 6 — paths are resolved relative to the tsconfig itself. Just remove `baseUrl`.

---

## Engine

### Techniques must iterate `grid.constraints[*].regions`, never `classicRegions(shape)` — 2026-05-11
For the engine to remain variant-pluggable, technique implementations must walk `grid.constraints[*].regions` (via the `regionsOf(grid)` helper in `_technique.ts`). Hardcoding `classicRegions(shape)` works for Phase 0 but silently breaks once X-Diagonal, Hyper, Jigsaw etc. add their own regions. Caught while writing Hidden Single.

### A technique can short-circuit a later one if fixtures don't isolate the pattern — 2026-05-11
First-match-wins iteration order means a Pointing test that places candidates carelessly may trigger a Row Hidden Single or Naked Pair before Claiming fires. Build fixtures that ONLY admit the pattern under test, even if that means manually erasing candidates in unrelated cells.

### Hidden Subset of size N must filter to digits appearing in 2..N cells — 2026-05-11
Including digits with exactly 1 candidate cell in a region would overlap with `hiddenSingle` (Tier 1). Excluding solved cells (`cell.value !== null`) and digits already placed in the region is also required — `propagate` does not always clear candidates before a technique runs.

### Bilocation graph construction in Simple Coloring — 2026-05-11
The bipartite color trap (two same-color cells share a peer) is impossible *within* the bilocation graph itself (any cycle in a bipartite graph is even). Same-color collisions only happen through non-bilocation peer relations — i.e. two cells in the same row/col/box but in a region where the digit has >2 candidates. Don't try to find the contradiction by re-walking the bilocation edges.

### X-Wing fixture construction — 2026-05-11
Stray candidates placed in cover columns can themselves form a different X-Wing that fires first. Fix: rows you want EXCLUDED from the X-Wing must have either ≥3 candidates for the digit (fail the `cols.length <= size` filter) or exactly 1 candidate (fail the `>= 2` filter).

### Vitest coverage requires `@vitest/coverage-v8` and the Node runtime — 2026-05-11
Running `bun --bun vitest --coverage` reports 0% because Bun's runtime bypasses V8's coverage hooks. Use `bunx vitest run --coverage` (Node runtime) or alias to a separate script. Also: install `@vitest/coverage-v8` as a dev dep — it's not bundled with Vitest 4.

## UI

_(empty)_

## PWA / iPad

_(empty)_

## Generation

_(empty)_
