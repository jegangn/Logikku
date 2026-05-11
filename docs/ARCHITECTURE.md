# Architecture — Constraint System

> **Status:** Stub. Phase 0 fills in the concrete types and APIs. This document is the engineering contract; if code disagrees with this doc, the doc is wrong — update it.

## Goals

1. **One engine, every variant.** Adding a variant means adding a `Constraint` class (and a UI overlay + generator entry), not modifying the solver, grader, or board renderer.
2. **Variable grid size.** Types parametric over grid dimension `N`. Engine works for 6×6, 9×9, 16×16, and Samurai's overlapping-grid topology.
3. **Pure engine.** No React, no DOM, no `window`. Testable from Node. Mockable by replacing the `Storage` adapter.
4. **Deterministic.** Solver and grader are deterministic given the same puzzle. Random behaviour lives only in `gen/` (Python).

## Core types

```ts
// src/engine/types.ts
type Digit = number          // 1..N for an N×N grid
type Coord = { r: number; c: number }
type Region = readonly Coord[]   // box, row, column, jigsaw shape, cage…

interface Cell<N extends number = 9> {
  readonly coord: Coord
  value: Digit | null
  candidates: ReadonlySet<Digit>   // pencil marks
  given: boolean
}

interface Grid<N extends number = 9> {
  readonly size: N
  readonly cells: ReadonlyArray<ReadonlyArray<Cell<N>>>
  // Variable topology — Samurai supplies multiple overlapping grids
  // via a wrapper type SamuraiBoard composed of 5 Grid<9>s.
}

interface Constraint {
  readonly id: string                    // unique per instance, e.g. "killer:cage-3"
  readonly kind: ConstraintKind          // discriminator
  readonly regions: readonly Region[]
  // Propagation: given current board state, returns elimination set
  propagate(grid: ReadonlyGrid): Eliminations
  // Check: is the current full board valid against this constraint?
  validate(grid: ReadonlyGrid): boolean
  // Optional: provide named techniques the solver can attempt
  techniques?(): readonly Technique[]
}
```

## Constraint registry

A single `ConstraintRegistry` exports every variant's constraint factory. Solver and grader iterate this registry. Adding a variant = registering a factory.

```ts
ConstraintRegistry.register('killer', KillerConstraint)
ConstraintRegistry.register('thermometer', ThermometerConstraint)
// ... 23 total
```

Constraint kinds (all stubbed in Phase 0, implemented per phase):
- `classic` (rows + cols + boxes) — Phase 0
- `x-diagonal` — Phase 6
- `hyper`, `windoku` — Phase 7
- `anti-knight`, `anti-king`, `non-consecutive` — Phase 8
- `jigsaw`, `even-odd` — Phase 9
- `kropki`, `xv`, `greater-than` (mini 6×6 implied) — Phase 10
- `thermometer` — Phase 11
- `arrow` — Phase 12
- `killer` — Phase 13
- `little-killer`, `sandwich`, `skyscraper` — Phase 14
- `palindrome`, `renban`, `german-whispers` — Phase 15
- `mega-16` — Phase 16
- `samurai` — Phase 17

## Solver

Two-layer:
1. **Technique solver** — applies named human techniques tier by tier (Naked Single → Hidden Single → Locked Candidates → Naked Pairs → … → X-Wing, Swordfish, XY-Wing, Coloring). Tiers 1–4 in Phase 0; deeper tiers added as needed by variants.
2. **Backtracking solver** — DFS fallback with constraint propagation. Used for solution-uniqueness checks during generation.

The technique solver is what the **grader** uses to compute the Sudoku Explainer (SE) rating.

## Grader

SE-style rating band: `{ minTechnique, maxTechnique, score }`. Maps to user-facing difficulty:

| SE | Label |
|---|---|
| 1.0–1.5 | Very Easy |
| 1.6–2.5 | Easy |
| 2.6–4.0 | Medium |
| 4.1–6.0 | Hard |
| 6.1–8.0 | Expert |
| 8.1+ | Diabolical |

Variant-specific techniques (e.g. Killer Cage 45 rule) extend the technique list and contribute to the grade.

## Generator integration

Generation is **offline only**. `gen/` produces JSON files per `(variant, difficulty)` pair. App loads them as static assets via `src/puzzles/`. See `docs/GENERATION.md`.

## State management

Three Zustand stores:
- `gameStore` — current puzzle, history (undo/redo), elapsed time, hint state
- `settingsStore` — theme, strict mode, conflict highlight, sound off (always off by default)
- `statsStore` — completion counts per variant/difficulty

Stores persist to IndexedDB via `src/storage/`.

## Storage

IndexedDB schema (Phase 3):
- `games` — in-progress + completed games (keyed by id, indexed by variant + completedAt)
- `settings` — single-row prefs blob
- `stats` — aggregated counters

JSON backup/restore: serialize all three stores → single file. Versioned schema (`{ version: 1, games: [...], settings: {...}, stats: {...} }`) with migration hook.

## UI overlay system

Each variant registers an overlay component that draws on top of the base grid: thermometer bulbs, arrow paths, cage borders, sandwich clue numbers, etc. Overlays receive `{ constraint, gridCoords }` and render SVG. Phase 18 builds the variant-picker UI.

## Variable topology (Samurai)

Samurai is five overlapping 9×9 grids sharing four corner boxes. Modeled as a `SamuraiBoard` wrapper containing five `Grid<9>`s with a shared-cell map. Constraints validated per sub-grid; shared cells appear in multiple constraint sets. UI renders as a single cruciform.

## Backup/restore JSON schema

```jsonc
{
  "version": 1,
  "exportedAt": "2026-05-11T12:00:00Z",
  "games": [...],
  "settings": {...},
  "stats": {...}
}
```

Restore is destructive (replaces in-progress state) and prompted in UI.
