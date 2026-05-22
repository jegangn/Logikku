# Phase 19 — i18n (EN + BM) + Accessibility + Dark-Mode Pass — Design

> **Status:** Approved for planning (2026-05-23).
> **Phase prompt:** `prompts/phase-19-i18n-a11y.md`. **Prereq:** Phase 18 (shipped on `main`).

## Goal

Launch polish in three intertwined pillars, executed as **one combined phase**:

1. **i18n** — dual language English + Bahasa Malaysia, no external library.
2. **Accessibility** — axe-clean on the four core screens, keyboard-navigable, motion-respecting.
3. **Dark mode** — AA contrast audit across all 23 variant overlays.

## Guiding constraints (from `CLAUDE.md`)

- No backend, no analytics, no third-party **runtime** scripts. `@axe-core/playwright` is a **dev/test-only** dependency — never bundled.
- Engine layer stays pure. All work here is in `src/i18n/`, `src/ui/`, `src/state/`, `src/storage/`, `src/index.css`, and `e2e/`.
- Tailwind only; no `.css` beyond `index.css`. Path alias `@/*`.
- bun, never npm. `bun add -d @axe-core/playwright`.
- Calm UX for an older, non-technical iPad user.

## Current state (verified)

- **Theme already works**: `theme: 'light' | 'dark' | 'system'` in `settingsStore`, applied via `data-theme` on `<html>` (`src/theme.ts`), CSS custom properties in `index.css` switch on `html[data-theme="light"]`. Settings has a 3-button theme group.
- **Strings mostly centralized** in `src/i18n/en.ts` (~150 strings, nested namespaces; some values are functions, e.g. `home.startedAgo(mins)`, `onboarding.stepOf(i,n)`, `variant.statsPlayed(n)`).
- **No** `useT()` hook, **no** `LanguageContext`. 9 components import `t` directly: `Home`, `Settings`, `VariantDetail`, `Stats` (pages); `DifficultyPicker`, `VariantCard`, `Onboarding` (components); `InstallBanner`, `UpdatePrompt` (pwa).
- **Straggler hardcoded strings**: `Play.tsx` (`DIFFICULTY_LABELS`/`VARIANT_LABELS` duplicate maps, "Loading…", "Solved!", "← Back"); `InputPad.tsx` ("Value", "Pencil", "Input pad", "Input mode", "Digit pad", "Erase"); `Toolbar.tsx` ("Logikku", "Undo", "Redo", "New puzzle").
- **Onboarding**: 23 `.md` files in `src/ui/onboarding/`, loaded via Vite `?raw` imports in `variantCatalog.ts`, YAML-frontmatter section format, rendered by `src/ui/components/markdown.tsx`.
- **Board a11y partial**: `Cell.tsx` has `role="gridcell"` + `aria-label` ("Row R Column C, …") but **no** `aria-rowindex`/`aria-colindex`. `Board.tsx` has `aria-label="Sudoku board"` but no `role="grid"`. InputPad mode/digit buttons lack explicit accessible names.
- **No `prefers-reduced-motion` handling anywhere.** No a11y e2e test.
- **Settings persistence**: `SavedSettings` (key `'v1'`, all fields optional) in `db.ts`; **no language field**.

---

## Pillar 1 — i18n

### 1.1 Translation tables

- `src/i18n/en.ts` stays the canonical source. Export a type:
  ```ts
  export type Translations = typeof en
  ```
- Add the straggler keys to `en.ts`:
  - `play.loading`, `play.solved`, `play.back`
  - `play` reuses existing `t.difficulty[...]` and `t.catalog[...]` for labels — **delete** `DIFFICULTY_LABELS` and `VARIANT_LABELS` from `Play.tsx`.
  - `inputPad.value`, `inputPad.pencil`, `inputPad.pad` ("Input pad"), `inputPad.mode` ("Input mode"), `inputPad.digits` ("Digit pad"), `inputPad.erase`, `inputPad.enterDigit(glyph)` (accessible name for a digit button, e.g. "Enter 5" / "Enter A").
  - `toolbar.undo`, `toolbar.redo`, `toolbar.newPuzzle`. (`appName` already exists for "Logikku".)
