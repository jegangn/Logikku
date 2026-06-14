# Beige redesign + sounds + 3-mistake limit — design

> Date: 2026-06-14 · Status: approved (design), pending spec review
> Audience: the app is for a 60-year-old, non-technical primary player. Calm, large-touch, never harsh.

## Goal (plain language)

Four changes, all driven by the founder's request and the reference screenshots:

1. **One warm beige theme everywhere. Delete dark mode entirely.**
2. **A soft sound on every action — never a "thud like a board".**
3. **A celebratory ding when a number is fully completed across the board.**
4. **A "Mistakes: X/3" limit** that ends the round kindly after three real mistakes.

## Decisions locked

- **Mistake model = strict & kind.** A placed number that differs from the puzzle's real solution turns red and counts as one strike. The wrong number stays visible (red) until the player retypes or erases it.
- **At 3 strikes**, show a calm "out of tries" screen (no "GAME OVER"): *Try this puzzle again* / *New puzzle*. No ads, no "watch to continue".
- **Buttons = match the look only.** Undo, Redo, Erase, Notes. No Hint / Fast Note this round (listed under Future).
- **Theme is single and fixed.** No light/dark/system choice remains in Settings.
- **Sound defaults ON**, soft melodic set, no noise-burst placement sound.

## Non-goals / out of scope

- Hint button, Fast Note (auto-candidates) — future, easy to bolt on later.
- Changing puzzle generation or the committed puzzle banks (no answer key is added to JSON; the app solves at load instead).
- Backend, accounts, analytics — permanently out per project bible.
- Re-theming the killer-cage pastel tints beyond what's needed for legibility on cream.

---

## A. Beige theme (delete dark mode)

### Palette (final, AA-verified during build)

Replaces the current dark `@theme` defaults and the `html[data-theme="light"]` block in `src/index.css`. The beige values become the **only** palette (set directly in `@theme`).

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#EFE7D6` | page background (warm cream) |
| `--color-surface` | `#FCF8F0` | board cells, cards |
| `--color-surface-2` | `#F3EBDA` | raised panels |
| `--color-surface-3` | `#EAE0CC` | wells, skeletons |
| `--color-border` | `#E2D6BC` | thin borders |
| `--color-border-strong` | `#C8B690` | emphasised borders |
| `--color-grid-line` | `#E2D4B8` | thin cell gridlines |
| `--color-grid-box` | `#B59A73` | bold 3×3 box lines |
| `--color-board-frame` | `#A98E63` | outer board frame |
| `--color-text` | `#463526` | body text (≈8:1 on cream) |
| `--color-text-muted` | `#8A6A4A` | secondary text (status row) |
| `--color-text-faint` | `#A98E63` | hints |
| `--color-accent` | `#9C6233` | active state, selected tab |
| `--color-accent-button` | `#875327` | solid CTA bg (white text ≥4.5:1) |
| `--color-given` | `#463526` | puzzle clue digits (deep brown) |
| `--color-entered` | `#A8703C` | player-entered digits (terracotta; large-text ≥3:1) |
| `--color-conflict` | `#C0533C` | wrong/mistake digit (warm red) |
| `--color-conflict-soft` | `rgba(192,83,60,0.14)` | mistake cell tint |
| `--color-peer` | `rgba(180,150,110,0.18)` | row/col/box highlight of selection |
| `--color-same-value` | `rgba(156,98,51,0.16)` | same-number highlight |
| `--color-selection` | `#F6C99A` | selected cell (peach) |
| `--color-success` | `#5E7D33` | completion / "done" positive |
| `--color-done` | `#C7B79A` | greyed-out finished digit on pad |

Killer cage tints (`--cage-1..6`): keep current rgba pastels (already legible on warm-white); re-check contrast on `#FCF8F0` during build.

### Files to change

- `src/index.css`: move beige values into `@theme`; **delete** the `html[data-theme="light"]` block; set base `html { color-scheme: light }` (was `dark`).
- `src/theme.ts`: remove `resolveTheme`/`watchSystemTheme` dark logic. Either delete the module and its call sites, or reduce `applyTheme` to a no-op that always sets `data-theme="light"` (pick the smaller diff at build time).
- `src/state/settingsStore.ts`: remove the `theme` field (and its persistence in `SavedSettings`). Migrate gracefully — ignore any stored `theme` value.
- `src/ui/pages/Settings.tsx`: remove the Theme dropdown.
- App startup (where `applyTheme`/`watchSystemTheme` are wired): remove the system-theme watcher.
- Any `data-theme` / dark references elsewhere: remove. Verify with a repo search for `dark`, `data-theme`, `prefers-color-scheme`, `theme`.

### Scope note

The beige palette is consumed through CSS variables already, so **every screen** (home, catalog, play, settings, finish) recolours automatically once the variables change. Spot-check each screen for any hardcoded color that bypasses the variables.

