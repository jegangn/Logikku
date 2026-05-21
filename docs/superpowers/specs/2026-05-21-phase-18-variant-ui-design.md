# Phase 18 — Variant Selection UI + Per-Variant Onboarding

> **Status:** Design (approved 2026-05-21). Spec → plan → implementation.
> **Prereqs:** Phases 6–17 complete (all variant engines + banks shipped).
> **Source prompt:** `prompts/phase-18-variant-ui.md`.

## Goal

Build the variant discovery surface — the screens users land on, browse 23 Sudoku variants, learn rules, and start playing. This is the *front door* of the app. Everything before Phase 18 was engine and individual variant boards; Phase 18 is what a player sees first.

## Constraints

- iPad landscape primary; portrait must work (single column).
- Calm aesthetic: large tap targets, no animation noise, no notifications.
- Strings centralized for Phase 19 i18n extraction.
- No engine changes. Pure UI + new client state.
- Tailwind v4 only; minimal new dependencies.

## Architecture overview

```
src/ui/
  pages/
    Home.tsx              (rewrite — variant grid + filters + continue card)
    VariantDetail.tsx     (new — rules + difficulty picker)
    Play.tsx              (unchanged)
  components/
    VariantCard.tsx       (new)
    VariantThumbnail.tsx  (new — renders the per-variant glyph)
    DifficultyPicker.tsx  (new — reusable pill row)
    Onboarding.tsx        (new — 2-screen modal wizard)
  onboarding/
    classic.md, x-diagonal.md, … (23 files, 2 sections each)
  thumbnails/
    classic.svg, x-diagonal.svg, … (23 files, 64px artwork in 80px frame)
  variantCatalog.ts       (new — single source of truth)
src/state/
  onboardingStore.ts      (new — Zustand, IDB-persisted Set<variant>)
src/storage/
  db.ts                   (add onboardingSeen object store)
src/i18n/
  en.ts                   (new — all user-facing strings)
src/App.tsx               (add /variant/:kind route)
vite.config.ts            (add vite-plugin-svgr)
```

### `variantCatalog.ts` — the spine

Single export consumed by Home, VariantDetail, and any future surface that needs variant metadata:

```ts
export type VariantKind =
  | 'classic' | 'x-diagonal' | 'hyper' | 'anti-knight' | 'anti-king'
  | 'non-consecutive' | 'jigsaw' | 'even-odd' | 'mini-6' | 'kropki'
  | 'xv' | 'greater-than' | 'thermometer' | 'arrow' | 'killer'
  | 'little-killer' | 'sandwich' | 'skyscraper' | 'palindrome'
  | 'renban' | 'german-whispers' | 'mega-16' | 'samurai'

export type VariantSize = '9x9' | '6x6' | '16x16' | 'samurai'
export type VariantFeature =
  | 'classic-like' | 'cage' | 'path' | 'outside-clue'
  | 'parity' | 'edge-clue' | 'arithmetic'

export interface VariantMeta {
  readonly kind: VariantKind
  readonly nameKey: string          // resolves through src/i18n/en.ts catalog
  readonly descriptionKey: string
  readonly size: VariantSize
  readonly features: ReadonlyArray<VariantFeature>
  readonly Thumbnail: React.ComponentType<{ className?: string }>
  readonly onboarding: string       // imported via ?raw
}

export const VARIANT_CATALOG: ReadonlyArray<VariantMeta>
export function getVariant(kind: VariantKind): VariantMeta
```

Order in the array drives display order on Home (curated: classic → variations within each family).

### Routing

| Route | Component |
|---|---|
| `/` | `Home` |
| `/variant/:kind` | `VariantDetail` |
| `/play?variant=…&difficulty=…&puzzleId=…` | `Play` |
| `/stats`, `/settings` | unchanged |

`VariantDetail` validates `:kind` against `VARIANT_CATALOG` and redirects to `/` on miss.

## Home screen

### Layout (iPad landscape)