- `src/i18n/ms.ts`:
  ```ts
  import type { Translations } from './en'
  export const ms: Translations = { /* full BM translation, identical shape */ }
  ```
  Typing as `Translations` makes the build **fail** if any key or function signature is missing — compile-time "missing key" protection.

### 1.2 Language context + hook

- New `src/i18n/index.ts` (or `LanguageContext.tsx`):
  - `export type Language = 'en' | 'ms' | 'system'`
  - `resolveLang(l: Language): 'en' | 'ms'` — `'system'` → `navigator.language.toLowerCase().startsWith('ms') ? 'ms' : 'en'`.
  - `LanguageProvider` holding the resolved `Translations` object plus the resolved code; `useT(): Translations` and `useLang(): 'en' | 'ms'` (the latter used by onboarding to pick the markdown variant).
  - A system-change watcher mirroring `watchSystemTheme` (listens to `languagechange`; resolved value recomputed).
- `App.tsx` wraps the tree in `LanguageProvider`, reading `language` from the settings store (same pattern as theme).
- **Migration**: change the 9 importers from `import { t } from '@/i18n/en'` → `const t = useT()` inside the component body. All 9 are React components, so this is mechanical and safe. No module-scope `t` usage exists outside components (verified — `variantCatalog.ts` does not import `t`).

### 1.3 Settings + persistence

- `settingsStore`: add `language: Language` (default `'system'`), include it in the `set()`-persisted `SavedSettings`.
- `db.ts` `SavedSettings`: add `readonly language?: 'en' | 'ms' | 'system'` (optional → backward compatible; absent = default).
- **Backup**: `backup.ts` serializes `settings: SavedSettings | null` wholesale, so `language` rides along automatically. **No `BACKUP_VERSION` bump** (structural extension of an optional field; v1/v2 backups without it restore to the default).
- Settings UI: add a **"Language"** 3-button group (English / Bahasa Malaysia / System) directly mirroring the existing Theme group, via `setSetting('language', value)`.

### 1.4 Onboarding translation

- Add 23 `src/ui/onboarding/<variant>.ms.md` files (full BM, same section structure as EN).
- `variantCatalog.ts`: import both raw strings per variant; change the catalog field to:
  ```ts
  onboarding: { en: classicEnMd, ms: classicMsMd }
  ```
- `Onboarding.tsx` and `VariantDetail.tsx`: select `meta.onboarding[useLang()]`, falling back to `.en` if a section is somehow absent. They already call `parseOnboardingSections(...)`; the only change is which raw string is passed.

### 1.5 BM translation register

Standard, warm, simple Bahasa Malaysia for an older non-technical reader — not slang, not stiff bureaucratic register. Numerals and Sudoku digit glyphs stay as-is. Founder verifies all BM wording before launch (drafted by the agent).

---

## Pillar 2 — Accessibility

### 2.1 Grid semantics

- `Board.tsx`: `role="grid"`, `aria-label` from i18n, plus `aria-rowcount`/`aria-colcount` = grid size.
- Row grouping: wrap each visual row in `role="row"` with `aria-rowindex={r+1}` (SVG `<g>` is acceptable for ARIA roles).
- `Cell.tsx`: add `aria-colindex={c+1}` to the existing `role="gridcell"` + `aria-label`.
- **Samurai exception**: its five overlapping 9×9 grids have no single coherent row/column index space. Samurai keeps the descriptive `aria-label` ("Grid N, Row R, Column C, …") and **omits** `aria-rowindex`/`aria-colindex`. Documented as a deliberate tradeoff in `docs/GOTCHAS.md`.

### 2.2 Accessible names

- InputPad mode buttons (Value/Pencil) and digit buttons get explicit `aria-label`s from i18n (digit text content alone is insufficient for 16×16 letter glyphs). Erase already labeled.
- Audit Home filter chips, Settings groups, Toolbar — confirm every interactive element has an accessible name (most already do via `aria-label`/`aria-pressed`).

### 2.3 Reduced motion

