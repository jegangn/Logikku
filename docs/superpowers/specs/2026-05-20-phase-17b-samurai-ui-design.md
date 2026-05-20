# Phase 17b — Samurai Cruciform UI Design

> **Status:** Approved 2026-05-20. Drives the implementation plan for Sub-project 17b.
> **Scope:** UI layer for Samurai variant — cruciform rendering, orientation lock, demo puzzle wiring, Play.tsx routing. No engine changes (17a). No bank generation (17c). No e2e.
> **Part of:** Phase 17 (Samurai), decomposed into 17a (engine + state, shipped), 17b (this), 17c (Python generator + banks + e2e).

## Goal

Render a playable cruciform Samurai board on iPad landscape. Wire the existing 17a engine + state into a new UI component. Exercise the full input → engine → render loop end-to-end with a hand-crafted demo puzzle. Prove correctness via vitest + RTL.

## Non-goals

- Python generator or real puzzle banks.
- E2E spec (Playwright).
- `tools/grade.ts` samurai dispatch.
- Variant select UI changes (Phase 18 territory).
- Samurai with non-Classic sub-grids.

## Scope decisions (locked)

| Decision | Choice |
|---|---|
| Renderer architecture | New `SamuraiBoardView` component reusing existing Board internals via an extracted `BoardCellsLayer`. |
| Shared-cell visual | Render twice (corner + center painting on top). Identical values → no visible difference. |
| Orientation strategy | Force landscape only; portrait shows a `RotateDevicePrompt` overlay. State preserved across rotations. |
| InputPad placement | Right of the board in landscape (flex-row at `lg:`). Other variants unchanged. |
| Shared-cell highlight | Both center and corner light up; peer-highlight extends across both sub-grids. |
| Demo fixture | One hand-crafted record at `src/puzzles/samurai/easy.json`. Replaced by real banks in 17c. |

## Architecture

```
┌─ src/ui/board/BoardCellsLayer.tsx (new — extracted from Board.tsx) ──┐
│  Pure rendering of cells + grid lines for ONE Grid. No SVG wrapper. │
│  Inputs: grid, cellSize, gridIdx?, selected for THIS sub-grid,      │
│         selectedValue, peerSet, conflictSet, lockedCells, shakeKey, │
│         suppressBoxLines, onSelect.                                 │
│  Returns: a single <g> containing the cell rects + Cell elements +  │
│  GridLines. Caller wraps in <g transform="translate(...)"> for      │
│  positioning.                                                       │
└──────────────────────────────────────────────────────────────────────┘
            │                            │
            ▼ used once                  ▼ used 5 times
┌─ src/ui/board/Board.tsx (slim) ──┐  ┌─ src/ui/board/SamuraiBoardView.tsx (new) ──┐
│  Existing shell preserved:        │  │  Outer SVG, viewBox 21*CELL_SIZE square.    │
│  - viewBox sizing                 │  │  Per sub-grid: <g transform="translate(...)">│
│  - OverlayLayer for variants      │  │    <BoardCellsLayer ... />                  │
│  - margin for outside clues       │  │  </g>                                       │
│  Delegates inner cells +          │  │  Sub-grid paint order: corners 1-4 first,   │
│  grid lines to BoardCellsLayer.   │  │  center (0) last so overlapping boxes look  │
│  Public Props API unchanged.      │  │  like part of the center.                   │
│                                   │  │  Computes per-sub-grid view-state from the  │
│                                   │  │  global selection via samuraiSharedLocations│
│                                   │  │  and peer-set union across overlap.         │
└───────────────────────────────────┘  └──────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─ src/ui/hooks/useIsPortraitOrientation.ts (new) ──────────────────┐
│  Tiny hook wrapping window.matchMedia('(orientation: portrait)').  │
│  Returns boolean; subscribes to change events; cleans up on unmount.│
│  Default: false (landscape) for SSR / first render.                │
└────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─ src/ui/board/RotateDevicePrompt.tsx (new) ─────────────────────┐
│  Centered SVG rotate icon + 'Samurai needs landscape — please    │
│  rotate your device' text. Reuses existing color tokens. ~30 LOC.│
└──────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─ src/ui/pages/Play.tsx (modified) ──────────────────────────────────┐
│  VARIANT_LABELS: 'samurai' → 'Samurai'.                              │
│  Render dispatch on state.board.kind:                                │
│    'grid'    → <Board grid={...} ... />  (unchanged)                 │
│    'samurai' → portrait ? <RotateDevicePrompt /> : <SamuraiBoardView>│
│  Puzzle load: if variant === 'samurai', pass record.samuraiGivens.   │
│  Selection handler accepts Coord | {gridIdx, coord}, calls select.   │
│  InputPad placement adapts: lg:flex-row when samurai variant.        │
└──────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─ src/puzzles/types.ts + src/puzzles/index.ts (modified) ────────────┐
│  PuzzleRecord.samuraiGivens?: ReadonlyArray<string>                  │
│    (when present: length 5; each string 81 chars).                   │
│  Bank validation accepts the new optional field and rejects malformed│
│  shapes at module load.                                              │
└──────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─ src/puzzles/samurai/easy.json (new) ──────────────────────────────┐
│  One hand-crafted PuzzleRecord with samuraiGivens=[5 strings].     │
│  Shared-cell-consistent (passes samuraiConsistencyCheck).          │
│  Exercises /play?variant=samurai&difficulty=easy.                  │
└─────────────────────────────────────────────────────────────────────┘
```

