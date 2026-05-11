# CLAUDE.md — Logikku Project Bible

> **Scope:** This file is the source of truth for any AI agent working on Logikku. It overrides defaults but is overridden by user instructions in chat.

## Identity

**Logikku** is an offline-first Sudoku PWA supporting 23 variants. Distributed as a web app (Safari "Add to Home Screen" on iPad); App Store wrap via Capacitor deferred to Phase 21. Primary target device: iPad. Primary user persona: non-technical, older. UI must be calm, large-touch, never beep at the user.

## Non-negotiables

- **No backend, no auth, no Supabase, no telemetry, no analytics, no third-party scripts at runtime.** Zero data collection. The app must work fully offline after first load.
- **Engine layer is pure.** `src/engine/` contains no React, no DOM, no browser globals — testable in Node via Vitest. UI consumes the engine through Zustand stores.
- **Variable grid size from day one.** 6×6, 9×9, 16×16 (and Samurai's overlap topology) are type-parametric. No hardcoded `9`s in engine code.
- **Constraint-pluggable engine.** Every variant = a list of `Constraint` objects against a base grid. Adding a variant = new `Constraint` subclass + UI overlay + generator entry. No engine rewrites per variant.
- **Pre-generated puzzle banks, committed to the repo.** Generation is offline (Python + Z3). The app never generates puzzles at runtime.
- **Privacy.** No analytics, no Sentry, no crash reporting, no Google Fonts (self-host).

## Stack (locked)

| Layer | Choice |
|---|---|
| Build | Vite 8 |
| UI | React 19 + TypeScript 6 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| State | Zustand 5 |
| Storage | IndexedDB via `idb` 8 |
| Routing | React Router 7 |
| PWA | `vite-plugin-pwa` (Workbox, autoUpdate) |
| Unit tests | Vitest 4 + happy-dom + @testing-library/react |
| E2E | Playwright (Chromium + `iPad (gen 7)` device profile) |
| Package manager | bun |
| Deploy | Vercel (static) |
| Generator | Python + Z3 (separate `gen/` directory, not in app bundle) |
| App Store wrap (Phase 21) | Capacitor → iPadOS |

## Variant scope (23)

Classic, X/Diagonal, Hyper/Windoku, Anti-Knight, Anti-King, Non-Consecutive, Jigsaw, Even-Odd, Mini 6×6, Kropki, XV, Greater Than, Thermometer, Arrow, Killer, Little Killer, Sandwich, Skyscraper, Palindrome, Renban, German Whispers, Mega 16×16, Samurai. See `docs/VARIANTS.md` for rules per variant.

## Repo layout

```
src/
  engine/          # pure TS — types, constraints, solver, grader. No React.
    types.ts       # Grid<N>, Cell, Coord, Region, Constraint
    constraints/   # one file per variant constraint type
    solver/        # technique-based + Z3-style backtrack
    grader/        # SE rating bands
  ui/              # React components, Tailwind only
    board/         # grid rendering + variant overlays
    panels/        # input pad, undo, settings, etc.
  state/           # Zustand stores (game, settings, stats)
  storage/         # idb wrappers, JSON backup/restore
  puzzles/         # generated puzzle banks (committed JSON)
  pwa/             # service worker hooks, install prompt
  test/            # vitest setup
e2e/               # Playwright specs
gen/               # Python + Z3 generator (not in app bundle)
docs/              # ARCHITECTURE, VARIANTS, GENERATION, GOTCHAS, NAMING
prompts/           # phase-00 .. phase-20 implementation prompts
```

## Workflow

1. Each phase is driven by `prompts/phase-NN-*.md`. Open the prompt, follow it, deliver the listed artifacts.
2. Phase 0 must be merged before any variant work. Every variant phase depends on the constraint registry.
3. Every phase ends with: typecheck green, vitest green, build green, and (for UI phases) a manual iPad-Safari smoke test.
4. No phase ships without test coverage of its engine-level changes. UI components can rely on integration/E2E tests.

## Coding rules

- **Engine code:** no `any`, no `as` casts unless commented with why. Prefer discriminated unions over booleans.
- **No comments explaining what code does.** Only write a comment for non-obvious *why* (subtle invariant, workaround for a known bug).
- **No premature abstraction.** Three similar lines beats a four-parameter helper.
- **No commented-out code.** Delete it.
- **Tailwind only.** No `.css` files beyond `index.css` (the v4 entry).
- **Path alias `@/*` → `src/*`.** Use it for cross-module imports.

## Storage strategy

Saved data lives in IndexedDB (durable on installed PWAs in iOS 16.4+). Cleared only by manual "Clear Safari Data" or device wipe. Mitigation: **manual JSON export/import** in Settings → Backup (Phase 4). Single-file JSON via Files app. When Capacitor wrap lands (Phase 21), iCloud KVS becomes optional.

## What I do NOT want

- Backend, auth, account systems, Supabase, Firebase, server-side anything.
- Analytics, telemetry, Sentry, crash reporting.
- Third-party UI kits (no MUI, no Chakra, no shadcn — Tailwind primitives only).
- AI / LLM features inside the app.
- Microtransactions, ads, paywalls.
- Daily-login streaks, lives, energy systems. This is a calm puzzle game, not a Skinner box.

## Commands

```bash
bun dev          # vite dev (port 5173)
bun run build    # tsc -b && vite build
bun run preview  # serve dist/
bun run test     # vitest watch
bun run test:run # vitest single pass
bun run e2e      # playwright (auto-starts dev server)
bun run typecheck
bun run lint
```

## When in doubt

Read `docs/ARCHITECTURE.md`. If that doesn't answer it, write the question into `docs/GOTCHAS.md` with the date and ask.
