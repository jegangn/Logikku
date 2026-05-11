# Phase 5 — PWA Polish (Manifest, Service Worker, Installability)

> Read first: `CLAUDE.md`, https://web.dev/articles/progressive-web-apps (refresher), Apple's HIG on Web Apps.
> Prereqs: Phase 4 (so theme + settings exist before we cache them).

## Goal

Make Logikku installable on iPad Safari with a polished home-screen experience: proper icons, splash screen, offline operation, update prompt. Hit Lighthouse PWA / Performance / Accessibility / Best Practices ≥ 80 on a static build served by `bun preview`.

## Deliverables

### Manifest (`public/manifest.webmanifest` via `vite-plugin-pwa`)

- `name`, `short_name`, `description`, `theme_color`, `background_color`, `display: "standalone"`, `start_url: "/"`, `orientation: "any"`.
- Icons: 192, 512, 1024 PNG; maskable variants. Plus iOS-specific `apple-touch-icon.png` (180 × 180).
- iOS splash screens for common iPad sizes (use a generator and commit results to `public/splash/`).

### Service worker

- `vite-plugin-pwa` `generateSW` strategy (Workbox).
- Precache: all built assets + all `src/puzzles/**/*.jsonl` banks.
- Runtime cache: nothing (no network at runtime).
- `registerType: 'autoUpdate'` with an in-app "Update available" toast (component `UpdatePrompt.tsx`).

### iPad-specific tweaks

- `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style`, `apple-touch-fullscreen`.
- `<meta name="theme-color">` light + dark variants via `media`.
- Disable pull-to-refresh / rubber-band scroll inside the play area (`overscroll-behavior: contain`).
- Prevent text selection during gameplay; allow it in Settings/Stats.

### Install prompt UX

- Home page shows a one-time banner: "Tap Share → Add to Home Screen for the best experience." Dismissable; doesn't reappear once dismissed or detected-installed.

### Tests / verification

- Lighthouse CI in `package.json` script: `bun run lighthouse` runs `lighthouse http://localhost:4173 --output=json` and asserts category scores ≥ 80.
- E2E: `e2e/pwa.spec.ts` — service worker registers; manifest accessible at `/manifest.webmanifest`.
- Manual: install to home screen on a real iPad. Launch. Confirm: no Safari chrome, correct splash, runs offline (toggle airplane mode and play).

## Out of scope

- Push notifications. Sudoku doesn't need them.
- App Store wrap — Phase 21.

## Acceptance criteria

- [ ] Lighthouse PWA ≥ 80, Performance ≥ 80, Accessibility ≥ 80, Best Practices ≥ 80 (run on `bun preview`).
- [ ] Installed PWA on iPad Safari launches in standalone mode with correct splash.
- [ ] Airplane mode → app still loads, all banks playable.
- [ ] Service worker correctly precaches the puzzle banks (DevTools → Application → Cache Storage).

## Output format

Files added/modified, Lighthouse JSON summary (paste category scores), screenshots of installed PWA on iPad, open questions.
