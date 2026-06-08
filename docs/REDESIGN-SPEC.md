# Logikku Redesign Spec (Authoritative)

> Single source of truth for the calm-minimal visual/layout redesign. Merges all four panel slices and resolves every adversarial-critique conflict. **Visual/layout only — no behavior, engine, store, or test-id removals.** All existing `data-testid` / `aria-*` / `role` attributes are preserved; new test-ids are additive.

---

## 1. Design principles

1. **Calm paper, not a Skinner box.** Warm-paper light mode (board reads as a white sheet on paper); deep restful dark. No streaks, no confetti, no neon. Motion subtle (150–300 ms), `prefers-reduced-motion` already globally honored.
2. **Board readability above all.** Three-tier gridline hierarchy (cell → box → frame) double-encoded by color *and* stroke width so older eyes read box boundaries instantly. Selection/peer/same-value/conflict states are bold and unambiguous.
3. **Large touch.** Every interactive control ≥ 44×44 px; primary play controls 48–64 px. ≥ 8 px spacing between targets.
4. **One clear hierarchy.** One `<h1>` per screen, body text ≥ 16 px on the older-persona screens, one primary CTA per screen, `tabular-nums` on all digits/timers.
5. **One scale, one radius, one token set.** Single spacing rhythm (4/8 px), **single control radius = 16 px (`rounded-2xl`)**, single height scale, single set of board tokens. Semantic tokens only — no raw hex/rgba in components.
6. **Two-column play on iPad-class landscape only.** Board left (height-capped), controls right (fixed column). Gated on orientation **and** short-side ≥ 600 px so iPhone landscape stays single-column (never shrinks a 9×9 board to sub-pixel gridlines).

### Conflict resolutions (critique → decision)

