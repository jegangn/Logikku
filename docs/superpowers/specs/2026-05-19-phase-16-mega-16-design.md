# Phase 16 — Mega 16×16 Design

> **Status:** Approved 2026-05-19. Drives `prompts/phase-16-mega-16.md`.
> **Scope:** Classic Sudoku on a 16×16 grid with 4×4 boxes. Variant key: `mega-16`.

## Goal

Ship Mega 16×16 as a real, playable variant. Reuse the existing classic constraint at `size=16`. Verify the engine's N-parametric promise (Phase 0) and the Python generator's parametric path (Phase 10) hold at N=16. Ship pre-generated puzzle banks (5 bands × 50 puzzles), a hex-aware UI, and an iPad-friendly board.

## Non-goals

- New constraint kind. Mega is `classic` with `size=16, boxRows=4, boxCols=4`.
- Variant select UI (deferred — phase 18 territory).
- Capacitor / native wrap considerations.
- App Store binary changes.

## Scope decisions (locked)

| Decision | Choice |
|---|---|
| Bank scope | 5 bands × 50 puzzles (`very-easy`, `easy`, `medium`, `hard`, `expert`) |
| Glyph mapping | 1-9 + A-G (matches engine's existing `serializePuzzle` convention via `String.fromCharCode(55 + v)`) |
| Orientation | Auto-fit both portrait and landscape, no lock |
| Pencil marks | 4×4 mini-grid layout when `gridSize > 9` |

## Architecture

```
┌─ gen/ (Python) ──────────────────────────────────────────────┐
│  grid.py:  add CLASSIC_16; teach grid_to_string &            │
│            string_to_grid to round-trip 1-9 + A-G            │
│  mega.py:  new — mirror mini.py; ships MEGA_DIFFICULTY_BANDS │
│  registry.py + cli.py:  register "mega-16"                   │
│  scripts/phase16_banks.sh:  5 bands × 50 puzzles             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼  (commit JSON banks)
┌─ src/puzzles/ ───────────────────────────────────────────────┐
│  mega-16/{very-easy,easy,medium,hard,expert}.json            │
│  Auto-discovered by existing index.ts (no code change)       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ src/engine/ ────────────────────────────────────────────────┐
│  grid.ts:           CLASSIC_16 already exists; no change     │
│  parsePuzzle:       already handles A-G; add round-trip test │
│  constraints/classic.ts:  parametric, no change              │
│  solver/grader:     parametric, no change (cage45 already    │
│                     gates on size===9)                       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ src/state/ ─────────────────────────────────────────────────┐
│  gameStore.ts: extend shapeForVariant('mega-16')→CLASSIC_16; │
│                constraintsForVariant returns plain classic    │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ src/ui/ ────────────────────────────────────────────────────┐
│  glyph.ts (new): glyphForDigit, digitFromGlyph               │
│  board/Cell.tsx: use glyphForDigit; switch pencil layout     │
│                  3×3 (size≤9) ↔ 4×4 (size>9)                 │
│  panels/InputPad.tsx: 16-digit pad in 4-col grid, hex labels │
└──────────────────────────────────────────────────────────────┘
```

Three principles guide the boundaries:

1. **Engine stays untouched.** N-parametric work was done in Phase 0 and validated by Mini 6×6 in Phase 10. Mega is the second canary — we trust the engine and only add tests that prove it.
2. **Display logic centralized.** A single `glyph.ts` module is the only place that knows `10 → "A"`. `Cell`, `InputPad`, and any future read-out (e.g. saved-game preview) call it.
3. **Variant key as router, not as constraint.** `mega-16` is purely a UI/storage key. Internally the constraint stack is `[classicConstraint(shape=CLASSIC_16)]`. No new constraint kind, no new region computation.

## Components

### `src/ui/glyph.ts` (new)

Single source of truth for digit↔display character mapping.

```ts
export function glyphForDigit(digit: Digit): string
// 1..9 → '1'..'9'; 10..16 → 'A'..'G'; throws on out-of-range.

export function digitFromGlyph(ch: string): Digit | null
// '1'..'9' → 1..9; 'A'..'G'/'a'..'g' → 10..16; else null.
```

Pure function, no React/DOM dependencies. Standalone util because at least three call sites (Cell value render, Cell pencil labels, InputPad button labels) plus future read-only mini-board for saved-game tiles.

### `src/ui/board/Cell.tsx` (modified)

1. Add new prop: `readonly gridSize: number`. `Board` passes `gridSize={size}` (it already has `size = grid.shape.size`).
2. Value glyph: `{value}` → `{glyphForDigit(value)}`.
3. `PencilMarks` accepts the new `gridSize` and chooses layout: 3×3 when `gridSize <= 9`, 4×4 when `gridSize > 9`. For 4×4 layout, font shrinks proportionally (~`cellSize * 0.14` vs current `0.18`), slot is `cellSize / 4`. Iteration bound becomes `for (let d = 1; d <= gridSize; d++)`.

Layout determined by grid shape, not by current candidate count — a 16×16 cell with a single remaining candidate should still use 4×4 layout for muscle memory.

### `src/ui/panels/InputPad.tsx` (modified)

```ts
const cols = size === 6 ? 'grid-cols-4'
           : size === 9 ? 'grid-cols-5'
           : 'grid-cols-4'   // size=16: 4×4 digit grid + 1 row for erase
```

Digit button labels use `glyphForDigit(d)`. Font drops one notch (`text-xl` instead of `text-2xl`) for `size=16` so 16 buttons fit on iPad portrait. ARIA label uses the glyph: `aria-label={\`Digit ${glyphForDigit(d)}\`}`.

### `src/state/gameStore.ts` (modified)

1. `shapeForVariant`: add `if (variant === 'mega-16') return CLASSIC_16` before the default.
2. `constraintsForVariant`: no new branch — `mega-16` falls through to default `return [classic]`.
3. Keyboard input handler: replace `parseInt(key, 10)` digit detection with `digitFromGlyph(key)`, with `<= grid.shape.size` upper bound (so A-G keys are ignored on 9×9).

### `gen/src/generator/mega.py` (new)

Copy of `mini.py` with:

- Import `CLASSIC_16` from `grid`.
- `MEGA_DIFFICULTY_BANDS`:
  ```py
  MEGA_DIFFICULTY_BANDS = {
      "very-easy": (1.0, 1.4, 130),
      "easy":      (1.5, 2.4, 160),
      "medium":    (2.5, 3.9, 185),
      "hard":      (4.0, 5.9, 200),
      "expert":    (6.0, 7.9, 210),
  }
  ```
  256-cell grid vs 81. Removal targets scale ~3.2× from classic; SE bands stay the same since SE is technique-driven.
- Default shape `CLASSIC_16`, ID prefix `mega-16-...`.

### `gen/src/generator/grid.py` (modified)

- Add `CLASSIC_16 = Shape(size=16, box_rows=4, box_cols=4)`.
- `grid_to_string`: emit hex for 10-16. Mirror TS `serializePuzzle`: `'0' if v==0 else str(v) if v<=9 else chr(55+v)`.
- `string_to_grid`: parse '1'-'9' as digits, 'A'-'G'/'a'-'g' as 10-16 when `shape.size > 9`. Drop the `if shape.size <= 9 and not ch.isdigit()` guard; explicit branch.

### `gen/src/generator/registry.py` / `cli.py` (modified)

Register `mega-16` → `generate_mega` and `MEGA_DIFFICULTY_BANDS`.

### `gen/scripts/phase16_banks.sh` (new)

Mirror `phase15_banks.sh`. One block per band, plus final `promote` step into `src/puzzles/mega-16/`.

### Deliberately NOT components

- New constraint file. Classic at `size=16` is just a parameter change.
- New overlay. Base board render is sufficient.
- New test fixture loader. `src/puzzles/index.ts` already auto-discovers.

## Data flow

### Puzzle load

```
User selects "Mega 16×16 / easy"
        │
        ▼
gameStore.startGame({ variant: 'mega-16', difficulty: 'easy', seed })
        │
        ▼
pickPuzzle('mega-16', 'easy', seed)
        │  (reads src/puzzles/mega-16/easy.json via import.meta.glob)
        ▼
PuzzleRecord { givens: "12.A.0.G.....", size: 16, ... }
        │
        ▼
freshGridFromGivens(record.givens, 'mega-16')
        │
        ├── shapeForVariant('mega-16') → CLASSIC_16
        ├── constraintsForVariant('mega-16') → [classicConstraint(CLASSIC_16)]
        ├── parsePuzzle(givens, CLASSIC_16)
        │     ├── for each char: hex branch already exists
        │     │   '1'-'9' → 1-9, 'A'-'G' → 10-16
        │     └── peer-elim runs against 16×16 classic peers
        └── return Grid { shape: CLASSIC_16, cells: 16×16, constraints }
        │
        ▼
Board renders 16×16 SVG; Cell components use glyphForDigit for display
```

**Critical invariant:** the givens string is exactly 256 chars. `parsePuzzle` throws on mismatch. The puzzle record's `size: 16` field is for bank validation; the grid shape comes from `shapeForVariant`, not from the record. These two must agree — checked by bank validation.

### User input — value entry

```
User taps digit button "C" (or presses 'C' on keyboard)
        │
        ▼
InputPad onDigit(12)
        │
        ▼
gameStore.applyValue(selected, 12)
        │
        ├── conflict check (classic constraint validates)
        ├── undo stack push
        └── cell.value = 12, cell.candidates.clear()
        │
        ▼
Cell re-renders: glyphForDigit(12) → "C"
```

Keyboard path:
```ts
const digit = digitFromGlyph(key)
if (digit !== null && digit >= 1 && digit <= grid.shape.size) {
  applyValue(selected, digit)
}
```
The `<= grid.shape.size` guard means 'F' / 'G' do nothing on a 9×9 — same UX as today where '0' does nothing.

### User input — pencil marks

Same flow, except `applyCandidate` toggles `cell.candidates`. PencilMarks receives updated `candidates: Set<Digit>` and renders each digit at its 4×4 slot via `glyphForDigit`.

4×4 layout (digit → grid position):
```
1 2 3 4
5 6 7 8
9 A B C
D E F G
```
`slotR = Math.floor((d-1)/4)`, `slotC = (d-1) % 4`.

### Generator → app handoff

```
gen/scripts/phase16_banks.sh
   │
   ▼
bun tools/grade.ts   (long-running subprocess via GraderBridge)
   │
   ▼
gen/out/mega-16/*.jsonl   (one line per puzzle, raw)
   │
   ▼  $PYTHON -m generator promote --src gen/out/mega-16 --dest src/puzzles/mega-16
   │
   ▼
src/puzzles/mega-16/*.json   (JSON arrays, committed)
   │
   ▼  (next `bun run build` picks them up via import.meta.glob)
   │
   ▼
Bank validation in src/puzzles/index.ts runs at module load:
   - typeof record.size === 'number'  ✓
   - record.difficulty matches filename  ✓
   - givens is a string  ✓
```

**Critical invariant in JSONL → JSON pipeline:** the `givens` string preserves hex glyphs verbatim. `grid_to_string` emits 'A'-'G'; TS `parsePuzzle` reads them. The grader subprocess (`bun tools/grade.ts`) round-trips via its own `parsePuzzle`, which already handles `size > 9`.

## Error handling

### Generation-time

- **`grid_to_string` / `string_to_grid` rejection on out-of-range digit.** `string_to_grid` raises `ValueError` on any char not in `{'0', '.', '1'-'9'}` or (when `size > 9`) `{'A'-'G', 'a'-'g'}`. No try/except in callers — these are bugs that should crash loudly.
- **Grader subprocess pipe pressure.** Already mitigated in `grader_bridge.py` via `RESTART_EVERY = 3000`. No change.
- **Long runs and partial progress.** Shell script writes JSONL incrementally (`f.flush()` per puzzle). Interruption at puzzle 23/50 leaves 23 valid records. Resume script is out of scope but trivial to add later (mirror `phase15_banks_resume.sh`).
- **Acceptance rate falls off a cliff at expert.** Likely (Phase 15's palindrome diabolical collapsed to 0.02-0.1%). Each band runs independently with its own seed. If `expert` stalls for 6+ hours we ship a trimmed count and document in GOTCHAS. Script has no wall-clock cap — manual monitoring.

### Build-time

- **TS strict mode.** `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` on. `glyphForDigit(digit: Digit): string` no nullable. `digitFromGlyph(ch: string): Digit | null` — callers handle null branch.
- **Out-of-range Digit at compile time.** `Digit` stays loose (numeric, runtime-bounded by `grid.shape.size`). `glyphForDigit` throws on `< 1 || > 16` — matches `parsePuzzle`'s runtime-check convention.
- **Bank validation.** Existing checks suffice. No new field validation — grid construction will throw at load if givens length is wrong.

### Runtime

- **Invalid keyboard input.** `digitFromGlyph(key) === null` → silent ignore. Matches today's behavior for non-digit keys.
- **Bank missing for a difficulty.** `pickPuzzle('mega-16', 'expert', ...)` throws via `getBank`. Variant-select UI (Phase 18) is responsible for not offering bands that don't exist. Phase 16 ships whatever generates successfully; `hasBank` gates the menu later.
- **Save/restore round-trip with hex givens.** `serializePuzzle` already emits hex; `parsePuzzle` already reads it. One vitest case asserts `serializePuzzle(parsePuzzle(hexString, CLASSIC_16)) === hexString`.
- **iPad render performance.** 256 cells × ~5 SVG nodes/cell = ~1300 nodes (vs ~400 for 9×9). Modern iPad handles thousands fine. `React.memo` on `Cell` already exists. Revisit only if iPad smoke test shows lag.
- **Cell touch target on portrait at ~30px.** Below iOS 44px guideline. Accepted because (a) landscape is ~45px and acceptable, and (b) tap-zone overlay would complicate render. Open item for iPad readability test.

### Out of scope

- Network errors (no network).
- Concurrent writes to IndexedDB (single-tab assumption).
- Corrupted bank graceful degradation (fail-fast at module load).

## Testing

### Engine unit (vitest)

**`src/engine/grid.test.ts` — additions:**
- `parsePuzzle` round-trip at N=16: build a 256-char hex string, parse, serialize, assert equality.
- `parsePuzzle` rejects out-of-range hex chars ('H' at size=16).
- `peersOf` at N=16 returns 35 peers (15 row + 15 col + 5 box, deduped).

**`src/engine/constraints/classic.test.ts` — add 1 case:**
- Build `CLASSIC_16` grid, place digit 12 at (0,0), run `classicPropagate`, assert peer cells lose candidate 12.

**`src/engine/solver/techniqueSolver.test.ts` — add 1 case:**
- Inline fixture: near-solved 16×16 board that nakedSingle + hiddenSingle finish. Assert `techniqueSolve` returns `solved: true`.

**`src/engine/grader/se.test.ts` — add 1 case:**
- Same fixture, assert SE in `[1.0, 3.0]` (single-tier puzzle). No exact-SE assertion.

`cage45` already gates on `size === 9` and returns null — no new test.

### UI unit (vitest + RTL)

**`src/ui/glyph.test.ts` (new):**
- `glyphForDigit(1..9)` → '1'..'9'; `(10..16)` → 'A'..'G'.
- `glyphForDigit(0)` and `(17)` throw.
- `digitFromGlyph('1'..'9')` → 1..9; `('A'..'G')` and `('a'..'g')` → 10..16 (case-insensitive).
- `digitFromGlyph('H')`, `('')`, `('AA')` return null.

**`src/ui/board/Cell.test.tsx` — additions:**
- Render Cell with `value=12`, assert text content is "C".
- Render Cell with `value=null, candidates={10, 11, 12}, gridSize=16`, assert three text nodes 'A','B','C' at expected 4×4 slot positions.

**`src/ui/panels/InputPad.test.tsx` — add 1 case:**
- Render with `size={16}`, assert 16 digit buttons with labels '1' through 'G'. Click 'C' → `onDigit` called with 12.

### End-to-end (Playwright)

**`e2e/mega-16.spec.ts` (new):**
- Navigate to Mega 16×16 game (URL or programmatic seed).
- Assert 256 cells rendered.
- Tap (0,0), tap digit 'C' on InputPad, assert cell text becomes 'C'.
- Press 'F' on keyboard, tap another cell, assert it shows 'F'.

### Manual iPad smoke (gates the phase)

- Mega 16 puzzle on iPad Safari.
- **Portrait & landscape:** readability and tap accuracy.
- Enter hex digits (A-G) via pad and keyboard. Confirm display + pencil marks.
- Save game, force-quit Safari, reopen, confirm puzzle resumes.
- Document orientation decision in `docs/GOTCHAS.md`.

### Deliberately NOT tested

- Every existing technique at N=16. Techniques are size-parametric; one solver-fixture test catches regressions.
- Generator correctness at N=16. The grader subprocess certifies output; no vitest re-solve.
- Cross-variant regression. Existing Phase 0-15 suite covers this. Full `bun run test:run` + `bun run e2e` gates the merge.

## Acceptance criteria

- [ ] `gen/src/generator/mega.py` registered and CLI-invokable: `cd gen && .venv/bin/python -m generator gen mega-16 -n 5 -d easy --out tmp.jsonl` produces 5 valid puzzles.
- [ ] `src/puzzles/mega-16/{very-easy,easy,medium,hard,expert}.json` exists with target counts (or documented trim).
- [ ] `bun run typecheck` clean.
- [ ] `bun run lint` clean.
- [ ] `bun run test:run` all green, including new N=16 cases.
- [ ] `bun run build` produces 16×16 puzzle bundle in dist.
- [ ] `bun run e2e` all green, including `mega-16.spec.ts`.
- [ ] iPad portrait & landscape readability test documented (screenshots optional).
- [ ] No regression in any 9×9 or 6×6 variant (existing test/e2e suite is the proof).
- [ ] GOTCHAS.md updated if any new quirks surfaced (bank trim, orientation behavior, etc).
