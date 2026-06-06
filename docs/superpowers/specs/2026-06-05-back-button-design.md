# Spec — Consistent Back Button on Every Screen

**Date:** 2026-06-05
**Status:** Approved (design), pending implementation plan

## Problem

Every screen except Home already has a back affordance, but they are inconsistent and the most-used one (the game) is easy to miss:

| Screen | Current back affordance | Position | Destination |
|---|---|---|---|
| Play (game) | faint text "← Back" | **bottom**, below the input pad | Home |
| Settings | faint text "← Back" | top | Home |
| Stats / Privacy / About | faint text "← Back" | top | Home |
| VariantDetail | "← Home" | top | Home |
| Home | none (root) | — | — |

Issues:
1. The **game's** back is a faint link buried below the board + input pad — on an iPad it sits below the fold and reads as "no back button" to the target persona (non-technical, older).
2. Labels, positions, and styles are **inconsistent** across pages (`← Back` vs `← Home`; top vs bottom).
3. No single source of truth — each page reimplements the link, so they drift.

## Goal

A single, visible, consistent back affordance on every non-root screen, with predictable navigation, owned by one component.

## Decisions (from brainstorming)

- **Back destination:** Game → always Home. Secondary pages (Settings, Stats, Privacy, About, VariantDetail) → previous screen (history back), with Home as fallback when there is no in-app history.
- **Game placement:** top-left chevron, *before* the "Logikku" title (keep the title). Resulting toolbar left cluster: `‹ Back · Logikku · Classic Easy`.

## Design (Approach A — shared component)

Rejected alternatives: (B) restyle each page's inline button — duplicates markup, drifts again; (C) one global top bar in `App` outside `<Routes>` — invasive, fights each page's layout and the game toolbar.

### New component — `src/ui/components/BackButton.tsx`

Renders a left chevron SVG + label. Minimum 44px touch target, theme tokens, styled to match the existing icon buttons in `Toolbar.tsx`.

Props:

```ts
interface BackButtonProps {
  to?: string          // explicit destination; omit for history-back
  label?: string       // defaults to the localized t.play.back
  className?: string
  testId?: string      // defaults to "back-button"
}
```

Behavior:

- **`to` provided** → `navigate(to)` unconditionally. (Game passes `to="/"`.)
- **`to` omitted** → history-back with a guard:
  ```ts
  if (location.key !== 'default') navigate(-1)
  else navigate('/')
  ```
  React Router assigns `location.key === 'default'` only to the very first entry. A non-default key means there is a prior in-app entry to return to; `'default'` (fresh PWA deep-link / first entry) falls back to Home so the user never backs out of the app. (Chosen over reading `window.history.state.idx` because it is router-native — works identically with `BrowserRouter` and `MemoryRouter`, so it's directly unit-testable.)

The component supplies its own chevron icon, so the label text must **not** also contain an arrow (see i18n change).

### i18n change

`t.play.back` is currently `'← Back'` / `'← Kembali'`. Drop the leading `← ` → `'Back'` / `'Kembali'`, because `BackButton` now renders the chevron. No new keys are added; the existing key becomes the component's default label.

`t.variant.backToHome` (`'Home'` / `'Laman Utama'`) becomes unused after VariantDetail switches to `BackButton` — remove it as part of the change (no dangling keys).

### Game screen — `Toolbar.tsx` + `Play.tsx`

- `Toolbar.tsx`: render `<BackButton to="/" testId="back-home" />` as the first element of the left cluster, before the `<h1>` title. (Reuses the existing `back-home` testid so current tests keep passing.) Add a `ChevronLeftIcon` alongside the existing `UndoIcon` / `RedoIcon`.
- `Play.tsx`: **remove** the faint bottom back `<button>` (lines ~347–354) and its `data-testid="back-home"` — now redundant. The `navigate`/`useNavigate` import in `Play.tsx` may become unused; remove if so.

### Secondary pages

Replace each page's ad-hoc back `<button>`/link with `<BackButton />` (history-back mode), keeping it in its current top-left position:

- `Settings.tsx`
- `Stats.tsx`
- `Privacy.tsx`
- `About.tsx`
- `VariantDetail.tsx` (drops the `← {t.variant.backToHome}` markup)

Each page's local `useNavigate` import is removed if it becomes unused after the swap.

### Home

Unchanged — it is the root; nothing to go back to.

## Testing (TDD)

- **New** `BackButton.test.tsx`:
  - `to="/"` → navigates to `/`.
  - no `to`, history `idx > 0` → calls `navigate(-1)` (router history back).
  - no `to`, history `idx === 0` / absent → navigates to `/` (fallback).
  - renders the default label and an accessible name; respects a custom `label`.
- **Update** existing tests that assert on the old back links:
  - `Toolbar.test.tsx` — assert the back button renders in the toolbar.
  - Any Play/Settings/Stats/Privacy/About/VariantDetail test referencing the old back markup (`back-home`, `t.play.back` text with arrow, `← Home`).
- Run `bun run typecheck`, `bun run test:run`, `bun run build` green before push. Manual iPad-Safari smoke per project workflow.

## Out of scope

- No global header / persistent chrome.
- No change to Home.
- No animated transitions.
- No browser-native gesture handling beyond what React Router already provides.
