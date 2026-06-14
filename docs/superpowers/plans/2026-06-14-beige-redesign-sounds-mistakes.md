# Beige redesign + sounds + 3-mistake limit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recolour Logikku to a single warm-beige theme (no dark mode), give every action a soft sound (no thud), add a celebratory ding when a number is fully completed, and enforce a strict-but-kind "Mistakes: X/3" limit.

**Architecture:** Engine stays pure — add one pure helper (`countPlaced`) and reuse the existing `backtrackingSolve`/`samuraiBacktrackingSolve` to compute each puzzle's solution at load. The Zustand `gameStore` gains a cached `solution` plus mistake/completion state derived from comparing the board to that solution. UI changes are CSS-variable recolouring (one theme) plus new Play-screen chrome (status row, timer, out-of-tries overlay) and pad remaining-counts. Sounds extend the existing Web-Audio `themes`/`SoundController`.

**Tech Stack:** Vite 8, React 19 + TS strict, Tailwind v4 (`@theme` CSS vars in `src/index.css`), Zustand 5, Vitest 4, Playwright (iPad profile), bun.

**Spec:** `docs/superpowers/specs/2026-06-14-beige-redesign-sounds-mistakes-design.md`

---

## File map

| File | Responsibility | Action |
|---|---|---|
| `src/index.css` | single beige palette; `color-scheme: light` | modify |
| `src/theme.ts` | theme resolution | reduce to light-only / delete |
| `src/state/settingsStore.ts` | settings; drop `theme` | modify |
| `src/storage/db.ts` | `SavedSettings`/`SavedGame`; drop `theme`, add `mistakes` | modify |
| `src/ui/pages/Settings.tsx` | remove Theme dropdown | modify |
| `src/main.tsx` / app bootstrap | remove theme watcher wiring | modify |
| `src/engine/grid.ts` | add `countPlaced` | modify |
| `src/engine/grid.test.ts` | test `countPlaced` | modify |
| `src/state/gameStore.ts` | `solution`, mistakes, `completedDigits`, helpers | modify |
| `src/state/gameStore.mistakes.test.ts` | mistake + completion tests | create |
| `src/audio/themes.ts` | add `mistake`,`digitDone` events | modify |
| `src/audio/sound.ts` | `SoundEvent` union (if redefined here) | check/modify |
| `src/audio/SoundController.tsx` | fire new sounds on state change | modify |
| `src/ui/hooks/useElapsedTime.ts` | ticking timer | create |
| `src/ui/panels/StatusRow.tsx` | difficulty · mistakes · timer+pause | create |
| `src/ui/panels/InputPad.tsx` | remaining counts + grey-out done digits | modify |
| `src/ui/pages/Play.tsx` | top bar, status row, out-of-tries overlay, relabel actions | modify |
| `src/ui/panels/OutOfTries.tsx` | calm game-over overlay | create |
| `src/i18n/en.ts`, `src/i18n/ms.ts` | new keys | modify |

> **Note for the executor:** several store/UI files are large and only partially quoted here. For every "Modify" step, **read the current file first**, then integrate the shown code at the indicated location following the file's existing patterns. New code blocks are complete; integration points say exactly where they go.

---

## Task 1: Single beige theme in CSS

**Files:**
- Modify: `src/index.css` (the `@theme {…}` block lines 8–58, the `html[data-theme="light"]{…}` block lines 60–94, and base `html { color-scheme }` line 137)

- [ ] **Step 1: Replace the colour tokens inside `@theme`** with the beige palette. Keep every non-colour token in that block unchanged (`--font-*`, `--control-*`, `--switch-*`, `--play-*`). Replace the colour lines (`--color-*`, `--cage-*`) with:

```css
  --color-bg: #efe7d6;
  --color-surface: #fcf8f0;
  --color-surface-2: #f3ebda;
  --color-surface-3: #eae0cc;
  --color-border: #e2d6bc;
  --color-border-strong: #c8b690;
  --color-grid-line: #e2d4b8;
  --color-grid-box: #b59a73;
  --color-board-frame: #a98e63;
  --color-text: #463526;
  --color-text-muted: #8a6a4a;
  --color-text-faint: #a98e63;
  --color-accent: #9c6233;
  --color-accent-soft: rgba(156, 98, 51, 0.14);
  --color-accent-strong: #7a4d26;
  --color-accent-button: #875327;
  --color-conflict: #c0533c;
  --color-conflict-soft: rgba(192, 83, 60, 0.14);
  --color-given: #463526;
  --color-entered: #a8703c;
  --color-peer: rgba(180, 150, 110, 0.18);
  --color-same-value: rgba(156, 98, 51, 0.16);
  --color-selection: rgba(246, 170, 90, 0.42);
  --color-success: #5e7d33;
  --color-success-soft: rgba(94, 125, 51, 0.14);
  --color-done: #c7b79a;
  --switch-on: #ffffff;
  --cage-1: rgba(56, 189, 248, 0.12);
  --cage-2: rgba(168, 85, 247, 0.12);
  --cage-3: rgba(34, 197, 94, 0.12);
  --cage-4: rgba(250, 204, 21, 0.16);
  --cage-5: rgba(244, 114, 182, 0.12);
  --cage-6: rgba(20, 184, 166, 0.12);
```

