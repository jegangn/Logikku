# Phase 3 — Game State, Undo/Redo, Save & Resume (IndexedDB)

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md` § Storage, § State management.
> Prereqs: Phases 0, 1, 2.

## Goal

Promote the in-memory state from Phase 2 into formal Zustand stores backed by IndexedDB. Implement undo/redo. Persist across reloads and app re-launches. Survive iPad backgrounding.

## Deliverables

### State (`src/state/`)

- `gameStore.ts` — Zustand store: `puzzle`, `grid`, `history[]`, `historyIndex`, `elapsedMs`, `paused`, `completedAt`. Actions: `setValue`, `togglePencil`, `erase`, `undo`, `redo`, `pause`, `resume`, `complete`.
- `statsStore.ts` — counters per variant + difficulty; `onComplete` increments.
- History uses delta entries, not snapshots. Cap at 500 entries.

### Storage (`src/storage/`)

- `db.ts` — `idb` v8 wrapper exposing typed `getGame`, `putGame`, `listGames`, `getSettings`, `putSettings`, `getStats`, `putStats`.
- Schema versioned; migration hook stub.
- Object stores: `games` (key: id, index: variant+completedAt), `settings` (key: "v1"), `stats` (key: "v1").

### Persistence wiring

- `gameStore` debounces saves at 500ms.
- On `/play` mount: if a game with this puzzle id exists in IndexedDB, hydrate from it; otherwise create new.
- "Continue" button on home page shows the most recent unfinished game.

### Undo/redo UI

- Toolbar Undo/Redo buttons enabled per history state.
- Keyboard: `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo.

### Tests

- `gameStore.test.ts` — every action; undo/redo invariants; history cap.
- `db.test.ts` — round-trips with fake-indexeddb (already pulled in via happy-dom or `fake-indexeddb` package).
- `e2e/persistence.spec.ts` — Playwright: enter digits, reload, verify state restored.

## Out of scope

- Backup/restore JSON file (Phase 4).
- Multi-game library UI (Phase 4).
- Variant-specific state (variants are loaded the same way; no special-casing).

## Acceptance criteria

- [ ] Reload mid-game → exact restoration of grid, pencil marks, elapsed time, selection.
- [ ] Background the iPad for 10 minutes, return → state still there, elapsed time correctly resumed (game was paused by visibility change).
- [ ] Undo/redo across all action types (values, pencil marks, erase) works correctly.
- [ ] Tests green; engine `src/engine/` still has zero React/DOM imports.

## Output format

Files added/modified, test counts, schema version chosen, any drift in `docs/ARCHITECTURE.md` § Storage, open questions.