Three guiding principles:

1. **Reuse the existing Cell + GridLines machinery.** Extracting `BoardCellsLayer` from Board.tsx is a one-time DRY move; the second call site (SamuraiBoardView) justifies it. Board.tsx becomes ~100 LOC slimmer; SamuraiBoardView doesn't reinvent cell rendering.

2. **Selection state lives at the top.** Play.tsx owns the global selection. SamuraiBoardView derives each sub-grid's view-state from `samuraiSharedLocations`. Each sub-board renders independently — no cross-grid coupling at the component layer.

3. **Orientation lock is a UI-layer concern, not a navigation rule.** `/play?variant=samurai` still works in portrait. The board is simply replaced with a rotate prompt; state is preserved across rotations.

## Components

### `src/ui/board/BoardCellsLayer.tsx` (new)

```tsx
export interface BoardCellsLayerProps {
  readonly grid: Grid
  readonly cellSize: number
  readonly gridIdx?: number
  readonly selectedCoord: Coord | null
  readonly selectedValue: Digit | null
  readonly peerSet: ReadonlySet<string>
  readonly conflictSet: ReadonlySet<string>
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly suppressBoxLines?: boolean
  readonly onSelect: (coord: Coord) => void
}

export function BoardCellsLayer(props: BoardCellsLayerProps): React.ReactElement
```

Pure rendering of one grid's cells + grid lines as a single `<g>`. No outer SVG, no overlay system. Caller provides `selectedCoord`/`selectedValue`/`peerSet`/`conflictSet` so this component does no derivation — it just renders.

### `src/ui/board/Board.tsx` (modified — slim)

Drops the inner cell loop + GridLines into a call to `<BoardCellsLayer>`. Outer SVG, viewBox, OverlayLayer, margin for outside clues, conflict computation all stay. The component's public API (props) is unchanged — existing callers (classic, mini, mega, all variant boards) work without modification.

Net file size: ~217 LOC → ~120 LOC.

### `src/ui/board/SamuraiBoardView.tsx` (new)

```tsx
export interface SamuraiBoardViewProps {
  readonly board: SamuraiBoard
  readonly selected: { readonly gridIdx: number; readonly coord: Coord } | null
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly onSelect: (target: { readonly gridIdx: number; readonly coord: Coord }) => void
}

const CELL_SIZE = 30 // px — yields a 630×630 board on iPad landscape
const SUB_GRID_POSITIONS: Record<number, { x: number; y: number }> = {
  // In cell units; multiply by CELL_SIZE for pixel translation.
  0: { x: 6, y: 6 },   // center
  1: { x: 0, y: 0 },   // NW
  2: { x: 0, y: 12 },  // NE
  3: { x: 12, y: 0 },  // SW
  4: { x: 12, y: 12 }, // SE
}

export function SamuraiBoardView(props: SamuraiBoardViewProps): React.ReactElement
```

Renders an outer `<svg viewBox="0 0 ${21*CELL_SIZE} ${21*CELL_SIZE}">`. For each sub-grid, computes view-state and renders a positioned `<g transform="translate(x*CELL_SIZE, y*CELL_SIZE)">` containing a `<BoardCellsLayer>`. Corners (1–4) paint first; center (0) paints last to ensure overlapping cells visually belong to the center.