| Conflict | Decision |
|---|---|
| Two cell-state token sets (Slice 1 `cell-peer/cell-same` vs Slice 3 `peer/same-value/selection`) | Keep **Slice 3 names**: `--color-peer`, `--color-same-value`, `--color-selection`. Accent-tinted in both themes (Slice 1's white-alpha peer was invisible on the light board). Delete `--color-cell-peer`/`--color-cell-same`. |
| Intensity ladder inverted (same-value brighter than selection) | Final dark alphas: **peer 0.10 < same-value 0.16 < selection 0.24**. Light: **peer 0.07 < same-value 0.16 < selection 0.20**. Selection brightest in both. |
| Radius mismatch (12 px token vs `rounded-2xl` 16 px) | **One radius: 16 px = `rounded-2xl`.** Drop `--radius-control`. |
| Height-token mismatch (`control-min` 48 vs `control-h` 56/64) | **One height scale:** `--control-h: 3.5rem` (56), `--control-h-lg: 4rem` (64), `--control-min-sm: 2.75rem` (44). Drop `--control-min`. |
| Toolbar cap edited twice (`landscape:` vs `lg:`) | **Use the custom `wide:` variant** (orientation + short-side ≥600). Toolbar mounts as a full-width header above the columns. |
| Play.tsx overlapping edits (layout vs loading/banner) | One merged Play.tsx below: layout restructure + loading skeleton + success-green banner inside the controls column. |
| Portrait `justify-center` overflow | Keep `justify-start`; absorb slack with a trailing `flex-1` spacer that only grows (never pushes the back button off-screen). |
| Light success green fails small text | `--color-success` light used **only** on the ≥28 px Solved headline; the time value uses `--color-text`. |
| iPhone-landscape board too small | Two-column gated on `wide:` (orientation + min-height 600). iPhone landscape stays single-column. |
| Conflict digit over selected cell < 4.5:1 | Conflict **wins the fill**: when conflict, fill is `transparent` (red digit sits on plain surface = 5.65:1), never accent-soft. |
| Toggle geometry (two specs) | One spec: 56 px track, 24 px thumb inset 4 px, `before:` pseudo extends hit area to ≥44×44, thumb fill `var(--switch-on)`. |
| Selection ring clipped by gridline | Inset ring to `x+3 / w-6`, stroke 3 px `--color-accent-strong`. |
| `layout` prop + `exactOptionalPropertyTypes` | `layout?: 'stack' | 'side'` defaulted to `'stack'`; Play passes a concrete string (`wide` is CSS-only, so the prop drives only the `side` grid/cap — see note), never `undefined`. |

---

## 2. Final token table

All color tokens live in `@theme` (dark default) + `html[data-theme="light"]` override. Sizing tokens are theme-independent (one value). Contrast verified against the worst surface each token sits on.

### Color tokens

| Token | Dark | Light | Role / contrast note |
|---|---|---|---|
| `--color-bg` | `#0a0c12` | `#f7f5f0` | Page bg. Light warmed so white board reads as a sheet on paper. |
| `--color-surface` | `#10131c` | `#ffffff` | Board fill + card/control fill. Board line contrast targets assume this surface. |
| `--color-surface-2` | `#1b1f2c` | `#f1efe8` | Hover/raised surface. Worst surface for text contrast (verified below). |
| `--color-surface-3` | `#1f2433` | `#ece9e1` | NEW. Skeleton fill (loading). Between surface-2 and border. |
| `--color-border` | `#252b3d` | `#e4e1d8` | Default control border / panel border. **Not** used for gridlines. |
| `--color-border-strong` | `#3a4258` | `#b8b3a6` | Strong control border, toggle-off track. Control chrome only. |
| `--color-grid-line` | `#2b3142` | `#cbc7bc` | NEW. Tier-1 thin cell gridline (1 px). Light darker than panel border so it shows on warm white. |
| `--color-grid-box` | `#5a6485` | `#8d8676` | NEW. Tier-2 heavy box separator (2.5 px). ≈1.8× luminance vs cell line. |
| `--color-board-frame` | `#7b86a8` | `#5f594c` | NEW. Tier-3 outer frame (4 px). Strongest of the three. |
| `--color-text` | `#e6e8f0` | `#1d1c22` | Primary text. ≥14:1 on all surfaces. |
| `--color-text-muted` | `#a7adc0` | `#56535f` | Secondary text / pencil marks. Dark 7.59:1, light 6.52:1 on surface-2. |
| `--color-text-faint` | `#8b91a6` | `#6b6873` | Section labels / footer links. Dark 5.42:1, light 4.74:1 on surface-2 (both PASS; old values FAILED). |
| `--color-accent` | `#9579f5` | `#5d3fc9` | Focus ring, active border, toggle-on, slider. Dark 5.12:1, light 6.04:1 on surface-2 (text). ≥3:1 UI everywhere. |
| `--color-accent-soft` | `rgba(149,121,245,0.20)` | `rgba(93,63,201,0.12)` | Active tab/chip fill, drag ghost, hover-rect. (Selection uses its own token.) |
| `--color-accent-strong` | `#b59bff` | `#4326b0` | Active-tab text, entered digit, status text, selection ring. Dark 7.36:1, light 8.52:1 on surface-2. |
| `--color-conflict` | `#e8607d` | `#b8325c` | Conflict digit/ring, destructive text. Dark 5.18:1, light 5.00:1 on surface-2 (both PASS). |
| `--color-conflict-soft` | `rgba(232,96,125,0.18)` | `rgba(184,50,92,0.12)` | Reject-flash fill, destructive hover. |
| `--color-given` | `#f2f3f8` | `#1d1c22` | Given clue digit (brightest). Paired with fontWeight 700. |
| `--color-entered` | `#b59bff` | `#5d3fc9` | User-entered digit = accent (distinct hue from near-white givens). fontWeight 500. |
| `--color-peer` | `rgba(149,121,245,0.10)` | `rgba(106,75,217,0.07)` | NEW. Peer-highlight fill. Replaces invisible `rgba(255,255,255,0.03)` literal. |
| `--color-same-value` | `rgba(149,121,245,0.16)` | `rgba(106,75,217,0.16)` | NEW. Same-value fill. Above peer, below selection. |
| `--color-selection` | `rgba(149,121,245,0.24)` | `rgba(106,75,217,0.20)` | NEW. Selected-cell fill. Brightest of the three. Plus a 3 px ring. |
| `--color-success` | `#5fd0a4` | `#1f9d6b` | NEW. Completion headline only (light: ≥28 px / 600 weight only — fails small text). |
| `--color-success-soft` | `rgba(95,208,164,0.14)` | `rgba(31,157,107,0.10)` | NEW. Completion banner bg tint. |
| `--switch-on` | `#ffffff` | `#ffffff` | NEW. Toggle thumb fill (replaces raw `bg-white`). Non-text affordance, ≥3:1 vs track. |

**Intensity ladder check (both themes):** peer < same-value < selection. Dark: 0.10 < 0.16 < 0.24 ✓. Light: 0.07 < 0.16 < 0.20 ✓.

**WCAG sign-off:** every text token ≥ 4.5:1 on bg, surface, and surface-2 in both themes. Worst cases — dark `text-faint` 5.42, light `text-faint` 4.74, light `conflict` 5.00 (all on surface-2). `accent` as UI/border ≥ 3:1 everywhere; as text ≥ 4.5:1.

### Sizing tokens (theme-independent — one value)

| Token | Value | Role |
|---|---|---|
| `--control-h` | `3.5rem` (56 px) | Min height: digit/erase/New button (mobile). |
| `--control-h-lg` | `4rem` (64 px) | Digit/erase button height at `sm:` and up (iPad). |
| `--control-min-sm` | `2.75rem` (44 px) | 44 px floor for secondary controls (toolbar icon buttons). |
| `--switch-track-h` | `1.875rem` (30 px) | Reference only — actual toggle track is `h-8` (32 px) below. |
| `--switch-thumb` | `1.5rem` (24 px) | Toggle thumb diameter. |
| `--play-board-max` | `min(92vw, 640px)` | Portrait/narrow board+toolbar+pad cap (= today's literal; portrait unchanged). |
| `--play-board-max-wide` | `min(72vh, 640px)` | Wide-landscape height-based board cap. ~583 px on iPad landscape. |
| `--play-controls-w` | `clamp(280px, 34vw, 360px)` | Right controls column width in two-column layout. 280 px floor keeps digit buttons ≥44 px. |

**Dropped (resolved duplicates):** `--color-cell-peer`, `--color-cell-same`, `--radius-control`, `--control-min`. The whole app uses `rounded-2xl` (16 px) for controls/cards.

---

## 3. New `@utility` / `@layer base` / `@custom-variant` additions for `src/index.css`

> Tailwind v4: `@utility` and `@custom-variant` are **top-level** (alongside existing `@utility pad-page`), never nested in `@layer base`. Pseudo-element selectors (`::-webkit-slider-thumb`) go in `@layer base`. Keyframes go in `@layer base`.

**3a. Custom variant for iPad-class landscape (top level, after the `@import`/before/after `@theme` — anywhere top-level):**

```css
@custom-variant wide (@media (orientation: landscape) and (min-height: 600px));
```

This `wide:` variant is the single two-column trigger. iPad landscape (810 tall) matches; iPhone landscape (≤430 tall) does not → stays single-column.

**3b. Touch-target utilities (top level, beside `@utility pad-board`):**

```css
@utility touch-target {
  min-height: var(--control-h);
  min-width: var(--control-h);
}
@utility touch-target-sm {
  min-height: var(--control-min-sm);
  min-width: var(--control-min-sm);
}
@utility input-volume {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  min-height: 44px;
  cursor: pointer;
  accent-color: var(--color-accent);
}
```

**3c. Skeleton + slider pseudo-elements + keyframes (inside `@layer base`, after the `reject-flash` block):**

```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.skeleton {
  background: var(--color-surface-3);
  border-radius: 0.5rem;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}
.input-volume::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 9999px;
  background: var(--color-border-strong);
}
.input-volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  margin-top: -11px;
  border-radius: 9999px;
  background: var(--color-accent);
  border: 3px solid var(--color-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.input-volume::-moz-range-track {
  height: 6px;
  border-radius: 9999px;
  background: var(--color-border-strong);
}
.input-volume::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-bg);
  border-radius: 9999px;
  background: var(--color-accent);
}
```

The existing `prefers-reduced-motion` block (lines 136–145) already neutralizes `skeleton-pulse` — no extra guard.

---

## 4. Per-file change list

### 4.1 `src/index.css`

**`@theme` block — replace color token values (lines 4–18) with:**

```css
  --color-bg: #0a0c12;
  --color-surface: #10131c;
  --color-surface-2: #1b1f2c;
  --color-surface-3: #1f2433;
  --color-border: #252b3d;
  --color-border-strong: #3a4258;
  --color-grid-line: #2b3142;
  --color-grid-box: #5a6485;
  --color-board-frame: #7b86a8;
  --color-text: #e6e8f0;
  --color-text-muted: #a7adc0;
  --color-text-faint: #8b91a6;
  --color-accent: #9579f5;
  --color-accent-soft: rgba(149, 121, 245, 0.20);
  --color-accent-strong: #b59bff;
  --color-conflict: #e8607d;
  --color-conflict-soft: rgba(232, 96, 125, 0.18);
  --color-given: #f2f3f8;
  --color-entered: #b59bff;
  --color-peer: rgba(149, 121, 245, 0.10);
  --color-same-value: rgba(149, 121, 245, 0.16);
  --color-selection: rgba(149, 121, 245, 0.24);
  --color-success: #5fd0a4;
  --color-success-soft: rgba(95, 208, 164, 0.14);
  --switch-on: #ffffff;
```

**`@theme` block — add sizing tokens (after `--font-mono`, line 21):**

```css
  --control-h: 3.5rem;
  --control-h-lg: 4rem;
  --control-min-sm: 2.75rem;
  --switch-track-h: 1.875rem;
  --switch-thumb: 1.5rem;
  --play-board-max: min(92vw, 640px);
  --play-board-max-wide: min(72vh, 640px);
  --play-controls-w: clamp(280px, 34vw, 360px);
```

**`@theme` — `--font-sans` (line 20):**
- Before: `--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;`
- After: `--font-sans: -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`

**`html[data-theme="light"]` block — replace (lines 25–39) with:**

```css
  --color-bg: #f7f5f0;
  --color-surface: #ffffff;
  --color-surface-2: #f1efe8;
  --color-surface-3: #ece9e1;
  --color-border: #e4e1d8;
  --color-border-strong: #b8b3a6;
  --color-grid-line: #cbc7bc;
  --color-grid-box: #8d8676;
  --color-board-frame: #5f594c;
  --color-text: #1d1c22;
  --color-text-muted: #56535f;
  --color-text-faint: #6b6873;
  --color-accent: #5d3fc9;
  --color-accent-soft: rgba(93, 63, 201, 0.12);
  --color-accent-strong: #4326b0;
  --color-conflict: #b8325c;
  --color-conflict-soft: rgba(184, 50, 92, 0.12);
  --color-given: #1d1c22;
  --color-entered: #5d3fc9;
  --color-peer: rgba(106, 75, 217, 0.07);
  --color-same-value: rgba(106, 75, 217, 0.16);
  --color-selection: rgba(106, 75, 217, 0.20);
  --color-success: #1f9d6b;
  --color-success-soft: rgba(31, 157, 107, 0.10);
  --switch-on: #ffffff;
```
(Keep `color-scheme: light;`.)

**Plus** the `@custom-variant wide`, `@utility touch-target/touch-target-sm/input-volume`, the `.skeleton` + `skeleton-pulse` keyframes, and the four slider pseudo-element rules from §3.

**`.digit-drag-ghost` (lines 104–124):** no structural change; it already uses tokens and inherits the refresh. Optional polish: `border: 2px solid var(--color-accent);` and `box-shadow: 0 8px 24px rgba(0,0,0,0.30);`.

---

### 4.2 `src/ui/pages/Play.tsx`

This is the heart of L1/L2. Three edits: the **loading branch**, the **main layout restructure**, and the **completed banner** (merged into the controls column).

**A) Loading branch (lines 279–285).** Replace:

```jsx
if (!grid && boardState?.kind !== 'samurai') {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 pad-board">
      <div data-testid="play-loading" role="status" aria-live="polite" className="flex flex-col items-center gap-6">
        <div aria-hidden="true" className="grid grid-cols-3 grid-rows-3 gap-[3px] size-40 rounded-lg border border-[var(--color-board-frame)] p-[3px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ animationDelay: `${(i % 3 + Math.floor(i / 3)) * 90}ms` }} />
          ))}
        </div>
        <p className="text-[15px] text-[var(--color-text-muted)]">{t.play.loading}</p>
      </div>
    </main>
  )
}
```

**B) Main layout (lines 287–348).** The `<main>` ternary is replaced by ONE unified className using the `wide:` variant; children are grouped into a full-width Toolbar header + a board column + a controls column. New JSX structure:

```jsx
return (
  <main
    data-noselect="true"
    className="min-h-dvh flex flex-col items-center justify-start pad-board gap-4 wide:flex-row wide:flex-wrap wide:items-start wide:justify-center wide:gap-6"
  >
    <Toolbar
      puzzleLabel={`${isVariantKind(variant) ? t.catalog[variant].name : variant} · ${t.difficulty[difficulty]}`}
      canUndo={historyIndex >= 0}
      canRedo={historyIndex < historyLen - 1}
      onNew={handleNew}
      onUndo={undo}
      onRedo={redo}
    />

    <div
      data-testid="play-board-col"
      className="flex w-full justify-center wide:w-auto wide:flex-1 wide:justify-end wide:self-start"
    >
      {boardState?.kind === 'samurai' ? (
        isPortrait ? (
          <RotateDevicePrompt />
        ) : (
          <SamuraiBoardView
            board={boardState.board}
            selected={selectedRaw && 'gridIdx' in selectedRaw ? selectedRaw : null}
            lockedCells={lockedCells}
            shakeKey={shakeKey}
            onSelect={(target) => select(target)}
          />
        )
      ) : (
        <Board
          grid={grid!}
          selected={selected}
          variant={variant}
          lockedCells={lockedCells}
          shakeKey={shakeKey}
          {...(jigsawPieceMap ? { jigsawPieceMap } : {})}
          {...(parityMask ? { parityMask } : {})}
          {...(edges ? { edges } : {})}
          {...(thermometers ? { thermometers } : {})}
          {...(arrows ? { arrows } : {})}
          {...(cages ? { cages } : {})}
          {...(outsideClues ? { outsideClues } : {})}
          {...(variantPaths ? { paths: variantPaths } : {})}
          dragHoverCell={dragHoverCell}
          rejectFlashCell={rejectFlashCell}
          rejectFlashKey={rejectFlashKey}
          onSelect={select}
        />
      )}
    </div>

    <div
      data-testid="play-controls-col"
      className="flex w-full flex-col items-center gap-4 wide:w-[var(--play-controls-w)] wide:max-w-[var(--play-controls-w)] wide:self-start"
    >
      <InputPad
        mode={mode}
        size={grid?.shape.size ?? 9}
        disabled={completedAt !== null}
        onDigit={input}
        onErase={erase}
        onModeChange={setMode}
        onDigitDrop={handleDigitDrop}
        onDragHoverChange={setDragHoverCell}
      />
      {completedAt !== null && (
        /* completed banner — see C) below */
      )}
    </div>

    <div className="hidden portrait:block w-full flex-1" aria-hidden="true" />

    <span data-testid="puzzle-id" className="sr-only">{puzzleId}</span>
  </main>
)
```