> `--color-selection` is translucent peach so a digit inside a selected cell stays visible. `--color-done` is new — used by the pad to grey out a finished number.

- [ ] **Step 2: Delete the entire `html[data-theme="light"] { … }` block** (currently lines 60–94). The beige palette is now the only palette.

- [ ] **Step 3: Flip the base colour-scheme.** In `@layer base`, change `html { color-scheme: dark; }` to `html { color-scheme: light; }`.

- [ ] **Step 4: Build to verify CSS compiles**

Run: `bun run build`
Expected: build succeeds (tsc + vite), no Tailwind errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): single warm-beige theme; remove dark palette from CSS"
```

---

## Task 2: Remove the theme switch (light/dark/system)

**Files:**
- Modify: `src/theme.ts`, `src/state/settingsStore.ts`, `src/storage/db.ts`, `src/ui/pages/Settings.tsx`, app bootstrap (search for `applyTheme`/`watchSystemTheme` callers — likely `src/main.tsx` or `src/ui/App.tsx`)

- [ ] **Step 1: Find every theme caller**

Run: `grep -rn "applyTheme\|watchSystemTheme\|data-theme\|prefers-color-scheme\|\.theme" src`
Expected: a short list — `theme.ts`, `settingsStore.ts`, `db.ts`, `Settings.tsx`, and a bootstrap caller. Note them.

- [ ] **Step 2: Reduce `src/theme.ts` to a light-only no-op** (smaller diff than deleting + unpicking imports):

```ts
export function applyTheme(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset['theme'] = 'light'
}
```

Remove `resolveTheme` and `watchSystemTheme` and the `Theme` import. Update callers: drop any `watchSystemTheme(...)` subscription; call `applyTheme()` once at startup with no argument.

- [ ] **Step 3: Drop `theme` from settings.** In `src/state/settingsStore.ts`: remove the `theme: Theme` field from `SettingsState`, from `DEFAULTS`, from the `loadFromDb` setState object, and from the `next: SavedSettings` write. Remove the now-unused `Theme` export/type if nothing else uses it (keep the `Language` import).

- [ ] **Step 4: Drop `theme` from persisted settings.** In `src/storage/db.ts`: remove `theme` from the `SavedSettings` interface. Stored old values are simply ignored (no migration needed).

- [ ] **Step 5: Remove the Theme dropdown** from `src/ui/pages/Settings.tsx` (the control bound to `theme` / `set('theme', …)`). Leave Language, sound, and gameplay controls intact.

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: clean. If a `Theme` type is still referenced anywhere, delete that usage.

- [ ] **Step 7: Commit**

```bash
git add src/theme.ts src/state/settingsStore.ts src/storage/db.ts src/ui/pages/Settings.tsx src/main.tsx src/ui/App.tsx
git commit -m "feat(ui): remove dark/light theme switch — beige is the only theme"
```

---

## Task 3: Engine helper — `countPlaced` (TDD)

**Files:**
- Modify: `src/engine/grid.ts`
- Test: `src/engine/grid.test.ts`

- [ ] **Step 1: Write the failing test.** Append to `src/engine/grid.test.ts` (it already imports `parsePuzzle`, `CLASSIC_9`, and uses an `EASY_PUZZLE` constant):

```ts
import { countPlaced } from './grid'

