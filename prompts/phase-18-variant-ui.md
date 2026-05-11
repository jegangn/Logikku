# Phase 18 — Variant Selection UI + Per-Variant Onboarding

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` (every section).
> Prereqs: Phases 6–17 (all variants implemented).

## Goal

The home / variant-picker screen, per-variant onboarding for first play, and difficulty selection. This is the surface where a player browses the 23 variants.

## Deliverables

### Variant catalog (`src/ui/pages/Home.tsx`)

- Grid of variant cards. Each card: variant name, 1-line description, small preview thumbnail (auto-generated SVG of a sample grid).
- Tag filters: by grid size (6/9/16/Samurai), by feature (path-based, cage, outside-clue, parity, etc.).
- Tap a card → variant detail screen.

### Variant detail (`src/ui/pages/VariantDetail.tsx`)

- Variant rules (markdown, sourced from `docs/VARIANTS.md` section).
- "Play" button → difficulty picker → loads a random un-played puzzle from that bank.
- Stats summary for this variant.
- Skippable onboarding: 2-screen explainer shown on first play; never again.

### Difficulty picker

- Five buttons: Easy / Medium / Hard / Expert / Diabolical. Disabled if no puzzles in that band for this variant.

### Continue card

- Home screen shows "Continue: <variant>, <difficulty>, started <relative time>" if there's an unfinished game; tap → resume.

### Routing

- `/` → Home, `/variant/:kind` → VariantDetail, `/play?variant=...&difficulty=...&puzzleId=...` → Play.

### Tests

- Component tests for variant cards, detail screen, difficulty picker.
- E2E: navigate from Home → Variant → Difficulty → Play; complete a puzzle; return to Home; Continue card no longer shown for that game.

### Onboarding content

- Per variant, a short markdown explainer in `src/ui/onboarding/<variant>.md` (imported via Vite ?raw). Phase 19 will add BM translations.

## Out of scope

- i18n (Phase 19), but keep all strings in `src/i18n/en.ts` for easy extraction.
- Daily-puzzle features. Not in scope, ever.

## Acceptance criteria

- [ ] All 23 variants discoverable from Home.
- [ ] Onboarding for each variant is non-blocking (skippable) and never reappears once dismissed.
- [ ] Continue card works correctly across reloads.
- [ ] No engine regressions.

## Output format

Standard plus screenshots of Home, VariantDetail, and a sample onboarding screen on iPad.