---

## B. Game screen layout (match the screenshot)

Target: `src/ui/pages/Play.tsx` (composes `Toolbar`, `Board`, `InputPad`, completion banner).

1. **Top bar** — back (left), settings gear (right). Drop the reference app's palette icon (no theme switching). The existing `Toolbar` can be slimmed or replaced with this two-icon bar plus the New-puzzle action relocated.
2. **Status row** (new, inserted between top bar and board): `difficulty label · Mistakes: X/3 · timer + pause`. Muted brown, calm, non-judgmental. The "X" in the mistakes count turns warm-red once X ≥ 1.
3. **Live timer** (new): add a `useElapsedTime()` hook — reads `elapsedMs`, `resumeAt`, `paused`; ticks every 500ms via `setInterval`; computes `paused ? elapsedMs : elapsedMs + (Date.now() - resumeAt)`; formats `mm:ss`. A pause/resume button sits beside it (today pause is auto-only on tab blur; add a manual toggle).
4. **Board** — unchanged structure; recoloured by the palette. Large, readable, generous targets (existing large-touch work stands).
5. **Action row** — Undo · Redo · Erase · Notes as icon+label buttons in warm brown. "Notes" is the existing pencil mode toggle, relabeled and restyled.
6. **Number pad** — each digit shows a small **remaining** count beneath it (see E). When a digit is finished it greys out with a check and stops accepting input.

---

## C. Sounds (every action, soft, no thud)

Infrastructure already exists: `src/audio/{synth,themes,sound}.ts` + `src/audio/SoundController.tsx`. Sound defaults ON (`soundEnabled: true`), default set `marimba` (melodic, no noise burst — this is the non-thud default; the noise-burst `click` set is the "board thud" and stays available but is not default).

### Event coverage

Confirm a sound fires for every action. Existing events: `place, pencil, erase, select, tap, reject, win`. **Add two events**: `mistake`, `digitDone`. Add specs for all three sets (`marimba`, `click`, `chime`) so the `Record<SoundEvent, SoundSpec>` type stays complete.

- `select` — soft tap on cell select
- `place` — gentle marimba note on value placement (existing; pitch may step by digit)
- `pencil` — softer note on pencil mark
- `erase` — gentle low note
- `tap` — soft tap for toolbar/action/nav buttons (Undo, Redo, mode, New, back, settings)
- `reject` — soft "can't place here" (locked/invalid drop) — keep, ensure gentle, not buzzy
- `mistake` (new) — gentle, slightly down-inflected "oh" tone. **Not** a harsh buzzer.
- `digitDone` (new) — bright, happy 2–3 note ding (celebratory but short)
- `win` — existing warm rising fanfare on full completion

### Rule

No event may use a bare percussive noise burst as its primary sound in the default set. Audit `themes.ts.marimba` so placement = tone, not thud.

---

## D. Mistakes: X/3 (strict & kind)

### Getting the solution

At `loadPuzzle(...)` in `src/state/gameStore.ts`, compute the full solution once:

- Classic/variant grids: `backtrackingSolve(grid, { maxSolutions: 1 }).solutions[0]`.
- Samurai: `samuraiBacktrackingSolve(board, { maxSolutions: 1 }).solvedBoard`.
- Store as a new state field `solution: GameBoard | null` (not persisted; recomputed on `hydrate`).
- Wrap in try/catch and a soft time guard. **Fallback:** if no solution is available (solve failed or too slow), the mistake counter falls back to conflict-based detection (a move is a mistake only when it actually clashes on the board). See Risks.

### Detection & counting

New state: `mistakes: number` (persisted), `maxMistakes: number = 3`, `mistakeCells: ReadonlySet<string>`, `outOfTries: boolean`, `mistakeFlashKey: number`.

On `input(digit)` in value mode, after writing the value:
- If `solution` known and `value !== solution[cell]` → it's a mistake: add cell to `mistakeCells`, `mistakes += 1`, bump `mistakeFlashKey`, fire `mistake` sound. The wrong value **stays** (rendered red via `mistakeCells`).
- If the player later places the correct value (or erases) → remove the cell from `mistakeCells`. (The strike is **not** refunded — count only ever goes up within a round.)
- When `mistakes >= maxMistakes` → set `outOfTries = true`, block further board input.

### Out-of-tries screen

Calm overlay on the play screen (reuse completion-banner styling, warm tone):
- Heading: gentle copy (e.g. "Out of tries this time").
- Actions: **Try this puzzle again** (reset board to givens, clear `mistakes`/`mistakeCells`/`completedDigits`, reset timer, keep same puzzle) and **New puzzle** (load next / go to picker).
- No harsh language, no failure imagery.

### Coexistence

`highlightConflicts` (live rule-violation highlight) and `strictMode` (optional cell-lock + shake) remain independent existing settings; default unchanged. The new mistake system is always on. Both the conflict highlight and the mistake cell use the same warm red; a mistake is counted once at placement, conflicts are a live visual — no double counting.

