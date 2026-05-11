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

_(empty)_

## UI

_(empty)_

## PWA / iPad

_(empty)_

## Generation

_(empty)_
