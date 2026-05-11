# Phase 2 — Core UI Shell: Grid, Selection, Input, Pencil Marks

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md` § UI overlay system.
> Prereqs: Phase 0 (engine), Phase 1 (puzzle banks for fixture data).

## Goal

Build the React UI for actually playing a Classic Sudoku puzzle: render the grid, select cells, enter digits, toggle pencil marks. **iPad touch-first.** No save/resume yet (Phase 3), no theming beyond a single dark theme (Phase 4), no PWA polish (Phase 5).

## Deliverables

### Components (`src/ui/board/`)

- `Board.tsx` — pure SVG-based grid renderer; consumes a `Grid<N>` from the engine. Square cells, box borders 2px, cell borders 1px. Selected cell highlighted.
- `Cell.tsx` — renders a value, 9 pencil-mark slots, given vs entered styling. Tap target ≥ 44 CSS px.
- `OverlayLayer.tsx` — empty surface; variants will draw here later.

### Components (`src/ui/panels/`)

- `InputPad.tsx` — large 3×3 + 1 digit pad, plus mode toggles: Value / Pencil / Erase. Sized for one-handed iPad use.
- `Toolbar.tsx` — minimal: New, Pause, Hint (disabled stub), Undo (stub for Phase 3).

### Page (`src/ui/pages/Play.tsx`)

- Loads a random Classic puzzle from `src/puzzles/`.
- Wires keyboard + touch input to a single in-memory game state (Zustand store, formalized in Phase 3).
- Conflict highlighting via engine `validate()`.

### Input handling

- Tap to select; arrow keys for keyboard.
- Long-press (≥ 300ms) toggles pencil mode for that input.
- iPad gesture: two-finger tap = erase.
- All gestures testable via Playwright pointer events.

### Routing

- `src/main.tsx` mounts React Router. Routes for `/` (placeholder home) and `/play` (Play page). Variant routing arrives Phase 18.

### Tests

- `Board.test.tsx`, `InputPad.test.tsx`, `Cell.test.tsx` — render + interaction with @testing-library/react.
- `e2e/play.spec.ts` — Playwright: load `/play`, enter a digit, verify it appears; toggle pencil mode, enter pencil marks, verify they appear; iPad device profile passes.

## Out of scope

- Undo/redo, save/resume — Phase 3.
- Settings, theme toggle — Phase 4.
- Service worker / installability — Phase 5.
- Any variant beyond Classic.

## Acceptance criteria

- [ ] Renders a Classic puzzle from `src/puzzles/classic/easy.jsonl` on `/play`.
- [ ] On iPad Safari (and Playwright `iPad (gen 7)` profile), every interactive element is ≥ 44 CSS px and no zoom on input.
- [ ] Conflict highlighting works: enter a duplicate digit, the conflicting cells get a subtle red ring.
- [ ] `bun run test:run` and `bun run e2e` both green.
- [ ] Manual: app loaded on a real iPad via local network shows readable grid, comfortable touch targets, no rubber-band scrolling.

## Output format

Files added/modified, test count, Lighthouse score (informational), screenshots of the rendered grid on iPad device profile, open questions.