Notes:
- **Layout math:** `<main>` is `flex-col` by default (portrait single column). At `wide:` it becomes `flex-row flex-wrap`; the full-width Toolbar forces a wrap onto row 1, board-col + controls-col share row 2. Board is height-capped (left), controls fixed ~320 px (right) — both `self-start`. No scroll: iPad landscape 810 tall → board ≈ 583 px; 583 + 320 + 24 gap ≈ 927 px < 1080 px width.
- **L2 portrait balance:** keep `justify-start` (never `justify-center` on `min-h-dvh` — overflow would scroll the back button off-screen). The trailing `hidden portrait:block w-full flex-1` spacer only *grows* to absorb bottom slack when content is shorter than the viewport; it never pushes content up.
- **`InputPad` `layout` prop:** the `wide:` trigger is CSS-only, so Play cannot read it in JS. The pad reflows itself via its own `wide:` classes (see 4.6). Therefore **do not** pass a `layout` prop from Play — the pad is fully CSS-driven, avoiding any `exactOptionalPropertyTypes` risk. (`InputPad` keeps `layout?` defaulted to `'stack'` for any future caller, but Play omits it entirely.)
- `isPortrait` / `useIsPortraitOrientation` **stays** — still gates Samurai's `RotateDevicePrompt`.

**C) Completed banner (lines 349–382).** Now rendered INSIDE `play-controls-col`. Merged success-green chrome + `wide:max-w-full`:

```jsx
<div
  data-testid="completed-banner"
  role="status"
  aria-live="polite"
  className="w-full max-w-[var(--play-board-max)] wide:max-w-full rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-soft)] px-6 py-6 text-center"
>
  <div className="text-[28px] font-semibold text-[var(--color-success)]">
    {t.play.solved}
  </div>
  <div className="mt-2 text-[15px] text-[var(--color-text-muted)]">
    {t.play.yourTime} ·{' '}
    <span className="tabular-nums font-medium text-[var(--color-text)]">{formatMs(solveMs)}</span>
  </div>
  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
    <button
      type="button"
      data-testid="next-puzzle-btn"
      onClick={handleNew}
      className="min-h-[52px] rounded-2xl bg-[var(--color-accent)] px-6 text-base font-semibold text-white active:scale-[0.98] transition-transform"
    >
      {t.play.nextPuzzle}
    </button>
    <button
      type="button"
      data-testid="back-to-menu-btn"
      onClick={() => navigate('/')}
      className="min-h-[52px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-base font-medium hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] active:scale-[0.98] transition-transform"
    >
      {t.play.backToMenu}
    </button>
  </div>
</div>
```

The time value uses `--color-text` (not success) so it passes 4.5:1 in light mode. "Next puzzle" stays accent-purple = the single forward CTA.

---

### 4.3 `src/ui/board/Board.tsx`

**`<svg>` className (line 88):**
- Before: `className="w-full max-w-[min(92vw,640px)] aspect-square select-none"`
- After: `className="w-full max-w-[var(--play-board-max)] wide:max-w-[var(--play-board-max-wide)] aspect-square select-none"`

Portrait + iPhone-landscape keep the 92vw cap (unchanged). Only iPad-class landscape (`wide:`) switches to the height-based cap. `aspect-square` unchanged → board never cropped, never sub-pixel.

**Background `<rect>` (line 90):** no change (`fill="var(--color-surface)"`). Line contrast targets depend on this.

---

### 4.4 `src/ui/board/SamuraiBoardView.tsx`

**`<svg>` className (line 111):**
- Before: `className="w-full max-w-[min(92vh,720px)] aspect-square select-none"`
- After: `className="w-full max-w-[min(92vh,720px)] wide:max-w-[min(80vh,720px)] aspect-square select-none"`

Samurai is landscape-only; with controls now in a side column, dropping to 80vh (~648 px) leaves room for the ~320 px controls column. `data-testid="samurai-board"` untouched.

---

### 4.5 `src/ui/board/BoardCellsLayer.tsx` — U1 three-tier gridlines

Rewrite both `GridLines` loops to a 3-tier system (color + width double-encode), paint thin→box→frame, and add `strokeLinecap="square"`.