```
┌──────────────────────────────────────────────────────┐
│  Logikku                                             │
│  Sudoku, every variant.                              │
│                                                      │
│  ┌─ Continue ────────────────────────────────────┐   │  ← only when unfinished game
│  │ Samurai · Easy · started 12 min ago        →  │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  Grid size:  [All] [9×9] [6×6] [16×16] [Samurai]     │  ← single-select
│  Features:   [Classic] [Cage] [Path] [Outside] …     │  ← multi-select
│                                                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │  ▦ │ │  ▥ │ │  ▦ │ │  ♞ │ │  ☐ │                  │
│  │Clas│ │X-Di│ │Hype│ │Knig│ │King│                  │
│  │1ln.│ │1ln.│ │1ln.│ │1ln.│ │1ln.│                  │
│  └────┘ └────┘ └────┘ └────┘ └────┘                  │
│  …23 cards total, 5 columns × 5 rows                 │
│                                                      │
│  Stats · Settings                                    │
└──────────────────────────────────────────────────────┘
```

Portrait: single column, filters stack vertically, cards in `grid-cols-2`.

### `VariantCard`

- Wraps `<Link to={'/variant/${kind}'}>`
- 80×80 `<VariantThumbnail kind={kind} />` at top
- Variant name (`text-base font-medium`)
- 1-line description (`text-xs text-[var(--color-text-muted)]`)
- `min-h-[140px]` for finger-friendly tap targets
- Disabled state (no link, `opacity-50`, `cursor-not-allowed`) if `listBanks(kind).length === 0` — only jigsaw at launch
- `data-testid="variant-card-{kind}"`

### `VariantThumbnail`

- Renders the per-variant SVG as a React component (SVG imported through `vite-plugin-svgr` → JSX, with `currentColor` for theming)
- 80×80 frame, 64×64 artwork, monochrome line drawings
- Each glyph hints at variant identity:

| Kind | Glyph idea |
|---|---|
| classic | clean 3×3 grid with a few digits |
| x-diagonal | 3×3 with one diagonal stroked |
| hyper | 3×3 with one tinted inner box |
| anti-knight | 3×3 with knight's-L overlay |
| anti-king | 3×3 with king's-step crosshatch |
| non-consecutive | two adjacent cells with `≠±1` glyph |
| jigsaw | irregular polyomino borders |
| even-odd | square + circle pair |
| mini-6 | 2×3 box grid |
| kropki | two cells joined by a dot |
| xv | two cells joined by an X glyph |
| greater-than | two cells with `<` between |
| thermometer | a thermometer bulb-and-line |
| arrow | a circled cell with an arrow tail |
| killer | dashed cage with a sum number |
| little-killer | outside-grid arrow |
| sandwich | outside number with two "bread" digits |
| skyscraper | three buildings of increasing height |
| palindrome | a curve with mirrored endpoints |
| renban | a curve with consecutive digits |
| german-whispers | a curve with ±5 indicator |
| mega-16 | a 4×4 box grid |
| samurai | the cruciform silhouette |

### Filters

- **Grid size** (single-select, default `All`): radio-style chip row. Active chip uses `--color-accent-soft` background.
- **Features** (multi-select, default empty): toggle-style chips. Active chips highlighted; tap again to remove.
- Filter state lives in `Home` component (`useState`), not persisted. Fresh per visit.
- Visible card set = catalog filtered by (size matches OR `all`) AND (features ⊇ selected features, or no features selected).
- Empty result shows `i18n.home.empty` ("No variants match these filters.") in centered muted text.

## VariantDetail screen

### Layout

```
┌──────────────────────────────────────────────────────┐
│  ←  Home                                             │
│                                                      │
│  ┌────┐                                              │
│  │ ▥  │  Killer Sudoku                               │
│  │    │  Cells partitioned into cages; each cage     │
│  └────┘  has a target sum.                           │
│                                                      │
│  ── Rules ──                                         │
│  • Classic Sudoku rules apply.                       │
│  • Each cage (dashed outline) shows a sum.           │
│  • No digit may repeat inside a cage.                │
│                                                      │
│  ── Pick difficulty ──                               │
│  [ Easy ]  [ Medium ]  [ Hard ]  [ Expert ]          │
│  [ Diabolical ]                                      │
│                                                      │
│  ── Stats ──                                         │
│  Played 12 · Best time 4:23 · Streak 3               │
└──────────────────────────────────────────────────────┘
```

