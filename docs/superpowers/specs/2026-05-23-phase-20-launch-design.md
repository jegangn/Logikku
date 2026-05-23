# Phase 20 — Launch: Vercel Deploy, Privacy/About, iPad QA (Design)

**Date:** 2026-05-23
**Status:** Approved
**Driving prompt:** `prompts/phase-20-launch.md`

## Goal

Ship Logikku to the live web so a non-technical user can install the PWA on an
iPad via Safari "Add to Home Screen" and play offline. This phase delivers the
in-repo artifacts required for launch plus a precise ops runbook for the
human-only steps (domains, Vercel, physical-device QA).

## Scope split

This phase has two distinct categories of work. Only the first is implementable
in-repo; the second requires accounts, money, and physical hardware.

### In-repo (built this session)

- `vercel.json` — cache headers, self-only CSP, security headers, SPA fallback.
- `src/ui/pages/Privacy.tsx` + route `/privacy`.
- `src/ui/pages/About.tsx` + route `/about`.
- Footer links (Privacy, About) from Settings.
- `privacy` and `about` i18n sections in `en.ts` and `ms.ts` (bilingual).
- Version bump to `1.0.0`, injected via Vite `define` and shown on About.
- `docs/USER_GUIDE.md` — non-technical install/backup/restore guide.
- `docs/DEPLOYMENT.md` — ops runbook for the human-only steps.
- Render tests for Privacy/About; full gate run.

### Human-only ops (documented in `docs/DEPLOYMENT.md`, not executed here)

- Register `logikku.com` and `logikku.app` (per `docs/NAMING.md`).
- Configure DNS at the registrar.
- Import the GitHub repo to Vercel; set production branch `main`.
- Configure domains in Vercel; set `logikku.app` → `logikku.com` 301.
- Real-iPad QA: install, standalone, airplane mode, backup/restore across
  devices, all 23 variants playable.
- Lighthouse on the production URL (target ≥ 80 across PWA / Perf / A11y / Best
  Practices).
- Soft launch: share the URL.

## Architecture & decisions

### 1. `vercel.json`

**Cache headers**
- Hashed build assets (`/assets/*`): `Cache-Control: public, max-age=31536000, immutable`.
- `index.html`, `sw.js`, the web manifest: `Cache-Control: no-cache` (so the
  PWA picks up new deploys immediately).

**Content-Security-Policy (delivered as an HTTP response header)**

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
worker-src 'self';
manifest-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
object-src 'none';
upgrade-insecure-requests
```

Rationale: the only relaxation is `'unsafe-inline'` on **styles** (React sets
inline `style` attributes; Tailwind utilities are fine but defensive). Scripts
remain strict `'self'`, so there is no path for external scripts, analytics, or
trackers. This satisfies the acceptance criterion that the Network panel during
gameplay shows zero non-self requests. CSP is delivered via header (not a
`<meta>` tag) so it can use `frame-ancestors` and cannot be bypassed.

**Other security headers**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `X-Frame-Options: DENY`

**SPA fallback**
- `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` so deep
  links / hard refresh on `/settings`, `/privacy`, etc. resolve. Vercel serves
  existing static files (assets, `sw.js`) before applying rewrites, so the
  service worker and hashed assets are unaffected.

**Verification caveat:** Vercel headers/CSP apply only on Vercel's edge, not
under local `bun run preview`. Correctness is verified by reasoning during this
phase; `docs/DEPLOYMENT.md` documents how to confirm headers against the live
deploy (`curl -I`) and the DevTools Network check.

### 2. Privacy page

`src/ui/pages/Privacy.tsx`, route `/privacy`. Plain-English copy: Logikku
collects no data, sends no data, has no accounts, has no analytics; all progress
is stored locally on the device; cleared only by the user. Shows "Last updated
23/05/2026". Back button to Home. Styled to match Settings/Stats (same layout
shell, `useT()`, theme variables). Copy lives in a new `privacy` i18n section.

### 3. About page

`src/ui/pages/About.tsx`, route `/about`. Shows the app name, one-line tagline
("Logikku — calm Sudoku, every variant."), version `1.0.0`, a neutral credit
line (no personal name), and links to Privacy and to Backup/Restore (Settings).
Copy lives in a new `about` i18n section.

### 4. Footer links from Settings

Add Privacy and About links alongside the existing Stats link at the bottom of
`Settings.tsx`. Same muted footer styling.

### 5. Version → 1.0.0

Bump `package.json` `version` to `1.0.0`. Inject into the bundle via Vite
`define: { __APP_VERSION__: JSON.stringify(pkg.version) }` (single source of
truth — no duplicated constant). Declare `__APP_VERSION__` in
`src/vite-env.d.ts`. About reads `__APP_VERSION__`.

### 6. `docs/USER_GUIDE.md`

Audience: the user or anyone helping his father-in-law. Non-technical, no
jargon. Covers: installing via Safari "Add to Home Screen"; backing up (Settings
→ Backup → save the JSON to Files / AirDrop); restoring on a new device.

### 7. `docs/DEPLOYMENT.md`

Audience: the user (ops). Step-by-step runbook for the human-only items above:
domain registration, DNS records, Vercel import, domain config and the
`.app → .com` 301, production verification (`curl -I` header check, DevTools
network check), Lighthouse, and the iPad QA checklist from the prompt.

## Testing

- **Privacy / About:** React Testing Library render tests — back navigation
  present, key copy rendered, About shows the version string.
- **i18n parity:** the existing structural parity test (`parity.test.ts`)
  automatically covers the new `privacy` and `about` sections (en vs ms shape +
  no-empty-string).
- **Gates:** `bun run typecheck`, `bun run lint`, `bun run test:run`,
  `bun run build`, then `bun run preview` + a local Lighthouse pass as a
  pre-production proxy.
- **`vercel.json`:** JSON validity checked; CSP/headers behavior is
  Vercel-edge-only and documented for live verification (not unit-testable
  locally).

## Out of scope

- App Store submission and Capacitor wrap (Phase 21).
- Marketing / launch page beyond the app itself.
- Daily streak / leaderboard features (permanently out of scope).
- Executing the human-only ops (no domain purchase, no Vercel account access).

## Acceptance criteria (from the prompt)

- `https://logikku.com` loads and installs to an iPad home screen.
- Lighthouse PWA / Performance / Accessibility / Best Practices ≥ 80 on
  production.
- Privacy page accurately reflects zero data collection.
- One full play session of each of the 23 variants on a real iPad, no crashes.
- CSP enforces no external resources; DevTools Network during gameplay shows
  zero non-self requests.

The first, second, fourth, and fifth criteria are validated by the user during
ops/QA (runbook-guided). The in-repo work makes them achievable; the third is
fully satisfied by the Privacy page copy.