**Replace the entire `GridLines` function body (lines 153–189)** with:

```jsx
  const inner: React.ReactElement[] = []
  const box: React.ReactElement[] = []
  const frame: React.ReactElement[] = []
  const total = size * cellSize

  for (let i = 0; i <= size; i++) {
    const isEdge = i === 0 || i === size
    const isBox = !suppressBoxLines && !isEdge && i % shape.boxCols === 0
    const stroke = isEdge ? 'var(--color-board-frame)' : isBox ? 'var(--color-grid-box)' : 'var(--color-grid-line)'
    const w = isEdge ? 4 : isBox ? 2.5 : 1
    const el = (
      <line key={`v-${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={total}
        stroke={stroke} strokeWidth={w} strokeLinecap="square" />
    )
    ;(isEdge ? frame : isBox ? box : inner).push(el)
  }
  for (let i = 0; i <= size; i++) {
    const isEdge = i === 0 || i === size
    const isBox = !suppressBoxLines && !isEdge && i % shape.boxRows === 0
    const stroke = isEdge ? 'var(--color-board-frame)' : isBox ? 'var(--color-grid-box)' : 'var(--color-grid-line)'
    const w = isEdge ? 4 : isBox ? 2.5 : 1
    const el = (
      <line key={`h-${i}`} x1={0} y1={i * cellSize} x2={total} y2={i * cellSize}
        stroke={stroke} strokeWidth={w} strokeLinecap="square" />
    )
    ;(isEdge ? frame : isBox ? box : inner).push(el)
  }
  return <g pointerEvents="none">{[...inner, ...box, ...frame]}</g>
```

Weight ladder 1 : 2.5 : 4 + distinct colors. Frame painted last so it sits over cell lines at corners. `strokeWidth` is in SVG user units (relative to `CELL_SIZE=64`), so it scales with any board cap. Jigsaw (`suppressBoxLines`) collapses box→inner but keeps the outer frame.

**`hoverRect` `<rect>` (lines 101–113):**
- Before: `stroke="var(--color-accent)" strokeWidth={2}`
- After: `stroke="var(--color-accent-strong)" strokeWidth={3}` (keep `fill="var(--color-accent-soft)"`, `data-testid="drag-hover"`, geometry, `pointerEvents`).

**`flashRect` `<rect>` (lines 114–128):**
- Before: `strokeWidth={2}`
- After: `strokeWidth={3}` (keep fill/stroke tokens, `key`, `data-testid`, `data-reject`).

---

### 4.6 `src/ui/board/Cell.tsx` — U3 cell states + given/entered

**`fillColor` (lines 42–48).** Conflict-first so the red digit never sits on accent-soft (critique fix). Replace:

```jsx
  const fillColor = conflict
    ? 'transparent'
    : selected
      ? 'var(--color-selection)'
      : sameValueHighlight
        ? 'var(--color-same-value)'
        : peerHighlight
          ? 'var(--color-peer)'
          : 'transparent'
```

Removes both raw rgba literals; conflict wins (red digit on plain surface = 5.65:1 dark).

**Selection ring — add immediately AFTER the fill `<rect>` (after line 68):**

```jsx
      {selected && (
        <rect
          x={x + 3}
          y={y + 3}
          width={cellSize - 6}
          height={cellSize - 6}
          fill="none"
          stroke="var(--color-accent-strong)"
          strokeWidth={3}
          pointerEvents="none"
          data-testid={`cell-selected-ring-${coord.r}-${coord.c}`}
        />
      )}
```

Inset 3 px / `w-6` (was the critiqued 1.5 px) so the ring clears the 1 px inner gridline that paints over it. Additive test-id.

**Digit `<text>` fontWeight (line 76):**
- Before: `fontWeight={given ? 600 : 500}`
- After: `fontWeight={given ? 700 : 500}`

Widens the given/entered weight gap to 200 (second channel on top of the color hue difference). `fontSize={cellSize * 0.56}` and the `fill` ternary unchanged.

**Conflict inner ring (lines 96–107):**
- Before: `strokeWidth={1.5}`
- After: `strokeWidth={2.5}` (keep geometry `x+2 / y+2 / cellSize-4`, `stroke="var(--color-conflict)"`, `pointerEvents`).

**PencilMarks `fill` (line 142):** no change (`var(--color-text-muted)`, verified ≥4.5:1).

---

### 4.7 `src/ui/panels/InputPad.tsx` — U2 touch + CSS-driven side reflow

The pad reflows via the `wide:` variant (no JS prop needed). `layout?` stays in the interface, defaulted to `'stack'`, but is unused by Play.

**`cols` (lines 42–45).** 9×9 → 3 cols always (clean 3×3 mental model + bigger buttons); 6 → 3 cols; 16 stays 4 cols:
```jsx
  const cols = size === 16 ? 'grid-cols-4' : 'grid-cols-3'