Renders only when `:kind` resolves to a catalog entry; otherwise redirects to `/`.

### Markdown rendering

Source: `src/ui/onboarding/<kind>.md`, two `---`-separated sections.

```markdown
---
title: How it works
image: cage-example
---
- Classic Sudoku rules apply.
- Each cage (dashed outline) shows a sum.
- No digit may repeat inside a cage.

---
title: Quick example
image: cage-worked
---
A 3-cell cage with sum 15 must contain {4, 5, 6} or {3, 5, 7} …
```

Section 1's body is also the "Rules" block on VariantDetail. Section 2 is shown only inside the Onboarding wizard.

Markdown renderer: a hand-rolled minimal renderer (~50 LOC) covering paragraphs, bulleted lists, `**bold**`, `*italic*`, and inline `code`. Output is plain React nodes, never raw HTML strings. Avoids pulling in `marked` for just two components. Renderer lives at `src/ui/components/markdown.tsx` and is unit-tested.

### `DifficultyPicker`

Reusable component used by VariantDetail; replaces the inline picker on the current Home.

```tsx
interface DifficultyPickerProps {
  variant: VariantKind
  onPick: (difficulty: Difficulty) => void
}
```

- Reads `listBanks(variant)` and shows only bands with banks
- Order: `very-easy → easy → medium → hard → tough → expert → diabolical` (filtered)
- Labels from `i18n.difficulty[band]`
- Each pill has `data-testid="difficulty-{band}"`
- All 7 bands styled identically; no per-band color

### Stats block (per variant)

Reads from existing `statsStore`. Displays played count, best time, current streak — same shape as the Stats page but scoped to the variant. Hidden if zero plays.

## Onboarding flow

### Trigger

In VariantDetail, tapping a difficulty pill:

```ts
onPick(difficulty) {
  if (onboardingStore.hasSeen(variant)) {
    navigate(`/play?variant=${variant}&difficulty=${difficulty}`)
  } else {
    setPendingDifficulty(difficulty)
    setOnboardingOpen(true)
  }
}
```

### Component

```
┌──────────────────────────────────────┐
│  How it works                     ✕  │  ← Skip = ✕
│                                      │
│  ┌──────────────────────────────┐    │
│  │      [optional SVG illus]    │    │
│  └──────────────────────────────┘    │
│                                      │
│  • Classic Sudoku rules apply.       │
│  • Each cage shows a sum.            │
│  • No digit may repeat inside cage.  │
│                                      │
│  ─────────────────────────────────   │
│  Skip          ● ○        Next →     │
└──────────────────────────────────────┘
```

Screen 2 swaps title to "Quick example", renders the second markdown section, replaces `Next` with `Done`.

On Skip OR Done: `onboardingStore.markSeen(variant)` → `navigate('/play?…')`.

Tapping the backdrop outside the modal also counts as Skip (same call).

### State store

```ts
// src/state/onboardingStore.ts
interface OnboardingState {
  seen: ReadonlySet<VariantKind>
  hasSeen: (variant: VariantKind) => boolean
  markSeen: (variant: VariantKind) => void
  reset: () => void   // for Settings → "Reset onboarding"
}
```

- Zustand store; subscribes to a write-through callback that persists to IndexedDB
- New object store `onboardingSeen` in `src/storage/db.ts` (one row, key=`'set'`, value=array of variant kinds)
- Hydrated once on app mount via existing persistence wiring

### Settings integration

Settings page gets a new "Reset onboarding" button. Phase 18 wires it; Phase 19 may add i18n. Calls `onboardingStore.reset()` and inline-swaps the button label to "Onboarding reset." for 2 seconds, then restores. No global toast system — Logikku has none, and a single transient label change is simpler than adding one.

