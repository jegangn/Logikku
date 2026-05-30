# Logikku — Deployment & Launch Runbook

Audience: the maintainer. These are the human-only steps to take Logikku live.
The app code, `vercel.json`, Privacy/About pages, and version are already in the
repo. What remains needs accounts, money, and a physical iPad.

## 1. Register domains

Per `docs/NAMING.md`:

- Register `logikku.com` (≈ USD 10/yr). Six-letter `.com` names get sniped
  — register promptly.
- No DNS records needed yet; Vercel will give you the exact ones in step 3.

## 2. Import the repo to Vercel

1. Push `main` to GitHub if not already there.
2. In Vercel, **Add New → Project → Import** the GitHub repo.
3. Project name: `logikku`. Framework preset: **Vite** (auto-detected).
   Build command and output directory: leave auto-detected (`bun run build` /
   `dist`). Vercel uses bun automatically because `bun.lock` is present.
4. Production branch: `main`. Preview deployments on PRs: on (default).
5. Deploy. Confirm the temporary `*.vercel.app` URL loads and installs.

`vercel.json` (already committed) applies the cache headers, self-only CSP, and
SPA fallback automatically — no dashboard config needed for those.

## 3. Connect the domains

1. In the Vercel project: **Settings → Domains**.
2. Add `logikku.com` and `www.logikku.com`. Vercel shows the DNS records to add
   at the registrar (an A record / CNAME). Add them; wait for verification.
3. Set `logikku.com` as the primary domain so `www` redirects to the apex.

## 4. Verify production headers

From a terminal:

```bash
curl -sI https://logikku.com | grep -i -E 'content-security-policy|strict-transport|cache-control'
```

Expected: a `content-security-policy` line containing `default-src 'self'` and
`frame-ancestors 'none'`, an HSTS line, and `cache-control` on the HTML.

Then in Safari/Chrome DevTools → **Network**, play a puzzle and confirm **zero
requests to any non-`logikku.com` origin** (the acceptance criterion).

**Caching note:** `vercel.json` sets `immutable` cache only on `/assets/*`
(the hashed JS/CSS bundles) and `no-cache` on `index.html` / `sw.js` /
`manifest.webmanifest`. Other dist-root files — the Workbox runtime
(`workbox-*.js`, which is content-hashed) and the PWA icons (`pwa-*.png`,
`maskable-icon-*.png`, `apple-touch-icon.png`) — receive only the security
headers and fall back to the browser's heuristic caching. This is fine: the
Workbox file is hashed, and icons change rarely. If you ever need strict cache
control over those too, add a catch-all `/((?!assets/).*)` cache rule.

## 5. Lighthouse

Run Lighthouse against `https://logikku.com` (Chrome DevTools → Lighthouse, or
`npx lighthouse https://logikku.com`). Target ≥ 80 for PWA, Performance,
Accessibility, Best Practices. Record the four scores.

## 6. iPad QA checklist

On a real iPad, install via Safari → Add to Home Screen, then confirm:

- [ ] Correct app icon and splash screen.
- [ ] Launches standalone (no Safari chrome / address bar).
- [ ] Works in **airplane mode** (fully offline) after first load.
- [ ] Backup → AirDrop the JSON to a laptop → restore on a second iPad → state
      preserved.
- [ ] All 23 variants playable end-to-end without a crash.

File any blocker as a new issue. Ship only if there are no blockers.

## 7. Soft launch

Share `https://logikku.com` with the intended user. Confirm the install works on
the target iPad. Done.