```

**Root `<div data-testid="input-pad">` (line 58):**
- Before: `className="flex flex-col gap-3 w-full max-w-[min(92vw,640px)]"`
- After: `className="flex flex-col gap-3 w-full max-w-[var(--play-board-max)] wide:max-w-[22rem]"`

In wide-landscape the pad caps at 352 px to sit as a tidy right column; portrait unchanged.

**Mode toggle row (line 61):**
- Before: `className="flex gap-2"`
- After: `className="flex gap-2 sm:gap-3"`

**Digit grid container (line 78):**
- Before: ``className={`grid ${cols} gap-2`}``
- After: ``className={`grid ${cols} gap-2 sm:gap-3`}``

**DigitButton `<button>` (line 149):**
- Before: ``className={`min-h-[56px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${largeText ? 'text-2xl' : 'text-xl'} font-semibold tabular-nums hover:bg-[var(--color-surface-2)] disabled:opacity-40 active:scale-[0.97] transition-transform`}``
- After: ``className={`min-h-[var(--control-h)] sm:min-h-[var(--control-h-lg)] aspect-square w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] ${largeText ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} font-semibold tabular-nums hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] disabled:opacity-40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150`}``

`aspect-square` is safe now: 9×9 at 3 cols in the 640 px portrait cap → buttons ≈ 205 px tall *only if width fills 640*, but the pad's own `max-w` plus the 3-row grid stays within one screen because there are just 4 rows (9 digits + erase). To guarantee the pad never pushes digits below the portrait fold, **cap each digit button**: also add `max-h-[clamp(56px,18vw,88px)]` so 3-col squares stay tappable but bounded. Final DigitButton class:

``className={`min-h-[var(--control-h)] sm:min-h-[var(--control-h-lg)] max-h-[clamp(56px,18vw,88px)] aspect-square w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] ${largeText ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} font-semibold tabular-nums hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] disabled:opacity-40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150`}``

This addresses the portrait-pad-regression critique: buttons are bounded to ≤88 px so a 4-row 3-col pad stays ~ (88×4 + gaps) ≈ 380 px tall — well above the fold even on a 640 px-wide portrait board.

**Erase `<button>` (line 100):**
- After: `className="min-h-[var(--control-h)] sm:min-h-[var(--control-h-lg)] max-h-[clamp(56px,18vw,88px)] aspect-square flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)] disabled:opacity-40 active:scale-[0.96] transition-[transform,background-color,border-color,color] duration-150"` (keep `data-testid="erase-btn"`, `data-sound="erase"`, `aria-label`). Enlarge `BackspaceIcon` to `width="28" height="28"` (viewBox unchanged).

**ModeButton `<button>` (line 195):**
- After: ``className={`min-h-[48px] sm:min-h-[52px] flex-1 rounded-2xl border-2 text-base font-semibold tracking-tight transition-colors duration-150 ${active ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]'}`}``

(44→48/52 px, `text-sm`→`text-base`, `border`→`border-2`, `rounded-xl`→`rounded-2xl`, `font-medium`→`font-semibold`.)

---

### 4.8 `src/ui/panels/Toolbar.tsx` — P1 hero + full-width header

**`<header>` (line 25):**
- Before: `className="flex items-center justify-between gap-3 w-full max-w-[min(92vw,640px)] pb-2"`
- After: `className="flex items-center justify-between gap-3 w-full max-w-[var(--play-board-max)] wide:max-w-none pb-2"`

Portrait keeps the 640 cap; `wide:max-w-none` lets the header span the full two-column width. (Single trigger = `wide:`, matching the main layout — no `lg:`.)

**Title block (lines 29–34).** Drop the `{t.appName}` wordmark; promote `puzzleLabel` to the `<h1>`:
```jsx
        <div className="flex flex-col min-w-0">
          <h1 data-testid="puzzle-title" className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-text)] truncate leading-tight">
            {puzzleLabel}
          </h1>
        </div>
```
Keep the outer `<div className="flex items-center gap-2 min-w-0">` and `<BackButton to="/" testId="back-home" />`. One `<h1>` per screen preserved; `puzzleLabel` prop contract unchanged. `data-testid="puzzle-title"` additive.

**New button (line 57):**
- After: `className="min-h-[44px] sm:min-h-[var(--control-h)] px-4 sm:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm sm:text-base font-semibold hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] active:scale-[0.97] transition-[transform,background-color,border-color] duration-150"` (keep `data-testid="new-btn"`, `aria-label`, `onClick`).

**IconButton (line 87):**
- After: `className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)] disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.95] transition-[transform,background-color,border-color,color] duration-150"`. Enlarge `UndoIcon`/`RedoIcon` to `width="22" height="22"`.

---

### 4.9 `src/ui/pages/Settings.tsx` — U2

**ToggleRow switch `<button>` (lines 388–392)** — one toggle spec (56 px track, 24 px thumb, `before:` hit-area ≥44×44, token thumb):
```jsx
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-150 before:absolute before:-inset-x-1.5 before:-inset-y-2.5 before:content-[''] ${
          value ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'
        }`}