### Persistence

Add `mistakes` to the persisted `SavedGame` (in `src/storage/`). On `hydrate`, recompute `solution` (re-solve) and `completedDigits` (derive from board+solution); restore `mistakes`; recompute `mistakeCells` by comparing current board to solution.

---

## E. Digit-completion celebration

### Remaining counts (pad)

Add a pure helper in the engine (e.g. `src/engine/grid.ts`): `countPlaced(grid): Record<Digit, number>` and derive `remaining[d] = N - placed[d]`. `InputPad` reads the grid from the store and shows `remaining[d]` under each digit.

### "Done" detection

New state: `completedDigits: ReadonlySet<Digit>`.

A digit `d` is **done** when `placed[d] === N` **and** every placed `d` matches the solution (no `d` is in `mistakeCells`). Recompute after each `input`. When a digit newly enters `completedDigits`:
- Fire `digitDone` sound (the celebratory ding).
- The pad key for `d` greys out (`--color-done`), shows a check, and rejects further input for `d`.

If a `done` digit later becomes not-done (e.g. an entry erased), it leaves `completedDigits` and the key re-enables (no sound).

Full-puzzle completion still sets `completedAt` and fires `win` (existing path), which coincides with the last digit's `digitDone`. Resolution: when a placement both finishes a digit **and** completes the puzzle, suppress that final `digitDone` and play `win` only.

---

## Data/state summary (new fields in `gameStore`)

| Field | Type | Persisted | Notes |
|---|---|---|---|
| `solution` | `GameBoard \| null` | no | solved at load / re-solved on hydrate |
| `mistakes` | `number` | yes | strikes this round |
| `maxMistakes` | `number` | no | constant 3 |
| `mistakeCells` | `ReadonlySet<string>` | no | derived from board vs solution |
| `outOfTries` | `boolean` | no | `mistakes >= maxMistakes` |
| `mistakeFlashKey` | `number` | no | re-trigger red flash + `mistake` sound |
| `completedDigits` | `ReadonlySet<Digit>` | no | drives ding + pad grey-out |

Sound enum (`src/audio/themes.ts`): `SoundEvent` gains `mistake | digitDone`; all three theme maps updated.

i18n (`src/i18n/en.ts` + `src/i18n/ms.ts`, kept in sync by the `Strings` type): add keys for `mistakes`, `notes`, the out-of-tries heading, `tryAgain`, `newPuzzle` (reuse if present), `pause`/`resume` labels.

---

## Testing

- **Engine (vitest, required):** `countPlaced` correctness across sizes (6/9/16); solution retrieval via `backtrackingSolve` for a sampling of variants; mistake detection (value vs solution) and `completedDigits` logic as pure functions where extracted.
- **Store (vitest):** placing a wrong digit increments `mistakes` and adds to `mistakeCells`; correcting it removes the cell but keeps the count; reaching 3 sets `outOfTries`; finishing a digit adds to `completedDigits`.
- **E2E (Playwright, iPad profile):** load a classic puzzle, place a wrong number → red + Mistakes 1/3; complete a number → it greys on the pad; reach 3 mistakes → calm screen with both buttons.
- **Manual iPad-Safari smoke** (per project workflow): beige on every screen, sounds soft on every action, no dark anywhere.

## Risks & mitigations

- **Solve time on big grids (Mega-16, Samurai) blocking the main thread at load.** 9×9 solves are sub-millisecond; 16×16/Samurai backtracking may take longer. Mitigation order: (1) solve synchronously at load with try/catch — acceptable for the variants the primary player uses; (2) if testing shows jank, solve in a Web Worker or defer to `requestIdleCallback` with mistakes disabled until ready; (3) fallback to conflict-based mistake detection if no solution is available. The fallback keeps the feature working everywhere, just less strict for unsolved-at-load grids.
- **Two reds (conflict highlight vs mistake) confusing the player.** Same hue, single count at placement; acceptable. Revisit if it reads as noisy.
- **Stored `theme` setting from old installs.** Ignore on load; no migration needed.

## Future (not now)

- Hint button (reveal one correct cell from the cached solution — the infrastructure is already here once solution-at-load lands).
- Fast Note (auto-fill candidate pencil marks).
- Optional hide-timer setting if the timer ever feels like pressure.

## Suggested build order (for the plan)

1. Beige theme + delete dark (visible win, low risk, unblocks visual review).
2. Solution-at-load + `countPlaced` engine helper (+ tests).
3. Mistakes counter + red cell + out-of-tries screen.
4. Digit-completion ding + pad remaining counts + grey-out.
5. New sounds (`mistake`, `digitDone`) + audit default set for thud.
6. Status row + live timer + manual pause; relabel action row.
7. i18n (EN/MS), full test pass, iPad smoke.