describe('countPlaced', () => {
  it('counts each placed digit and zero-fills the rest', () => {
    const grid = parsePuzzle(EASY_PUZZLE, CLASSIC_9)
    const counts = countPlaced(grid)
    // every digit 1..9 is present as a key
    for (let n = 1; n <= 9; n++) expect(counts.has(n as Digit)).toBe(true)
    // total placed equals the number of non-dot characters in the givens
    const placed = [...EASY_PUZZLE].filter((ch) => ch !== '0' && ch !== '.').length
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(placed)
  })

  it('reports a full board as 9 of each digit', () => {
    const solved = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
    const counts = countPlaced(parsePuzzle(solved, CLASSIC_9))
    for (let n = 1; n <= 9; n++) expect(counts.get(n as Digit)).toBe(9)
  })
})
```

> If `EASY_PUZZLE`/`Digit` aren't already imported in this test file, add them (match the existing imports at the top of the file).

- [ ] **Step 2: Run the test, expect failure**

Run: `bun run test:run -- src/engine/grid.test.ts`
Expected: FAIL — `countPlaced is not a function`.

- [ ] **Step 3: Implement `countPlaced`** in `src/engine/grid.ts` (near `cellAt`):

```ts
export function countPlaced(grid: Grid): Map<Digit, number> {
  const counts = new Map<Digit, number>()
  for (let n = 1; n <= grid.shape.size; n++) counts.set(n as Digit, 0)
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const v = cellAt(grid, { r, c }).value
      if (v !== null) counts.set(v, (counts.get(v) ?? 0) + 1)
    }
  }
  return counts
}
```

Export it from `src/engine/index.ts` (add `countPlaced` to the `from './grid'` export list).

- [ ] **Step 4: Run the test, expect pass**

Run: `bun run test:run -- src/engine/grid.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/grid.ts src/engine/index.ts src/engine/grid.test.ts
git commit -m "feat(engine): add countPlaced(grid) digit tally"
```

---

## Task 4: Solve each puzzle at load (cache the solution)

**Files:**
- Modify: `src/state/gameStore.ts`

- [ ] **Step 1: Add imports** at the top of `gameStore.ts` (extend the existing `@/engine` import):

```ts
import { backtrackingSolve, samuraiBacktrackingSolve, cellAt, samuraiCellAt } from '@/engine'
```

- [ ] **Step 2: Add the `solution` field** to the `GameState` interface (near `board`):

```ts
  solution: GameBoard | null
```

Initialise it to `null` wherever the store's initial state object is defined.

- [ ] **Step 3: Add solve helpers** (module scope, near `gridOf`):

```ts
function solveBoard(board: GameBoard): GameBoard | null {
  try {
    if (board.kind === 'grid') {
      const solved = backtrackingSolve(board.grid, { maxSolutions: 1 }).solutions[0]
      return solved ? { kind: 'grid', grid: solved } : null
    }
    const solved = samuraiBacktrackingSolve(board.board, { maxSolutions: 1 }).solvedBoard
    return solved ? { kind: 'samurai', board: solved } : null
  } catch {
    return null
  }
}

function solutionDigitAt(
  solution: GameBoard | null,
  sel: Coord | { readonly gridIdx: number; readonly coord: Coord },
): Digit | null {
  if (!solution) return null
  if (solution.kind === 'grid' && !('gridIdx' in sel)) {
    return cellAt(solution.grid, sel).value
  }
  if (solution.kind === 'samurai' && 'gridIdx' in sel) {
    return samuraiCellAt(solution.board, sel.gridIdx, sel.coord).value
  }
  return null
}
```

> Verify `samuraiCellAt`'s exact parameter order against `src/engine/samurai` and adjust the call if needed (it is exported from `@/engine`).

- [ ] **Step 4: Solve inside `loadPuzzle`.** At the end of `loadPuzzle`, after the new `board` is built and just before/within the `set({...})` call, compute and include the solution:

```ts
const solution = board ? solveBoard(board) : null
// include `solution` in the set({...}) payload
```

- [ ] **Step 5: Re-solve inside `hydrate`.** In `hydrate(saved)`, after the board is reconstructed, add `solution: solveBoard(board)` to the restored state.

- [ ] **Step 6: Typecheck + run store tests**

Run: `bun run typecheck && bun run test:run -- src/state`
Expected: clean + existing store tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/state/gameStore.ts
git commit -m "feat(state): solve and cache the puzzle solution at load/hydrate"
```

---

## Task 5: Mistakes counter + red cell + out-of-tries (TDD)

**Files:**
- Modify: `src/state/gameStore.ts`, `src/storage/db.ts`
- Test: `src/state/gameStore.mistakes.test.ts` (create)

- [ ] **Step 1: Add state fields** to `GameState` and initial state:

```ts
  mistakes: number          // strikes this round (persisted)
  readonly maxMistakes: number   // = 3
  mistakeCells: ReadonlySet<string>
  completedDigits: ReadonlySet<Digit>
  outOfTries: boolean
  mistakeFlashKey: number
```

