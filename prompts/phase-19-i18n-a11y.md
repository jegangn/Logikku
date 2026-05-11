# Phase 19 — i18n (EN + BM) + Accessibility Audit + Dark Mode Pass

> Read first: `CLAUDE.md`, the Phase 4 settings code (for theme), the WCAG 2.2 AA color-contrast rules.
> Prereqs: Phase 18.

## Goal

Polish for launch: dual-language (English + Bahasa Malaysia), full accessibility audit, refined dark mode.

## Deliverables

### i18n

- Centralize all UI strings in `src/i18n/en.ts` (already nudged in earlier phases). Extract any stragglers.
- Add `src/i18n/ms.ts` — full Bahasa Malaysia translation.
- Lightweight `useT()` hook reading from a `LanguageContext` (no external library; we have ~200 strings, doesn't need react-intl).
- Settings: "Language: English / Bahasa Malaysia / System". Persisted.
- Variant onboarding `.md` files: provide an `<variant>.ms.md` per variant.

### Accessibility

- Every interactive element has an accessible name (Playwright axe scan in `e2e/a11y.spec.ts`).
- Tab order linear and predictable.
- Cells in the grid expose `aria-rowindex` / `aria-colindex` / `aria-label`.
- WCAG AA contrast in both themes; document any deliberate AA-fail (e.g. very light pencil marks) with rationale.
- Reduced-motion: respect `prefers-reduced-motion`; disable all animations when set.
- Dynamic Type: text scales gracefully up to 200% browser zoom on iPad.

### Dark mode pass

- Audit every screen. Adjust contrast where it slips below AA. Tune cage tints, path colors, conflict highlight so all 23 overlays remain legible in dark mode.

### Tests

- axe-core scan in `e2e/a11y.spec.ts` — zero violations.
- Keyboard-only walkthrough of Home → Variant → Play in Playwright.
- Snapshot tests for translated strings (catch missing keys).

## Out of scope

- More languages than EN + BM (future).
- VoiceOver narration testing — manual on a real iPad, document findings, no automation required.

## Acceptance criteria

- [ ] BM translation complete for UI + all 23 onboarding files.
- [ ] axe violations: zero on Home, Variant, Play, Settings.
- [ ] Reduced-motion honored.
- [ ] No regression.

## Output format

Standard plus axe report summary; note any AA-fail tradeoffs taken and why.