- Global rule in `index.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- Any JS-driven animation (e.g. solve celebration, if present) checks `matchMedia('(prefers-reduced-motion: reduce)')` and skips.

### 2.4 Dynamic type / zoom

- Verify layouts survive 200% browser zoom on the iPad profile without clipping or overlap. Fix fixed-height/overflow offenders found during audit. Verified manually + spot-checked in the keyboard e2e at a zoomed viewport where practical.

### 2.5 Tab order

- Confirm a linear, predictable tab order on Home → Variant → Play. Fix any out-of-order `tabIndex` or focus traps (Onboarding dialog already `aria-modal`).

---

## Pillar 3 — Dark-mode pass

- Audit Home, Variant, Play, Settings, Stats, Onboarding in dark mode for WCAG AA (4.5:1 text, 3:1 large text / UI).
- Tune the CSS custom properties driving variant overlays so all 23 stay legible in dark mode: cage tints (Killer), path colors (Thermometer, Arrow, Palindrome, Renban, German Whispers, Little Killer), clue chrome (Kropki, XV, Greater-Than, Sandwich, Skyscraper), conflict highlight, peer highlight, pencil marks.
- **Deliberate AA-fail policy**: faint pencil marks may sit below AA on purpose (they must read as secondary). Each intentional exception is recorded in `docs/GOTCHAS.md` with its measured ratio and rationale.

---

## Pillar 4 — Tests

- **`e2e/a11y.spec.ts`** — `@axe-core/playwright` scan on Home, Variant, Play, Settings (both themes where cheap). Target: **zero violations**. Any unavoidable exception is excluded with an inline comment citing the GOTCHAS entry.
- **`e2e/keyboard.spec.ts`** (or extend `discovery.spec.ts`) — keyboard-only walkthrough: Tab to a variant card → Enter → Tab to Play → arrow-key cell navigation → digit entry.
- **Vitest** `src/i18n/parity.test.ts`:
  - Deep structural comparison of `en` vs `ms` (same keys at every depth; function-valued keys are functions in both).
  - All 23 `<variant>.ms.md` exist and parse to the **same number of sections** as their `.en` counterpart.
- Snapshot a small sample of resolved BM strings to catch accidental empties.

---

## Out of scope

- Languages beyond EN + BM.
- VoiceOver narration automation (manual on real iPad; findings documented).
- Any runtime i18n library (react-intl etc.).

## Acceptance criteria

- [ ] BM complete for all UI strings + all 23 onboarding files; `ms.ts` typechecks against `Translations`.
- [ ] Language switch (English / Bahasa Malaysia / System) in Settings, persisted, survives reload and backup/restore.
- [ ] axe violations: **zero** on Home, Variant, Play, Settings.
- [ ] Cells expose `aria-rowindex`/`aria-colindex` (Samurai exception documented).
- [ ] `prefers-reduced-motion` honored.
- [ ] Dark-mode AA pass; deliberate exceptions logged in GOTCHAS with rationale.
- [ ] No regression: typecheck ✓, lint ✓, vitest ✓, build ✓, existing e2e ✓.

## Files touched (map)

**Create**
- `src/i18n/ms.ts`
- `src/i18n/index.ts` (LanguageContext + `useT` + `resolveLang` + watcher)
- `src/ui/onboarding/<variant>.ms.md` × 23
- `e2e/a11y.spec.ts`
- `e2e/keyboard.spec.ts`
- `src/i18n/parity.test.ts`

**Modify**
- `src/i18n/en.ts` (export `Translations`, add straggler keys)
- `src/ui/pages/{Home,Settings,VariantDetail,Stats,Play}.tsx`
- `src/ui/components/{DifficultyPicker,VariantCard,Onboarding}.tsx`
- `src/ui/panels/{InputPad,Toolbar}.tsx`
- `src/pwa/{InstallBanner,UpdatePrompt}.tsx`
- `src/ui/board/{Board,Cell}.tsx`
- `src/ui/variantCatalog.ts`
- `src/state/settingsStore.ts`
- `src/storage/db.ts` (SavedSettings + language)
- `src/App.tsx` (LanguageProvider)
- `src/index.css` (reduced-motion + dark-mode tuning)
- `docs/GOTCHAS.md` (Samurai a11y note + AA-fail log)
- `package.json` (dev dep)