## Continue card

Behavior unchanged from current Home, with three refinements:

1. Label uses `i18n.catalog[variant].name` (e.g., "Samurai" not `samurai.charAt(0).toUpperCase() + …`)
2. Difficulty label uses `i18n.difficulty[band]`
3. Includes relative timestamp "started Xm ago" / "started Xh ago" computed from `savedGame.startedAt`

Placement: top of Home, above the filter chips (decided in Part 2 review).

## i18n string extraction

```ts
// src/i18n/en.ts
export const en = {
  app: {
    title: 'Logikku',
    tagline: 'Sudoku, every variant.',
  },
  home: {
    continue: 'Continue',
    startedAgo: (mins: number) => /* "5 min ago", "2 h ago" */,
    filters: {
      sizeLabel: 'Grid size',
      featuresLabel: 'Features',
      sizeAll: 'All',
      size9x9: '9×9',
      size6x6: '6×6',
      size16x16: '16×16',
      sizeSamurai: 'Samurai',
      featureClassicLike: 'Classic',
      featureCage: 'Cage',
      featurePath: 'Path',
      featureOutsideClue: 'Outside',
      featureParity: 'Parity',
      featureEdgeClue: 'Edge',
      featureArithmetic: 'Arithmetic',
    },
    empty: 'No variants match these filters.',
  },
  variant: {
    backToHome: 'Home',
    rules: 'Rules',
    pickDifficulty: 'Pick difficulty',
    stats: 'Stats',
    statsPlayed: (n: number) => `Played ${n}`,
    statsBestTime: (mmss: string) => `Best time ${mmss}`,
    statsStreak: (n: number) => `Streak ${n}`,
    notFound: 'Variant not found.',
  },
  difficulty: {
    'very-easy': 'Very Easy', easy: 'Easy', medium: 'Medium',
    hard: 'Hard', tough: 'Tough', expert: 'Expert', diabolical: 'Diabolical',
  },
  onboarding: {
    skip: 'Skip',
    next: 'Next',
    done: 'Done',
    close: 'Close',
  },
  settings: {
    resetOnboarding: 'Reset onboarding',
    resetOnboardingDone: 'Onboarding reset.',
  },
  catalog: {
    classic:        { name: 'Classic',         description: 'The original. Row, column, box.' },
    'x-diagonal':   { name: 'X / Diagonal',    description: 'Plus both main diagonals.' },
    hyper:          { name: 'Hyper',           description: 'Four extra inner boxes.' },
    'anti-knight':  { name: 'Anti-Knight',     description: 'No two knight\'s-move cells repeat.' },
    'anti-king':    { name: 'Anti-King',       description: 'No two king\'s-step cells repeat.' },
    /* …all 23 entries… */
  },
}
```

All UI components import `en` (or a future `useStrings()` hook) — no inline copy. Phase 19 will add `ms.ts` and a runtime selector.

## Component contracts

### `<Home />`

- Reads: `mostRecentUnfinished()` (existing), `VARIANT_CATALOG`, `listBanks()`
- Owns: filter state (`size`, `features`)
- Renders: continue card, two filter rows, variant grid, footer nav

### `<VariantDetail />`

- Route param: `kind` (validated against catalog)
- Reads: `getVariant(kind)`, parsed onboarding markdown, `listBanks(kind)`, per-variant stats from `statsStore`
- Owns: onboarding modal open state, pending difficulty
- Renders: header, rules block, difficulty picker, stats block, conditional onboarding modal

### `<DifficultyPicker variant onPick />`

- Reads: `listBanks(variant)`
- Renders: pill row of present bands; calls `onPick(band)` on tap

### `<Onboarding kind onDone />`

- Reads: parsed onboarding markdown for `kind`
- Owns: current screen index (0 or 1)
- Calls `onboardingStore.markSeen(kind)` then `onDone()` on Skip/Done

### `<VariantCard kind disabled />`

