# Phase 20 — Launch: Vercel Deploy, Privacy Policy, iPad QA

> Read first: `CLAUDE.md`, `docs/NAMING.md` (domain decisions).
> Prereqs: Phases 0–19. Everything must be green.
> Note: This phase replaces the original "Bubblewrap TWA" phase from the pre-pivot plan. The Bubblewrap path is dead (Android-only); iPad PWA delivery is the v1 target. Capacitor + iPadOS App Store is **Phase 21**, a separate future effort.

## Goal

Ship Logikku to the live web. The user can give the URL to his father-in-law, who installs the PWA on his iPad via Safari "Add to Home Screen" and plays offline.

## Deliverables

### Domains & DNS

- Register `logikku.com` and `logikku.app` (already-vetted in `docs/NAMING.md`).
- Configure DNS at registrar: `logikku.com` and `www.logikku.com` → Vercel; `logikku.app` 301 → `logikku.com`.

### Vercel deploy

- Connect GitHub repo to Vercel.
- Project name `logikku`. Framework preset: Vite. Build command auto-detected.
- Production branch: `main`. Preview deployments on PRs.
- Add `vercel.json` with cache headers (immutable for hashed assets, no-cache for `index.html` and `sw.js`).
- Add a `_headers`-equivalent (Vercel rewrites) to enforce HTTPS and set basic CSP that explicitly allows `'self'` and nothing else (no external scripts, no analytics).

### Privacy policy + about

- `src/ui/pages/Privacy.tsx` — short, plain-English: "Logikku collects no data, sends no data, has no accounts, has no analytics. All progress is stored locally on your device." Updated date.
- `src/ui/pages/About.tsx` — credits, version, link to backup/restore guide.
- Footer link from Settings.

### Final iPad QA

- Install to home screen on a real iPad. Confirm:
  - Correct icon and splash.
  - Standalone (no Safari chrome).
  - Works in airplane mode.
  - Backup → AirDrop the JSON to laptop → restore on another iPad → state preserved.
  - All 23 variants playable end-to-end.
- File any findings as new issues; only ship if blockers are clear.

### Documentation for the user

- `docs/USER_GUIDE.md` — short non-technical guide: how to install, how to back up, how to restore. This is for the user (or anyone helping his FIL).

### Soft launch

- Share URL with the user. Confirm install works on the target iPad.

## Out of scope

- App Store submission (Phase 21).
- Marketing / launch page beyond the app itself.
- Daily streak / leaderboard features. Permanently out of scope.

## Acceptance criteria

- [ ] `https://logikku.com` loads, installs to iPad home screen.
- [ ] Lighthouse PWA / Performance / Accessibility / Best Practices ≥ 80 on production.
- [ ] Privacy page accurately reflects zero data collection.
- [ ] One full play session of each of the 23 variants completed on a real iPad without crashes.
- [ ] CSP enforces no external resources; DevTools Network panel during gameplay shows zero non-self requests.

## Output format

Final report: deployed URL, Lighthouse scores from production, privacy page text, summary of iPad QA findings, suggested Phase 21 scope if user wants App Store.