Initial values: `mistakes: 0`, `maxMistakes: 3`, `mistakeCells: new Set()`, `completedDigits: new Set()`, `outOfTries: false`, `mistakeFlashKey: 0`.

- [ ] **Step 2: Add a progress-recompute helper** (module scope). It rebuilds the derived sets from board + solution and is safe to call after any mutation:

```ts
function recomputeProgress(
  board: GameBoard | null,
  solution: GameBoard | null,
): { mistakeCells: Set<string>; completedDigits: Set<Digit> } {
  const mistakeCells = new Set<string>()
  const completedDigits = new Set<Digit>()
  const g = gridOf(board)
  const sg = solution && solution.kind === 'grid' ? solution.grid : null
  if (!g || !sg) return { mistakeCells, completedDigits }
  const size = g.shape.size
  const placed = new Map<Digit, number>()
  const wrong = new Map<Digit, number>()
  for (let n = 1; n <= size; n++) { placed.set(n as Digit, 0); wrong.set(n as Digit, 0) }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = cellAt(g, { r, c }).value
      if (v === null) continue
      placed.set(v, (placed.get(v) ?? 0) + 1)
      if (v !== cellAt(sg, { r, c }).value) {
        mistakeCells.add(coordKey({ r, c }))
        wrong.set(v, (wrong.get(v) ?? 0) + 1)
      }
    }
  }
  for (let n = 1; n <= size; n++) {
    const d = n as Digit
    if (placed.get(d) === size && (wrong.get(d) ?? 0) === 0) completedDigits.add(d)
  }
  return { mistakeCells, completedDigits }
}
```