Per-sub-grid view-state computation:

```ts
function computeSubGridState(
  board: SamuraiBoard,
  gridIdx: number,
  selected: { gridIdx: number; coord: Coord } | null,
  globalConflicts: ReadonlySet<string>,
): {
  selectedCoord: Coord | null
  selectedValue: Digit | null
  peerSet: ReadonlySet<string>
  conflictSet: ReadonlySet<string>
}
```

- **selectedCoord:** if selected, use `samuraiSharedLocations(board, selected.gridIdx, selected.coord)` and pick the entry where `grid === gridIdx`. Returns the local coord if this sub-grid contains the cell, else null.
- **selectedValue:** the value at the global selection (same digit in all overlapping sub-grids by 17a's sync invariant).
- **peerSet:** classic peers within this sub-grid of `selectedCoord` (when present in this sub-grid).
- **conflictSet:** filter `globalConflicts` to entries starting with `${gridIdx},`; strip the prefix.

The outer `onSelect` wraps each sub-board's local-coord callback into `{ gridIdx, coord }` and bubbles up to the parent.

### `src/ui/hooks/useIsPortraitOrientation.ts` (new)

```ts
export function useIsPortraitOrientation(): boolean
```

Wraps `window.matchMedia('(orientation: portrait)')`. Returns boolean. Subscribes to `change` events; cleans up on unmount. Default `false` for first render (server-safe though we don't SSR).

### `src/ui/board/RotateDevicePrompt.tsx` (new)

```tsx
export function RotateDevicePrompt(): React.ReactElement
```

A centered card with a rotate-icon SVG and the message "Samurai needs landscape — please rotate your device." ~30 LOC. Reuses existing color tokens.

### `src/ui/pages/Play.tsx` (modified)

Changes:

1. **VARIANT_LABELS:** add `'samurai': 'Samurai'`.

2. **Render dispatch:**
   ```tsx
   const isPortrait = useIsPortraitOrientation()
   {board?.kind === 'grid' && <Board grid={board.grid} ... />}
   {board?.kind === 'samurai' && (
     isPortrait
       ? <RotateDevicePrompt />
       : <SamuraiBoardView
           board={board.board}
           selected={state.selected && 'gridIdx' in state.selected ? state.selected : null}
           onSelect={(t) => select(t)}
         />
   )}
   ```

3. **Puzzle load:** existing flow `pickPuzzle → loadPuzzle`. Pass `samuraiGivens` when present:
   ```tsx
   const record = pickPuzzle(variant, difficulty, seed)
   loadPuzzle({
     id, variant, difficulty,
     givens: record.givens ?? '',
     ...(record.samuraiGivens ? { samuraiGivens: record.samuraiGivens } : {}),
     // ... other variant fields
   })
   ```

4. **Selection handler:** accept either shape and call `select(target)`. For Cell-tap on the classic Board, target is `Coord`; for SamuraiBoardView, target is `{gridIdx, coord}`.

5. **InputPad layout:** for samurai variant, switch the outer container from `flex-col` to `lg:flex-row` so the pad sits to the right. Other variants unchanged.

### `src/puzzles/types.ts` (modified)

Add `samuraiGivens?: ReadonlyArray<string>` to `PuzzleRecord`. When set, length 5, each string 81 chars.

### `src/puzzles/index.ts` (modified)

`assertRecord` adds validation:

```ts
if (obj['samuraiGivens'] !== undefined) {
  if (!Array.isArray(obj['samuraiGivens']) || obj['samuraiGivens'].length !== 5) {
    throw new Error(`bank ${key.variant}/${key.difficulty}: 'samuraiGivens' must be a 5-element array`)
  }
  for (const s of obj['samuraiGivens'] as unknown[]) {
    if (typeof s !== 'string' || s.length !== 81) {
      throw new Error(`bank ${key.variant}/${key.difficulty}: each samuraiGivens entry must be an 81-char string`)
    }
  }
}
```

### `src/puzzles/samurai/easy.json` (new)

One hand-crafted PuzzleRecord. Shared-cell consistent. Each sub-grid has ~30 givens; not required to be uniquely solvable (17c provides real banks).

```jsonc
[{
  "id": "samurai-demo-001",
  "variant": "samurai",
  "size": 9,
  "givens": "",
  "samuraiGivens": [
    "<81 chars for center>",
    "<81 chars for NW corner>",
    "<81 chars for NE corner>",
    "<81 chars for SW corner>",
    "<81 chars for SE corner>"
  ],
  "difficulty": "easy",
  "se": 2.4,
  "hardestTier": 1,
  "steps": 0,
  "generatedAt": "2026-05-20T00:00:00Z"
}]
```

The implementation task builds these strings such that the 4 shared 3×3 boxes between center and corners agree on every cell.

### Deliberately NOT components

- No engine changes (17a is shipped).
- No `tools/grade.ts` work (17c).
- No new generator (17c).
- No e2e spec (17c).
- No variant-select menu update (Phase 18).
- No new design system tokens.

## Data flow

### Page load — `/play?variant=samurai&difficulty=easy`

```
Play.tsx mounts; reads URL params (variant='samurai', difficulty='easy')
        │
        ▼
pickPuzzle('samurai', 'easy', seed)
        │  (index.ts auto-discovers src/puzzles/samurai/easy.json on
        │   first call; validates record shape including samuraiGivens)
        ▼
record: PuzzleRecord {
  id, variant='samurai', size=9, givens='',
  samuraiGivens=[5 × 81-char strings], difficulty='easy', ...
}
        │
        ▼
loadPuzzle({ id, variant, difficulty, givens: '', samuraiGivens })
        │
        ├── (variant === 'samurai' branch from 17a Task 11)
        │   board = freshSamuraiBoardFromGivens(samuraiGivens)
        │     ├── createSamuraiBoard()  (5 empty Grid<9> + sharedCells)
        │     ├── for i in 0..4: parsePuzzle, overlay onto board.grids[i]
        │     └── samuraiConsistencyCheck(board)  (throws on mismatch)
        │
        ▼
set({ board: { kind: 'samurai', board } })
        │
        ▼
Play.tsx re-renders; dispatch on board.kind === 'samurai'
        │
        ├── useIsPortraitOrientation() → true / false
        │
        ▼  (landscape branch)
<SamuraiBoardView board={board} selected={null} onSelect={handleSelect} />
        │
        ▼  inside SamuraiBoardView
For each gridIdx in 0..4:
  computeSubGridState(board, gridIdx, selected=null, globalConflicts=∅)
    → { selectedCoord: null, selectedValue: null, peerSet: ∅, conflictSet: ∅ }
  render <g transform="translate(POS_X, POS_Y)">
    <BoardCellsLayer grid={board.grids[gridIdx]} ...subState />
  </g>
```

### User input — tap a cell

```
User taps NW corner's local cell (7, 7)
        │
        ▼
<Cell onPointerDown> fires with coord={r:7, c:7}
        │
        ▼
BoardCellsLayer's onSelect wrapper invokes parent's onSelect({r:7, c:7})
        │
        ▼
SamuraiBoardView's per-sub-board wrapper invokes
  parent.onSelect({gridIdx: 1, coord: {r:7, c:7}})
        │
        ▼
Play.tsx handleSelect: select({gridIdx, coord})
        │
        ▼
state.selected = { gridIdx: 1, coord: {r:7, c:7} }
        │
        ▼  (re-render)
SamuraiBoardView re-computes per-sub-grid view-state.
  For gridIdx=0 (center):
    samuraiSharedLocations(board, 1, {r:7,c:7}) →
      [{grid:1, coord:{r:7,c:7}}, {grid:0, coord:{r:1,c:1}}]
    selectedCoord = {r:1, c:1}  (center cell that IS the same global cell)
    peerSet = peersOf({r:1,c:1}, CLASSIC_9) translated to "r,c" keys
  For gridIdx=1 (NW):
    selectedCoord = {r:7, c:7}
    peerSet = peersOf({r:7,c:7}, CLASSIC_9)
  For gridIdx=2,3,4:
    selectedCoord = null; peerSet = ∅
        │
        ▼
The same global cell is highlighted in BOTH center and NW corner.
Peer-highlight rows/cols/box light up in EACH of those two sub-grids.
Other corners show no highlight.
```

### User input — keyboard digit press

```
User presses '5' with a samurai cell selected
        │
        ▼
Play.tsx onKey handler (existing from Phase 16):
  maybeDigit = digitFromGlyph('5') → 5
  if (maybeDigit !== null && maybeDigit <= gridSize) { input(maybeDigit) }
        │
        ▼
gameStore.input(5)  (samurai branch from 17a Task 12)
        │
        ├── sel = state.selected (has 'gridIdx')
        ├── targetCell = samuraiCellAt(sBoard, 1, {r:7,c:7})
        ├── if (targetCell.given) return  (17a fix)
        ├── locs = samuraiSharedLocations(...) → [{grid:1,...}, {grid:0,...}]
        ├── snapshot prevByLocation across both sub-grids
        ├── setValueShared(sBoard, 1, {r:7,c:7}, 5)
        │     └── for each loc: setValue(grids[loc.grid], loc.coord, 5)
        │         → writes value, classic peer-elim runs per sub-grid
        ├── snapshot nextByLocation
        └── push SamuraiHistoryEntry; bump historyIndex
        │
        ▼  Completion check
if (samuraiIsComplete && samuraiConflicts.size === 0) {
  set({ completedAt: new Date().toISOString() })
}
        │
        ▼  (re-render)
Shared cell now shows '5' in both grids.
Peer cells in both grids have lost '5' from their candidate sets.
```

### Orientation flow

```
User rotates iPad from landscape to portrait
        │
        ▼
window.matchMedia('(orientation: portrait)') fires change event
        │
        ▼
useIsPortraitOrientation hook updates internal state
        │
        ▼
Play.tsx re-renders. board.kind === 'samurai' && isPortrait →
  <RotateDevicePrompt />  // replaces SamuraiBoardView
        │
        ▼
gameStore state is preserved (selection, board values, history all intact).
Rotating back to landscape restores the same SamuraiBoardView with the
same selection.
```

### Save/restore — already wired in 17a

`serializeGameForSave` + `hydrate` from 17a Task 15 handle samurai round-trip via the `kind: 'samurai'` payload. No new code in 17b.

## Error handling

### Construct-time

- **Demo JSON missing `samuraiGivens`.** Play.tsx's load path checks; throws on samurai variant with absent field. Surfaces via the existing React error boundary.
- **`samuraiGivens` wrong length.** Bank validation at module load throws — `bun run build` fails if the committed JSON is malformed.
- **Overlap consistency violation.** `samuraiConsistencyCheck` (17a) inside `freshSamuraiBoardFromGivens` throws with offending corner role + value pair.
- **Corrupted hydrate.** Same path as 17a: `console.error` + discard the save.

### Runtime — user interactions

- **Tap on a given cell.** 17a Task 12 fix: silent return. No visible change.
- **Tap on a peer cell while no digit selected.** Just updates selection. No error path.
- **Keyboard digit > 9.** Samurai uses sub-grids of size 9; `digitFromGlyph('A')` returns 10 which fails the `<= gridSize` guard — silent ignore.
- **Selection on a sub-grid the cell isn't in.** Defensive guard in `computeSubGridState` falls back to `selectedCoord: null`. Never throws.
- **Undo/redo past bounds.** 17a's bounds checks remain.
- **Rapid taps during re-render.** Zustand is synchronous; React 19's batching coalesces. Safe.

### Runtime — orientation

- **Rotation mid-interaction.** Selection state preserved across re-render. No state loss.
- **Stale orientation read on first render.** Hook defaults `false` and updates via `useEffect`. One frame of wrong value at most.
- **Touch target ~30px in landscape.** Below iOS 44px guideline. Accepted as a trade-off; documented in GOTCHAS. iPad smoke test validates or escalates.

### Out of scope

- Network errors (no network).
- Multi-tab concurrency.
- `tools/grade.ts` samurai dispatch — 17c.

## Testing

### Unit (vitest + RTL)

**`src/ui/board/BoardCellsLayer.test.tsx` (new):**
- Renders 81 cells via `data-testid="cell-{r}-{c}"`.
- Selection / conflict data-attrs honor inputs.
- `onSelect` fires with local coord.
- `gridIdx` prop is optional.
- `suppressBoxLines` works.

**`src/ui/board/SamuraiBoardView.test.tsx` (new):**
- 5 sub-board groups via `data-testid="samurai-subgrid-{i}"`.
- Total cells rendered: 5 × 81 = 405.
- Outer SVG viewBox `0 0 ${21*CELL_SIZE} ${21*CELL_SIZE}`.
- Selection on center (1,1) highlights both center (1,1) and NW corner (7,7).
- Selection on NE corner (5,5) (no overlap) highlights only that cell.
- `onSelect` fires `{ gridIdx: 1, coord: {r:7, c:7} }` on NW corner tap.
- Peer highlights extend across the overlap when selection is in a shared cell.
- Conflict in a shared cell shows in both sub-grids.

**`src/ui/board/RotateDevicePrompt.test.tsx` (new):**
- Renders the icon and text — single smoke test.

**`src/ui/hooks/useIsPortraitOrientation.test.ts` (new):**
- Returns false / true based on mocked matchMedia.
- Updates on `change` event.

### Integration (Play.tsx + samurai)

**`src/ui/pages/Play.samurai.test.tsx` (new):**
- `/play?variant=samurai&difficulty=easy` mounts; cruciform renders (`samurai-subgrid-0` visible).
- `data-testid="board"` not present (dispatch worked).
- Center cell tap → both center and NW corner selected.
- Digit input via pad → both cells show value.
- Keyboard digit press → same.
- Backspace → both clear.
- Undo → restores.
- Toolbar shows `Samurai · Easy`.

**Orientation cases:**
- matchMedia portrait=true → `RotateDevicePrompt` renders, cruciform absent.
- Switch to portrait=false → cruciform appears, prior selection preserved.

### Puzzle bank validation

**`src/puzzles/samurai.test.ts` (new):**
- Demo loads; `samuraiGivens` length 5, each string 81 chars.
- Passes `samuraiConsistencyCheck`.
- A mocked malformed bank is rejected at module load.

### Vitest regression — existing variants

After Task 1 (`BoardCellsLayer` extraction), all existing variant tests must still pass:
- `Board.test.tsx`, `Cell.test.tsx` — verbatim pass.
- All variant integration tests under `src/ui` — pass.

Run `bun run test:run src/ui` after each task and confirm.

### Manual iPad smoke (gates the phase)

- Open Logikku on iPad Safari, navigate to `/play?variant=samurai&difficulty=easy`.
- **Portrait:** confirm rotate prompt appears and is readable.
- **Landscape:** confirm cruciform renders crisply; ~30px cells tappable.
- Tap shared cells; confirm both light up.
- Enter a digit; confirm both show.
- Pencil-mark a shared cell; confirm marks in both.
- Undo/redo across shared + unshared placements.
- Save (background Safari), reopen, confirm cruciform restores.
- Rotate during play; confirm prompt appears, state preserved; rotate back.

### Deliberately NOT tested in 17b

- Real puzzle solvability / SE grading (17c).
- Cross-browser e2e (17c).
- Performance benchmarks of cruciform render (revisit only if iPad smoke shows lag).
- `tools/grade.ts` samurai dispatch (17c).

### Verification gate for 17b

- [ ] `bun run typecheck` clean.
- [ ] `bun run lint` clean.
- [ ] `bun run test:run` green including all new BoardCellsLayer / SamuraiBoardView / Play.samurai / puzzles/samurai cases.
- [ ] `bun run build` succeeds; samurai chunk reachable from dist.
- [ ] No regression in 9×9 / 6×6 / 16×16 / variant tests.
- [ ] iPad portrait shows rotate prompt; landscape shows playable cruciform.
- [ ] iPad smoke checklist passes — documented in GOTCHAS.

## Acceptance criteria

- [ ] `src/ui/board/BoardCellsLayer.tsx` extracted; Board.tsx delegates to it without API change.
- [ ] `src/ui/board/SamuraiBoardView.tsx` renders the 5-sub-grid cruciform.
- [ ] `src/ui/board/RotateDevicePrompt.tsx` + `src/ui/hooks/useIsPortraitOrientation.ts` exist.
- [ ] `src/ui/pages/Play.tsx` dispatches on `board.kind`; orientation lock works for samurai.
- [ ] `src/puzzles/types.ts` + `index.ts` accept `samuraiGivens` field.
- [ ] `src/puzzles/samurai/easy.json` exists and passes consistency check.
- [ ] All new vitest suites green; existing UI suite unchanged in count of passes.
- [ ] `typecheck`, `lint`, `build` all clean.
- [ ] GOTCHAS entry committed (any surprises discovered).