```
**Thumb `<span>` (lines 394–397):**
```jsx
        className={`absolute top-1 h-6 w-6 rounded-full bg-[var(--switch-on)] shadow-sm transition-transform duration-150 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
```
Track 56 px (`w-14`) / 32 px (`h-8`); thumb 24 px (`h-6 w-6`) inset 4 px; `before:` extends the click area to ~44×44 without enlarging the pill. `bg-white`→`bg-[var(--switch-on)]`. Keep `role="switch"`, `aria-checked`, `aria-label`, `data-testid`.

**ToggleRow container (line 372):**
- After: `className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"`

**ToggleRow label/hint (lines 374, 376):** label `text-sm`→`text-base`; hint `text-xs`→`text-sm`.

**Volume slider (lines 233–251):** card `px-4 py-3`→`px-4 py-4`, `rounded-xl`→`rounded-2xl`; `<label>` `text-sm`→`text-base`. Input className `mt-3 w-full accent-[var(--color-accent)]`→`input-volume mt-4 w-full`. Keep `id`, `type`, `min/max/step`, `value`, `data-testid`, `onChange`, `onPointerUp`. (Styling via the `.input-volume` utility + pseudo-elements from §3.)

**Theme / Language / Sound-theme tabs (lines 117, 142, 222)** — all three:
- After: ``className={`min-h-[48px] rounded-2xl border-2 text-base font-semibold transition-colors duration-150 ${selected ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]'}`}`` (keep `role="tab"`, `aria-selected`, `data-testid`).

**ActionRow (line 422):** `rounded-xl`→`rounded-2xl`; destructive border `border-[var(--color-conflict-soft)]`→`border-[var(--color-conflict)]` (soft = translucent, near-invisible edge). Label `text-sm`→`text-base`, hint `text-xs`→`text-sm` (lines 429, 431).

**Section spacing:** line 190 `mt-10`→`mt-12`; line 256 `mt-10`→`mt-12`; line 325 (nav) `mt-10`→`mt-12`. (First section keeps `mt-8`.)

**`Label` component (line 352):** `text-sm`→`text-xs font-semibold` for the standardized eyebrow style shared across secondary screens.

**Nav footer links (lines 325–343):** container `text-sm`→`text-base`; each `<Link>` `min-h-[44px]`→`min-h-[48px]`, `px-3`→`px-4`, `rounded-lg`→`rounded-xl`.

---

### 4.10 `src/ui/pages/Home.tsx` — P3

**Inner container (line 70):** `className="mx-auto w-full max-w-5xl"`→`className="mx-auto w-full max-w-5xl space-y-8"` (one 32 px rhythm; drop per-child top margins below).

**Header (lines 71–72):** wrap:
```jsx
        <header className="space-y-1">
          <h1 className="text-4xl font-semibold tracking-tight">{t.appName}</h1>
          <p className="text-[17px] text-[var(--color-text-muted)]">{t.tagline}</p>
        </header>
```
(This is the one place the Logikku wordmark belongs — Play drops it.)

**Continue hero `<Link>` (line 78):**
- After: `className="block rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-6 py-5 hover:border-[var(--color-accent-strong)] active:scale-[0.99] transition-transform"` (drop `mt-6`).

**Continue eyebrow + label (lines 82, 85):** eyebrow `font-medium`→`font-semibold`; label `text-base`→`text-[17px] leading-snug`.

**Chevron span (line 87):** `className="text-[var(--color-accent-strong)]"`→`className="ml-4 shrink-0 text-[var(--color-accent-strong)]"`.

**Filters `<section>` (line 94):** `mt-6 space-y-3`→`space-y-3`.

**Empty state (line 120):** `mt-10 text-center text-sm`→`text-center text-[15px] ... py-10` (keep `data-testid="home-empty"`).

**Variant grid `<section>` (line 125):** `mt-6 grid grid-cols-2 gap-3 ...`→`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`.

**Footer `<nav>` (line 138):** `mt-10 flex items-center justify-center gap-4 text-sm`→`flex items-center justify-center gap-2 pt-4 text-[15px]` (keep both link `data-testid`s and `min-h-[44px]`).

---

### 4.11 `src/ui/components/VariantCard.tsx`

**`sharedClasses` (line 25):** `min-h-[140px] rounded-xl ... px-3 py-3`→`min-h-[150px] rounded-2xl ... px-3 py-4`.

**Title (line 17):** `mt-2 text-base font-medium`→`mt-3 text-base font-semibold`.

**Description (line 18):** `mt-1`→`mt-1.5` (keep `text-[13px]`).

**Disabled "Coming soon" (line 35):** `mt-1`→`mt-2`.

**Link hover (line 46):**
- After: ``className={`${sharedClasses} hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-[transform,background-color,border-color] duration-150`}``

---

### 4.12 `src/ui/pages/VariantDetail.tsx`

**Description `<p>` (line 79):** `mt-1 text-sm`→`mt-1 text-[15px] leading-relaxed`.

**Three sections (lines 85, 94, 103):** wrap the three `<section>`s in `<div className="mt-8 space-y-8">` and remove `mt-8` from each `<section>` (keep `data-testid="variant-stats"` on the third).

**Section eyebrows (lines 86, 95, 105):** `text-sm uppercase tracking-wider text-[var(--color-text-faint)]`→`text-xs font-semibold uppercase tracking-wider text-[var(--color-text-faint)]`.

**Rules body (line 89):** `mt-2 text-sm`→`mt-3 text-[15px]`.

**Stats line (line 108):** `mt-2 text-sm text-[var(--color-text-muted)]`→`mt-3 text-[15px] text-[var(--color-text-muted)] tabular-nums`.

---

### 4.13 `src/ui/components/Onboarding.tsx`

**Backdrop (line 31):** `bg-black/50 px-6`→`bg-black/60 px-6 pad-page`.

**Modal panel (line 39):** add border: `... rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl`.

**Title (line 42):** `text-lg`→`text-xl`.

**Skip button (line 47):** `text-sm ...`→`min-h-[44px] -mr-2 px-2 inline-flex items-center text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]` (keep `data-testid="onboarding-skip"`).

**Body (line 53):** `mt-4 text-sm`→`mt-4 text-[15px]`.

**Step counter (line 58):** `text-xs`→`text-[13px] tabular-nums`.

**Next/Done buttons (lines 66, 75)** — both:
- After: `className="min-h-[48px] px-6 rounded-xl bg-[var(--color-accent)] text-white font-semibold active:scale-[0.98] transition-transform"` (keep both `data-testid`s).

---

### 4.14 `src/ui/pages/Stats.tsx`

**Inner container (line 37):** `w-full max-w-md`→`w-full max-w-md space-y-8`.

**BackButton + h1 (lines 38–41):** wrap in `<header>…</header>` (keep `BackButton className="mb-6"`).

**Empty state (line 46):** `mt-8 text-sm`→`text-[15px] leading-relaxed` (keep `data-testid="stats-empty"`).

**Table (line 53):** `mt-8 w-full text-sm`→`w-full text-[15px]` (keep `data-testid="stats-table"`).

**Header row (line 55) + `<th>` (lines 56–59):** add `font-semibold` to the `<tr>` (`... text-xs font-semibold uppercase tracking-wider`); `<th>` `pb-2 font-medium`→`pb-3 font-semibold`.

**Reset button (line 86):** `mt-8 min-h-[44px] ... border-[var(--color-conflict-soft)] ... text-sm`→`min-h-[48px] w-full rounded-xl border border-[var(--color-conflict)] text-[var(--color-conflict)] text-[15px] font-medium hover:bg-[var(--color-conflict-soft)] active:scale-[0.99] transition-transform` (solid conflict border = visible edge; keep `data-testid="stats-reset"`).

---

### 4.15 `src/ui/pages/About.tsx`

**Title group (lines 12–16):** wrap title+tagline+version in `<header className="space-y-2">`; tagline `mt-4 text-[var(--color-text-muted)]`→`text-[17px] text-[var(--color-text-muted)]`; version `mt-2 text-sm`→`text-[15px] tabular-nums` (keep `data-testid="app-version"`). Keep `BackButton className="mb-6"` above the header.

**Credit `<p>` (line 17):** `mt-6 text-[var(--color-text-muted)]`→`mt-8 text-[15px] text-[var(--color-text-muted)] leading-relaxed`.

**Links column (line 18):** `mt-8 flex flex-col gap-2 text-sm`→`mt-8 flex flex-col gap-1 text-[15px]`; each `<Link>` className→`inline-flex min-h-[44px] items-center text-[var(--color-accent-strong)] hover:underline`.

---

### 4.16 `src/pwa/InstallBanner.tsx`

**Root `<div>` (line 41):** `mt-6 rounded-xl ... px-4 py-3 ...`→`rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-5 py-4 flex items-start gap-3` (drop `mt-6`; keep `role="status"`, `data-testid="install-banner"`).

**Body `<p>` (line 44):** `flex-1 text-sm`→`flex-1 text-[15px] leading-snug`.

**Dismiss button (line 58):** `text-sm ...`→`min-h-[44px] -my-1 px-2 inline-flex items-center text-[15px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]` (keep `data-testid="install-dismiss"`).

---

### 4.17 `src/App.tsx` — P2 first-paint

**Loading branch (lines 39–45):**
```jsx
  if (!loaded) {
    return (
      <main className="min-h-dvh flex items-center justify-center pad-page">
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
          <div aria-hidden="true" className="grid grid-cols-3 grid-rows-3 gap-[3px] size-24 rounded-lg border border-[var(--color-board-frame)] p-[2px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        </div>
      </main>
    )
  }
```
Wordless skeleton mark (no new i18n string). Uses the shared `.skeleton` (reduced-motion safe).

---

## 5. Verification checklist (Playwright + manual)

**Layout / no-overlap / pad-never-below-fold:**
- [ ] iPad portrait **810×1080**: single column. `[data-testid="board"]`, `[data-testid="input-pad"]`, `[data-testid="play-controls-col"]` all within viewport; digit `digit-9` and `erase-btn` visible without scroll (`boundingBox().y + height <= viewport.height`).
- [ ] iPad landscape **1080×810**: `[data-testid="play-board-col"]` left, `[data-testid="play-controls-col"]` right (board-col `x` < controls-col `x`); both fully visible, no scroll. `[data-testid="toolbar"]` spans full width above both columns.
- [ ] iPhone landscape **~844×390**: **single column** (the `wide:` short-side ≥600 gate fails) — assert `play-board-col` and `play-controls-col` stack (controls-col `y` > board-col `y`). Board width ≥ 360 px (never sub-pixel).
- [ ] Desktop wide **1440×900**: board capped 640, controls capped 360, centered.
- [ ] Samurai landscape: `[data-testid="samurai-board"]` left, pad right, no scroll. Portrait shows `RotateDevicePrompt`.
- [ ] `completed-banner` renders inside `[data-testid="play-controls-col"]` and is fully visible (landscape) / below pad (portrait); `role="status"`, `aria-live="polite"` intact.
- [ ] Portrait Play: back button (`back-home`) stays at top of viewport with content present (no `justify-center` overflow scroll).

**Touch targets (≥44×44, ≥8 px spacing):**
- [ ] All `digit-*`, `erase-btn` ≥ 56 px (mobile) / ≥ 64 px (iPad), bounded ≤ 88 px tall.
- [ ] Mode tabs ≥ 48 px; `new-btn` ≥ 44 px; `undo-btn`/`redo-btn` ≥ 44 px.
- [ ] Settings `toggle-*` total hit area ≥ 44×44 (measure the `<button>` incl. `before:` overlay); `sound-volume` interactive band ≥ 44 px tall.
- [ ] `theme-*`, `language-*`, `soundTheme-*` ≥ 48 px; `stats-reset`, `action-*`, onboarding `next`/`done`/`skip`, install-dismiss, About/Settings/Stats nav links all ≥ 44 px.

**Contrast (≥4.5:1 normal text, ≥3:1 large/UI), both themes:**
- [ ] `text-faint` on surface-2: dark 5.42, light 4.74 (PASS).
- [ ] `conflict` on surface-2: dark 5.18, light 5.00 (PASS).
- [ ] Conflict digit over a selected cell: fill is `transparent` (not accent-soft) → red on surface 5.65:1.
- [ ] Light completion: success green only on the 28 px Solved headline; time value in `--color-text`.
- [ ] Entered vs given digit distinguishable by hue (purple vs near-white) AND weight (500 vs 700).

**Board readability (U1/U3):**
- [ ] Box separators visibly heavier than cell lines (color + width) at the smallest rendered board (iPhone landscape single-column board, ~360 px). Outer frame heaviest.
- [ ] Selected cell shows the 3 px `cell-selected-ring-{r}-{c}` not clipped by gridlines; selection fill brighter than same-value brighter than peer.

**Regression / a11y:**
- [ ] All pre-existing `data-testid`s present (board, cell-*, input-pad, digit-*, erase-btn, toolbar, back-home, new-btn, undo/redo-btn, completed-banner, next-puzzle-btn, back-to-menu-btn, puzzle-id, toggle-*, theme/language/soundTheme-*, sound-volume, action-*, stats-*, variant-card-*, variant-stats, onboarding-*, install-banner/-dismiss, home-empty, continue-card, link-stats/-settings, app-version). New additive: `puzzle-title`, `play-board-col`, `play-controls-col`, `play-loading`, `cell-selected-ring-*`.
- [ ] One `<h1>` per screen (Play `<h1>` = puzzleLabel; Home `<h1>` = appName).
- [ ] `bun run typecheck`, `bun run test:run`, `bun run build`, `bun run lint` all green.
- [ ] `prefers-reduced-motion`: skeleton pulse and all transitions frozen.
```