> This covers the classic/`kind:'grid'` path. For samurai, leave `mistakeCells`/`completedDigits` empty (the mistake feature targets standard boards; samurai still plays, just without strikes — consistent with the spec's fallback). Import `coordKey` from `@/engine` (already exported).

- [ ] **Step 3: Write the failing test.** Create `src/state/gameStore.mistakes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

const GIVENS = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
// solution[0][2] === 4, [0][1] === 3

function load() {
  useGameStore.getState().loadPuzzle({ id: 't', variant: 'classic', difficulty: 'easy', givens: GIVENS })
}

describe('mistakes', () => {
  beforeEach(load)

  it('counts a wrong number as a strike and marks the cell', () => {
    useGameStore.getState().select({ r: 0, c: 2 }) // empty cell, solution = 4
    useGameStore.getState().input(9)               // wrong
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(1)
    expect(s.mistakeCells.size).toBe(1)
  })

  it('does not strike a correct number', () => {
    useGameStore.getState().select({ r: 0, c: 2 })
    useGameStore.getState().input(4)               // correct
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(0)
    expect(s.mistakeCells.size).toBe(0)
  })

  it('correcting a wrong cell clears the mark but keeps the count', () => {
    useGameStore.getState().select({ r: 0, c: 2 })
    useGameStore.getState().input(9)               // wrong → 1
    useGameStore.getState().input(4)               // fix
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(1)
    expect(s.mistakeCells.size).toBe(0)
  })

  it('three strikes sets outOfTries', () => {
    const cells = [{ r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 5 }]
    for (const cell of cells) {
      useGameStore.getState().select(cell)
      useGameStore.getState().input(9)             // 9 is wrong in row 0
    }
    expect(useGameStore.getState().outOfTries).toBe(true)
  })
})
```

> If `9` happens to be correct for one of those cells, the test author should pick a digit known-wrong per cell using the solution; the intent (3 wrong placements ⇒ outOfTries) is what matters. The given puzzle is the canonical hard sudoku; its solution row 0 is `5 3 4 6 7 8 9 1 2`, so col 2→4, col 3→6, col 5→8 are all ≠ 9.

- [ ] **Step 4: Run the test, expect failure**

Run: `bun run test:run -- src/state/gameStore.mistakes.test.ts`
Expected: FAIL — fields undefined / counts wrong.

- [ ] **Step 5: Integrate into `input`.** Read the current `input(digit)` action. In the **value** branch, after the value is written and history updated, add (before the final `set(...)`):

```ts
// after writing `digit` into the selected cell of `next` board:
const sol = get().solution
const correct = solutionDigitAt(sol, selected)
let mistakes = get().mistakes
let mistakeFlashKey = get().mistakeFlashKey
if (correct !== null && digit !== correct) {
  mistakes += 1
  mistakeFlashKey += 1
}
const progress = recomputeProgress(nextBoard, sol)
const outOfTries = mistakes >= get().maxMistakes
// include in set({...}): mistakes, mistakeFlashKey,
//   mistakeCells: progress.mistakeCells, completedDigits: progress.completedDigits, outOfTries
```

Match the variable names already used for the post-mutation board/selection in that function.

- [ ] **Step 6: Recompute on `erase`, `undo`, `redo`.** In each, after the board mutation, add:

```ts
const progress = recomputeProgress(nextBoard, get().solution)
// include mistakeCells + completedDigits in the set({...}) (mistakes count unchanged)
```

- [ ] **Step 7: Guard input when out of tries.** At the very top of `input(digit)` (and `erase`), early-return if `get().outOfTries` is true.

- [ ] **Step 8: Reset on load.** In `loadPuzzle`, set `mistakes: 0, mistakeCells: new Set(), completedDigits: new Set(), outOfTries: false, mistakeFlashKey: 0` in the payload (alongside `solution`).

- [ ] **Step 9: Persist `mistakes`.** In `src/storage/db.ts` add `readonly mistakes?: number` to `SavedGame`. Where the store serialises to `SavedGame` (the save/persist path), write `mistakes`. In `hydrate`, restore `mistakes: saved.mistakes ?? 0`, then `const progress = recomputeProgress(board, solution)` to rebuild `mistakeCells`/`completedDigits`, and `outOfTries: (saved.mistakes ?? 0) >= 3`.

- [ ] **Step 10: Run tests, expect pass**

Run: `bun run test:run -- src/state/gameStore.mistakes.test.ts`
Expected: PASS.

- [ ] **Step 11: Render the red mistake cell.** In `src/ui/board/Cell.tsx`, read `mistakeCells` from the store and, when the cell's `coordKey` is in the set, colour its value with `--color-conflict` (mirror how conflict highlighting is already applied). Read the file first to match its prop/typing pattern.

- [ ] **Step 12: Typecheck + commit**

Run: `bun run typecheck && bun run test:run -- src/state`
```bash
git add src/state/gameStore.ts src/storage/db.ts src/ui/board/Cell.tsx src/state/gameStore.mistakes.test.ts
git commit -m "feat(game): strict-but-kind Mistakes X/3 with solution-based detection"
```

---

## Task 6: Digit-completion ding + completedDigits (TDD)

**Files:**
- Modify: `src/state/gameStore.mistakes.test.ts` (add cases)
- Note: `completedDigits` and its recompute already landed in Task 5; this task verifies it and wires the pad/sound.

- [ ] **Step 1: Add a completion test** to `gameStore.mistakes.test.ts`:

```ts
describe('completedDigits', () => {
  it('marks a digit done only when all of it is placed correctly', () => {
    // Use the fully-solved board minus one cell, then place the last correct digit.
    const solved = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
    const givens = solved.slice(0, 80) + '0' // last cell (8,8)=9 missing
    useGameStore.getState().loadPuzzle({ id: 't2', variant: 'classic', difficulty: 'easy', givens })
    useGameStore.getState().select({ r: 8, c: 8 })
    useGameStore.getState().input(9)
    expect(useGameStore.getState().completedDigits.has(9 as never)).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect pass** (logic already implemented in Task 5)

Run: `bun run test:run -- src/state/gameStore.mistakes.test.ts`
Expected: PASS. If it fails, fix `recomputeProgress` until green.

- [ ] **Step 3: Commit**

```bash
git add src/state/gameStore.mistakes.test.ts
git commit -m "test(game): completedDigits marks a number done when fully correct"
```

---

## Task 7: New sounds — `mistake`, `digitDone` (soft, no thud)

**Files:**
- Modify: `src/audio/themes.ts`, `src/audio/sound.ts` (if it re-declares `SoundEvent`), `src/audio/SoundController.tsx`

- [ ] **Step 1: Extend the `SoundEvent` union** in `src/audio/themes.ts`:

```ts
export type SoundEvent =
  | 'place' | 'pencil' | 'erase' | 'select' | 'tap' | 'reject' | 'win'
  | 'mistake' | 'digitDone'
```

If `src/audio/sound.ts` re-exports or re-declares `SoundEvent`, keep them in sync.

- [ ] **Step 2: Add specs for both events to all three theme maps** (`marimba`, `click`, `chime`). Add these entries to each `Record<SoundEvent, SoundSpec>`:

```ts
  // marimba
  mistake: { tones: [
    { wave: 'sine', freq: 311, dur: 0.18, attack: 0.004, gain: 0.5 },
    { wave: 'sine', freq: 247, dur: 0.22, offset: 0.08, attack: 0.004, gain: 0.45 },
  ] },
  digitDone: { tones: [
    { wave: 'triangle', freq: 784, dur: 0.16, offset: 0.0, gain: 0.6 },
    { wave: 'triangle', freq: 988, dur: 0.16, offset: 0.09, gain: 0.6 },
    { wave: 'triangle', freq: 1319, dur: 0.3, offset: 0.18, gain: 0.6 },
  ] },
```
```ts
  // click  (keep gentle — tones, not noise)
  mistake: { tones: [{ wave: 'sine', freq: 300, dur: 0.16, gain: 0.4 }, { wave: 'sine', freq: 240, dur: 0.2, offset: 0.07, gain: 0.36 }] },
  digitDone: { tones: [{ wave: 'sine', freq: 880, dur: 0.12, gain: 0.4 }, { wave: 'sine', freq: 1320, dur: 0.2, offset: 0.1, gain: 0.4 }] },
```
```ts
  // chime
  mistake: { tones: [{ wave: 'sine', freq: 330, dur: 0.2, gain: 0.45, detune: -20 }, { wave: 'sine', freq: 262, dur: 0.26, offset: 0.08, gain: 0.4 }] },
  digitDone: { tones: [{ wave: 'sine', freq: 880, dur: 0.18, gain: 0.6 }, { wave: 'sine', freq: 1175, dur: 0.18, offset: 0.1, gain: 0.55 }, { wave: 'sine', freq: 1568, dur: 0.34, offset: 0.2, gain: 0.5 }] },
```

- [ ] **Step 3: Audit the default set for "thud".** Confirm `marimba.place` is a tone (it is: triangle 392/784, no noise). Leave `marimba` as the default `soundTheme`. No change needed beyond confirming.

- [ ] **Step 4: Fire the new sounds in `SoundController.tsx`.** Add `'mistake'` and `'digitDone'` to the `SOUND_EVENTS` set. In the store-subscribe effect, add watchers:

```ts
const prevMistakeFlash = useRef(0)
const prevDone = useRef(0)
// inside the effect, after reading initial keys:
prevMistakeFlash.current = useGameStore.getState().mistakeFlashKey
prevDone.current = useGameStore.getState().completedDigits.size
// inside subscribe callback:
if (s.mistakeFlashKey !== prevMistakeFlash.current) {
  prevMistakeFlash.current = s.mistakeFlashKey
  playSound('mistake', {})
}
if (s.completedDigits.size > prevDone.current) {
  prevDone.current = s.completedDigits.size
  if (s.completedAt === null) playSound('digitDone', {}) // suppress when the puzzle also just finished → 'win' only
} else {
  prevDone.current = s.completedDigits.size
}
```

- [ ] **Step 5: Build + commit**

Run: `bun run typecheck && bun run build`
```bash
git add src/audio/themes.ts src/audio/sound.ts src/audio/SoundController.tsx
git commit -m "feat(audio): soft mistake + digit-complete sounds; fire on state change"
```

---

## Task 8: Number pad — remaining counts + grey-out done digits

**Files:**
- Modify: `src/ui/panels/InputPad.tsx`

- [ ] **Step 1: Read current board + completedDigits from the store** in `InputPad`. Compute remaining counts:

```ts
import { countPlaced } from '@/engine'
// inside the component:
const board = useGameStore((s) => s.board)
const completedDigits = useGameStore((s) => s.completedDigits)
const grid = board && board.kind === 'grid' ? board.grid : null
const placed = grid ? countPlaced(grid) : null
const size = /* current digit count, as already derived for the digit list */
const remaining = (d: number) => (placed ? Math.max(0, size - (placed.get(d as never) ?? 0)) : null)
```

> Reuse however `InputPad` already determines its digit range (6/9/16). For samurai (`board.kind !== 'grid'`) `placed` is null → show no count, never grey out.

- [ ] **Step 2: Render the count under each digit** and grey out done digits. For each digit button, below the numeral add:

```tsx
{remaining(d) !== null && (
  <span style={{ fontSize: 11 }} className={completedDigits.has(d as never) ? 'text-[color:var(--color-done)]' : 'text-[color:var(--color-text-faint)]'}>
    {completedDigits.has(d as never) ? '✓' : remaining(d)}
  </span>
)}
```

When `completedDigits.has(d)`, also disable the button (`disabled`) and apply the `--color-done` colour to the numeral. Match the existing button markup/classes rather than restructuring it.

- [ ] **Step 3: Build + commit**

Run: `bun run typecheck && bun run build`
```bash
git add src/ui/panels/InputPad.tsx
git commit -m "feat(ui): pad shows remaining count and greys out completed numbers"
```

---

## Task 9: Status row + live timer + manual pause

**Files:**
- Create: `src/ui/hooks/useElapsedTime.ts`, `src/ui/panels/StatusRow.tsx`
- Modify: `src/ui/pages/Play.tsx`

- [ ] **Step 1: Create the ticking timer hook** `src/ui/hooks/useElapsedTime.ts`:

```ts
import { useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'

export function useElapsedTime(): number {
  const elapsedMs = useGameStore((s) => s.elapsedMs)
  const resumeAt = useGameStore((s) => s.resumeAt)
  const paused = useGameStore((s) => s.paused)
  const [, tick] = useState(0)
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [paused])
  return paused || resumeAt === null ? elapsedMs : elapsedMs + (Date.now() - resumeAt)
}

export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Step 2: Create `src/ui/panels/StatusRow.tsx`** — difficulty · mistakes · timer + pause:

```tsx
import { useGameStore } from '@/state/gameStore'
import { useElapsedTime, formatClock } from '@/ui/hooks/useElapsedTime'
import { useT } from '@/i18n'

export function StatusRow({ difficultyLabel }: { difficultyLabel: string }) {
  const t = useT()
  const mistakes = useGameStore((s) => s.mistakes)
  const maxMistakes = useGameStore((s) => s.maxMistakes)
  const paused = useGameStore((s) => s.paused)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)
  const ms = useElapsedTime()
  return (
    <div className="flex items-center justify-between px-1 py-2 text-[color:var(--color-text-muted)]">
      <span>{difficultyLabel}</span>
      <span>
        {t.play.mistakes}: <span className={mistakes > 0 ? 'text-[color:var(--color-conflict)]' : ''}>{mistakes}</span>/{maxMistakes}
      </span>
      <button
        type="button"
        data-sound="tap"
        onClick={() => (paused ? resume() : pause())}
        className="inline-flex items-center gap-1 touch-target-sm"
        aria-label={paused ? t.play.resume : t.play.pause}
      >
        <span className="tabular-nums">{formatClock(ms)}</span>
        <span aria-hidden>{paused ? '▶' : 'II'}</span>
      </button>
    </div>
  )
}
```

> Use whatever difficulty label Play already computes (e.g. from `t.difficulty[...]`). The play page passes it in.

- [ ] **Step 3: Mount the status row** in `src/ui/pages/Play.tsx` between the top bar/Toolbar and the Board (around line 318–320). Pass the difficulty label. Relabel the action buttons (the InputPad mode / toolbar) so the row reads Undo · Redo · Erase · Notes, restyled in warm brown per the beige palette. Ensure pause/resume button and the existing auto-pause coexist (manual `pause()` then tab blur should not double-handle — the store already guards via `paused`).

- [ ] **Step 4: Build + visual check**

Run: `bun run build`
Then verify in the dev preview (see Task 12) that the status row shows difficulty, a live-ticking timer, and Mistakes 0/3.

- [ ] **Step 5: Commit**

```bash
git add src/ui/hooks/useElapsedTime.ts src/ui/panels/StatusRow.tsx src/ui/pages/Play.tsx
git commit -m "feat(ui): in-game status row with live timer, pause, and mistakes count"
```

---

## Task 10: Out-of-tries overlay (calm game-over)

**Files:**
- Create: `src/ui/panels/OutOfTries.tsx`
- Modify: `src/ui/pages/Play.tsx`

- [ ] **Step 1: Create `src/ui/panels/OutOfTries.tsx`:**

```tsx
import { useT } from '@/i18n'

export function OutOfTries({ onRetry, onNew }: { onRetry: () => void; onNew: () => void }) {
  const t = useT()
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[color:var(--color-bg)]/85" data-noselect="true">
      <div className="mx-6 max-w-sm rounded-2xl bg-[color:var(--color-surface)] p-6 text-center shadow-sm">
        <p className="text-lg text-[color:var(--color-text)]">{t.play.outOfTries}</p>
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" data-sound="tap" onClick={onRetry}
            className="touch-target rounded-xl bg-[color:var(--color-accent-button)] px-4 text-[color:var(--switch-on)]">
            {t.play.tryAgain}
          </button>
          <button type="button" data-sound="tap" onClick={onNew}
            className="touch-target rounded-xl border border-[color:var(--color-border-strong)] px-4 text-[color:var(--color-text)]">
            {t.play.newPuzzle}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into `Play.tsx`.** The board section is already positioned; render `{outOfTries && <OutOfTries .../>}` over it (ensure the board container is `relative`). Read `outOfTries` from the store. `onRetry` = reload the same puzzle from its givens (reuse the existing New-puzzle/load path with the current `puzzleId`/givens, which resets mistakes via Task 5 Step 8). `onNew` = the existing "new puzzle" navigation/action.

- [ ] **Step 3: Build + commit**

Run: `bun run typecheck && bun run build`
```bash
git add src/ui/panels/OutOfTries.tsx src/ui/pages/Play.tsx
git commit -m "feat(ui): calm out-of-tries overlay at 3 mistakes"
```

---

## Task 11: i18n keys (English + Malay)

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/ms.ts`

- [ ] **Step 1: Add keys under `play`** in `src/i18n/en.ts` (match the existing nesting):

```ts
    mistakes: 'Mistakes',
    notes: 'Notes',
    pause: 'Pause',
    resume: 'Resume',
    outOfTries: 'Out of tries this time. Want to try again?',
    tryAgain: 'Try this puzzle again',
    newPuzzle: 'New puzzle',
```

> If `newPuzzle` already exists elsewhere in the strings, reuse it instead of duplicating.

- [ ] **Step 2: Add the same keys to `src/i18n/ms.ts`** (Malay):

```ts
    mistakes: 'Kesilapan',
    notes: 'Nota',
    pause: 'Jeda',
    resume: 'Sambung',
    outOfTries: 'Habis percubaan kali ini. Mahu cuba lagi?',
    tryAgain: 'Cuba semula teka-teki ini',
    newPuzzle: 'Teka-teki baharu',
```

- [ ] **Step 3: Typecheck** (the `Strings = typeof en` type forces parity)

Run: `bun run typecheck`
Expected: clean — if `ms.ts` is missing a key, TS errors; add it.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/ms.ts
git commit -m "i18n: add mistakes, notes, timer, and out-of-tries strings (en + ms)"
```

---

## Task 12: Full verification + iPad smoke

**Files:** none (verification only)

- [ ] **Step 1: Typecheck, lint, unit tests, build**

Run: `bun run typecheck && bun run lint && bun run test:run && bun run build`
Expected: all green.

- [ ] **Step 2: E2E smoke (Playwright, iPad profile).** Add/extend an E2E spec under `e2e/` that: loads a classic puzzle; places a wrong number and asserts Mistakes shows 1/3 and the cell is red; completes one number and asserts its pad key is disabled/greyed; forces 3 mistakes and asserts the out-of-tries overlay with both buttons.

Run: `bun run e2e`
Expected: pass.

- [ ] **Step 3: Manual iPad-Safari smoke (per project workflow).** Verify on the dev preview: beige on every screen (home, catalog, play, settings, finish); no dark anywhere; a soft sound on select/place/pencil/erase/button taps; a gentle (non-buzzer) mistake sound; a bright ding when a number completes; the win fanfare on solve. Use the preview tools (`preview_start`, `preview_eval`, `preview_screenshot`) — see project memory: prefer `preview_eval` over `preview_screenshot` if the latter times out.

- [ ] **Step 4: Final commit / push** (auto-push per project rules)

```bash
git push origin main
```

---

## Self-review notes (coverage)

- Spec A (beige, no dark) → Tasks 1, 2. Spec B (layout/status/timer) → Tasks 8, 9, 10. Spec C (sounds) → Task 7. Spec D (mistakes) → Tasks 4, 5. Spec E (digit ding + counts) → Tasks 6, 8. i18n → Task 11. Tests/verification → Tasks 3, 5, 6, 12.
- Type consistency: `solveBoard`/`solutionDigitAt`/`recomputeProgress` defined in Task 4–5 and consumed in the same store; `countPlaced` (Task 3) consumed in Task 8; `mistakeFlashKey`/`completedDigits` (Task 5) consumed in Task 7; `useElapsedTime`/`formatClock` (Task 9) consumed in `StatusRow`.
- Known fallbacks called out: samurai boards skip strikes/ding (mistake feature targets `kind:'grid'`); if a solve fails, `solution` is null and no strikes are counted (matches spec's graceful fallback). Revisit big-grid solve performance during Task 4/12 if the load feels janky (Web Worker is the documented mitigation).