- Reads: `getVariant(kind)`
- Renders: thumbnail + name + description; link if not disabled

## Testing strategy

### Unit / component tests

- `src/state/onboardingStore.test.ts` — `markSeen` idempotent, `reset` clears, persistence survives rehydrate
- `src/ui/components/DifficultyPicker.test.tsx` — renders only available bands, calls onPick on tap
- `src/ui/components/Onboarding.test.tsx` — navigates 2 screens, Skip and Done both call markSeen + onDone, backdrop tap = Skip
- `src/ui/components/VariantCard.test.tsx` — renders enabled and disabled states, link targets `/variant/:kind`
- `src/ui/components/markdown.test.tsx` — renders paragraphs, bullets, bold, italic, inline code; ignores unsupported syntax safely
- `src/ui/pages/Home.test.tsx` — renders 23 cards (1 disabled), continue card present when game pending, filter chips toggle visible subset, empty state shows when no matches
- `src/ui/pages/VariantDetail.test.tsx` — renders rules from markdown, picker shows only present bands, tap when unseen mounts onboarding, tap when seen navigates direct to Play, unknown kind redirects to `/`
- `src/ui/variantCatalog.test.ts` — every catalog entry has a thumbnail file and an onboarding file (asserts at test time)
- `src/i18n/en.test.ts` — every variant in `VARIANT_CATALOG` has a `catalog[kind]` entry with name and description

### E2E (`e2e/discovery.spec.ts`)

- iPad landscape: Home renders, all 23 cards visible
- Tap Killer card → VariantDetail → rules visible
- Tap Easy → Onboarding modal → Next → Done → Play loaded
- Back to Home → Continue card present, labeled "Killer · Easy · started …"
- Tap Killer again → VariantDetail → tap Easy → Play loads directly (no onboarding)
- Reset onboarding from Settings → tap Killer → Easy → Onboarding reappears
- Filter: tap "9×9" then "Cage" → only Killer visible
- Filter empty case: pick filters with no matches → empty state shown

### Visual smoke

- iPad screenshot of Home (landscape and portrait)
- iPad screenshot of VariantDetail (Killer)
- iPad screenshot of Onboarding screen 1 and screen 2

## Acceptance criteria

- [ ] All 23 variants discoverable from Home; jigsaw card disabled (no bank yet)
- [ ] Tag filters (size + features) work; AND across categories; empty state renders
- [ ] Onboarding non-blocking (Skip works); never reappears once dismissed (until reset)
- [ ] Continue card uses correct catalog name + relative time; survives reload
- [ ] Difficulty picker shows only bands with shipped banks per variant
- [ ] All user-facing strings live in `src/i18n/en.ts`
- [ ] Unit + e2e tests green
- [ ] Typecheck / lint / build clean
- [ ] iPad landscape + portrait both render correctly

## Out of scope

- Malay translation (Phase 19)
- A11y deep pass — ARIA review (Phase 19)
- Generating jigsaw banks (separate sub-project; jigsaw stays disabled at launch)
- Daily puzzle features (never)
- Variant-specific tutorial puzzles (deferred indefinitely)

## Open risks

| Risk | Mitigation |
|---|---|
| 23 hand-drawn SVGs is meaningful art work | Minimal monochrome line-art style; reuse common motifs (3×3 grid, curves). One designer-pass if needed. |
| 46 onboarding markdown screens take real writing time | Treat as one bulk task in the plan; ship pithy 3-line bodies. |
| Hand-rolled markdown renderer might miss edge cases | Strict subset; unsupported syntax falls through as plain text. Unit tests cover every feature we use. |
| Continue card label uses pre-i18n catalog | Wire through i18n.catalog from day one so Phase 19 i18n is a drop-in. |

## Filenames & timing

- Spec: `docs/superpowers/specs/2026-05-21-phase-18-variant-ui-design.md` (this file)
- Plan: `docs/superpowers/plans/2026-05-21-phase-18-variant-ui.md` (next step)
- Estimate: ~10–12 tasks, comparable size to Phase 17c.
