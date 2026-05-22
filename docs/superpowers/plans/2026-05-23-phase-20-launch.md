# Phase 20 — Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the in-repo artifacts that make Logikku launchable as an installable iPad PWA — Vercel config (cache + self-only CSP), bilingual Privacy and About pages, version 1.0.0, and the two launch docs — leaving the human-only ops (domains, Vercel account, physical-iPad QA) to a runbook.

**Architecture:** Two new React pages reuse the existing page shell (back button + `max-w-md` column + `useT()` + theme CSS vars), wired into React Router and linked from the Settings footer. Page copy lives in new `privacy`/`about` sections of the existing i18n tables (`en.ts` + `ms.ts`), so the existing structural parity test covers translation completeness automatically. The app version is a single source of truth (`package.json`) injected into the bundle via a Vite `define` (`__APP_VERSION__`). Deploy behavior lives in `vercel.json` (HTTP headers + SPA fallback rewrite), guarded by a unit test that asserts the CSP stays self-only.

**Tech Stack:** Vite 8, React 19 + TS 6 strict, Tailwind v4, React Router 7, Vitest 4 + @testing-library/react, vite-plugin-pwa, bun, Vercel.

---

## Conventions for the implementer

- **Package manager is `bun`, never npm.** Prefix every command with the bun PATH shim if `bun` is not found: `export PATH="/c/Users/JeganGN/.bun/bin:$PATH"`.
- Path alias `@/*` → `src/*`.
- No comments explaining *what* code does; only non-obvious *why*.
- Tailwind only; reuse existing CSS variables (`--color-text-faint`, `--color-text-muted`, `--color-accent-strong`, `--color-border`).
- The i18n English table (`src/i18n/en.ts`) deliberately has **no `as const`** — values widen to `string`. `src/i18n/ms.ts` is typed `export const ms: Strings`, so any key you add to `en` you MUST also add to `ms` or `bun run typecheck` fails. Add to both in the same step.
- `useT()` works without a provider (its context default is the English table), so component tests do not need a `LanguageProvider`. They DO need a Router wrapper (`MemoryRouter`) because the pages use `useNavigate`/`Link`.
- Vitest applies the Vite `define`, so `__APP_VERSION__` is replaced with the real version string inside tests too.

## File structure

**Create**
- `vercel.json` — deploy config: SPA rewrite, cache headers, CSP + security headers.
- `tools/vercelConfig.test.ts` — guards CSP/cache/rewrite invariants.
- `src/vite-env.d.ts` — ambient `declare const __APP_VERSION__: string`.
- `src/version.test.ts` — asserts the injected version.
- `src/ui/pages/Privacy.tsx` + `src/ui/pages/Privacy.test.tsx`.
- `src/ui/pages/About.tsx` + `src/ui/pages/About.test.tsx`.
- `src/ui/pages/Settings.test.tsx` — footer link test (no existing Settings test).
- `docs/USER_GUIDE.md` — non-technical install/backup/restore guide.
- `docs/DEPLOYMENT.md` — ops runbook for the human-only steps.

**Modify**
- `package.json` — `version` `0.0.0` → `1.0.0`.
- `vite.config.ts` — add `define: { __APP_VERSION__: ... }` reading `package.json`.
- `src/i18n/en.ts` — add `privacy` and `about` sections (in Tasks 2 and 3).
- `src/i18n/ms.ts` — mirror `privacy` and `about` sections.
- `src/App.tsx` — add `/privacy` and `/about` routes.
- `src/ui/pages/Settings.tsx` — footer links to Privacy + About.

---

## Task 1: Version plumbing (1.0.0 → bundle)

**Files:**
- Modify: `package.json` (the `"version"` field)
- Modify: `vite.config.ts`
- Create: `src/vite-env.d.ts`
- Create: `src/version.test.ts`

- [ ] **Step 1: Bump the version**

In `package.json`, change:

```json
  "version": "0.0.0",
```

to:

```json
  "version": "1.0.0",
```

- [ ] **Step 2: Declare the global type**

Create `src/vite-env.d.ts`:

```ts
declare const __APP_VERSION__: string
```

- [ ] **Step 3: Write the failing test**

Create `src/version.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('app version', () => {
  it('injects the package.json version into the bundle', () => {
    expect(__APP_VERSION__).toBe('1.0.0')
  })
})
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `bun run test:run src/version.test.ts`
Expected: FAIL — `__APP_VERSION__ is not defined` (the Vite `define` does not exist yet).

- [ ] **Step 5: Add the Vite define**

In `vite.config.ts`, add the `node:fs` import near the existing imports (it already imports `fileURLToPath, URL` from `node:url`):

```ts
import { readFileSync } from 'node:fs'
```

Then, immediately after the existing imports and before `export default defineConfig({`, add:

```ts
// single source of truth for the app version
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string }
```

Then add a top-level `define` key inside the `defineConfig({ ... })` object (sibling of `resolve`, `plugins`, `test`):

```ts
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `bun run test:run src/version.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.ts src/vite-env.d.ts src/version.test.ts
git commit -m "feat(launch): bump to 1.0.0 and inject __APP_VERSION__"
```

---

## Task 2: Privacy page (bilingual)

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/ms.ts`
- Create: `src/ui/pages/Privacy.tsx`
- Create: `src/ui/pages/Privacy.test.tsx`

- [ ] **Step 1: Add the `privacy` i18n section to both tables**

In `src/i18n/en.ts`, add this section immediately after the `stats: { ... },` block (and before `pwa:`):

```ts
  privacy: {
    title: 'Privacy',
    body: 'Logikku collects no data, sends no data, has no accounts, and has no analytics.',
    local: 'All your progress is stored only on this device. Nothing is ever uploaded. It is cleared only if you clear your browser data or reset the device.',
    updated: 'Last updated 23/05/2026',
  },
```

In `src/i18n/ms.ts`, add the mirrored section in the same position (after `stats`, before `pwa`):

```ts
  privacy: {
    title: 'Privasi',
    body: 'Logikku tidak mengumpul data, tidak menghantar data, tiada akaun, dan tiada analitik.',
    local: 'Semua kemajuan anda disimpan hanya pada peranti ini. Tiada apa-apa dimuat naik. Ia hanya dipadam jika anda memadam data pelayar atau menetapkan semula peranti.',
    updated: 'Kemas kini terakhir 23/05/2026',
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/ui/pages/Privacy.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Privacy } from './Privacy'

describe('Privacy', () => {
  it('states plainly that no data is collected', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    )
    expect(screen.getByText(/collects no data/i)).toBeInTheDocument()
  })

  it('back button returns home', async () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-stub">home</div>} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('← Back'))
    expect(screen.getByTestId('home-stub')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `bun run test:run src/ui/pages/Privacy.test.tsx`
Expected: FAIL — cannot resolve `./Privacy`.

- [ ] **Step 4: Create the page**

Create `src/ui/pages/Privacy.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'

export function Privacy() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <main className="min-h-dvh flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        >
          {t.play.back}
        </button>
        <h1 className="text-3xl font-semibold tracking-tight">{t.privacy.title}</h1>
        <div className="mt-6 space-y-4 text-[var(--color-text-muted)] leading-relaxed">
          <p>{t.privacy.body}</p>
          <p>{t.privacy.local}</p>
        </div>
        <p className="mt-8 text-sm text-[var(--color-text-faint)]">{t.privacy.updated}</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `bun run test:run src/ui/pages/Privacy.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 6: Confirm i18n parity still holds**

Run: `bun run test:run src/i18n/parity.test.ts && bun run typecheck`
Expected: PASS / no errors (proves `ms` mirrors `en` and the `Strings` type is satisfied).

- [ ] **Step 7: Commit**

```bash
git add src/i18n/en.ts src/i18n/ms.ts src/ui/pages/Privacy.tsx src/ui/pages/Privacy.test.tsx
git commit -m "feat(launch): bilingual Privacy page"
```

---

## Task 3: About page (bilingual, shows version)

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/ms.ts`
- Create: `src/ui/pages/About.tsx`
- Create: `src/ui/pages/About.test.tsx`

- [ ] **Step 1: Add the `about` i18n section to both tables**

In `src/i18n/en.ts`, add immediately after the new `privacy` section (still before `pwa`):

```ts
  about: {
    title: 'About',
    tagline: 'Logikku — calm Sudoku, every variant.',
    version: 'Version',
    credit: 'Logikku is an offline-first Sudoku app. It works fully offline, keeps your data on your device, and shows no ads.',
    privacyLink: 'Privacy',
    backupLink: 'Back up or restore your games',
  },
```

In `src/i18n/ms.ts`, add the mirror in the same position:

```ts
  about: {
    title: 'Perihal',
    tagline: 'Logikku — Sudoku yang tenang, setiap variasi.',
    version: 'Versi',
    credit: 'Logikku ialah aplikasi Sudoku yang mengutamakan luar talian. Ia berfungsi sepenuhnya di luar talian, menyimpan data anda pada peranti anda, dan tidak menunjukkan iklan.',
    privacyLink: 'Privasi',
    backupLink: 'Sandar atau pulihkan permainan anda',
  },
```

- [ ] **Step 2: Write the failing test**

Create `src/ui/pages/About.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { About } from './About'

describe('About', () => {
  it('shows the injected app version', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('app-version')).toHaveTextContent('1.0.0')
  })

  it('links to the privacy page', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })
})
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `bun run test:run src/ui/pages/About.test.tsx`
Expected: FAIL — cannot resolve `./About`.

- [ ] **Step 4: Create the page**

Create `src/ui/pages/About.tsx`:

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'

export function About() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <main className="min-h-dvh flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        >
          {t.play.back}
        </button>
        <h1 className="text-3xl font-semibold tracking-tight">{t.about.title}</h1>
        <p className="mt-4 text-[var(--color-text-muted)]">{t.about.tagline}</p>
        <p data-testid="app-version" className="mt-2 text-sm text-[var(--color-text-faint)]">
          {t.about.version} {__APP_VERSION__}
        </p>
        <p className="mt-6 text-[var(--color-text-muted)] leading-relaxed">{t.about.credit}</p>
        <div className="mt-8 flex flex-col gap-2 text-sm">
          <Link to="/privacy" className="text-[var(--color-accent-strong)] hover:underline">
            {t.about.privacyLink}
          </Link>
          <Link to="/settings" className="text-[var(--color-accent-strong)] hover:underline">
            {t.about.backupLink}
          </Link>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `bun run test:run src/ui/pages/About.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 6: Parity + typecheck**

Run: `bun run test:run src/i18n/parity.test.ts && bun run typecheck`
Expected: PASS / no errors.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/en.ts src/i18n/ms.ts src/ui/pages/About.tsx src/ui/pages/About.test.tsx
git commit -m "feat(launch): bilingual About page with version"
```

---

## Task 4: Routes + Settings footer links

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ui/pages/Settings.tsx:255-259`
- Create: `src/ui/pages/Settings.test.tsx`

- [ ] **Step 1: Write the failing footer test**

Create `src/ui/pages/Settings.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Settings } from './Settings'

describe('Settings footer', () => {
  it('links to Privacy and About', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun run test:run src/ui/pages/Settings.test.tsx`
Expected: FAIL — no link named "Privacy"/"About" yet.

- [ ] **Step 3: Add the footer links**

In `src/ui/pages/Settings.tsx`, replace the footer block (currently lines ~255-259):

```tsx
        <p className="mt-10 text-center text-xs text-[var(--color-text-faint)]">
          <Link to="/stats" className="hover:text-[var(--color-text-muted)]">
            {t.home.stats}
          </Link>
        </p>
```

with:

```tsx
        <p className="mt-10 flex justify-center gap-4 text-center text-xs text-[var(--color-text-faint)]">
          <Link to="/stats" className="hover:text-[var(--color-text-muted)]">
            {t.home.stats}
          </Link>
          <Link to="/privacy" className="hover:text-[var(--color-text-muted)]">
            {t.privacy.title}
          </Link>
          <Link to="/about" className="hover:text-[var(--color-text-muted)]">
            {t.about.title}
          </Link>
        </p>
```

(`Link` is already imported in `Settings.tsx`.)

- [ ] **Step 4: Run the test and confirm it passes**

Run: `bun run test:run src/ui/pages/Settings.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the routes**

In `src/App.tsx`, add these imports after the existing page imports (after the `Stats` import):

```tsx
import { Privacy } from '@/ui/pages/Privacy'
import { About } from '@/ui/pages/About'
```

And add these two routes inside `<Routes>`, after the `/stats` route:

```tsx
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
```

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/ui/pages/Settings.tsx src/ui/pages/Settings.test.tsx
git commit -m "feat(launch): route Privacy/About and add Settings footer links"
```

---

## Task 5: `vercel.json` (cache headers, self-only CSP, SPA fallback)

**Files:**
- Create: `vercel.json`
- Create: `tools/vercelConfig.test.ts`

- [ ] **Step 1: Write the failing config test**

Create `tools/vercelConfig.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; headers: HeaderEntry[] }
type VercelConfig = {
  rewrites: { source: string; destination: string }[]
  headers: HeaderRule[]
}

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as VercelConfig

function headerValue(sourceMatch: (s: string) => boolean, key: string): string | undefined {
  return config.headers.find((h) => sourceMatch(h.source))?.headers.find((e) => e.key === key)?.value
}

describe('vercel.json', () => {
  it('has an SPA fallback rewrite to index.html', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })

  it('serves a self-only CSP with no eval and no remote origins', () => {
    const csp = headerValue((s) => s === '/(.*)', 'Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('http://')
    expect(csp).not.toContain('https://')
  })

  it('sends HSTS and nosniff on every response', () => {
    expect(headerValue((s) => s === '/(.*)', 'Strict-Transport-Security')).toContain('max-age=')
    expect(headerValue((s) => s === '/(.*)', 'X-Content-Type-Options')).toBe('nosniff')
  })

  it('caches hashed assets immutably and never caches index.html', () => {
    expect(headerValue((s) => s === '/assets/(.*)', 'Cache-Control')).toContain('immutable')
    expect(headerValue((s) => s.includes('index.html'), 'Cache-Control')).toBe('no-cache')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun run test:run tools/vercelConfig.test.ts`
Expected: FAIL — cannot read `../vercel.json` (ENOENT).

- [ ] **Step 3: Create `vercel.json`**

Create `vercel.json` at the repo root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"
        },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(index.html|sw.js|manifest.webmanifest)",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

Note for the implementer: do NOT add `'unsafe-eval'` or any remote origin to the CSP — the test forbids it, and the app makes zero network calls at runtime. `'unsafe-inline'` is present for `style-src` only (React inline `style` attributes); leave `script-src` strict.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `bun run test:run tools/vercelConfig.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Sanity-check the build still works with the rewrite present**

Run: `bun run build`
Expected: build completes; `dist/` is produced (the rewrite/headers are edge config and do not affect the local build).

- [ ] **Step 6: Commit**

```bash
git add vercel.json tools/vercelConfig.test.ts
git commit -m "feat(launch): vercel.json with self-only CSP, cache headers, SPA fallback"
```

---

## Task 6: `docs/USER_GUIDE.md` (non-technical)

**Files:**
- Create: `docs/USER_GUIDE.md`

- [ ] **Step 1: Write the guide**

Create `docs/USER_GUIDE.md` with this exact content:

```markdown
# Logikku — User Guide

Logikku is a Sudoku app you install on your iPad. It works completely offline and
keeps everything on your device. No account, no internet needed after the first
install.

## Install it on an iPad

1. Open **Safari** and go to the Logikku web address.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top corner.
5. Close Safari. Open **Logikku** from the Home Screen like any other app.

It now runs full-screen and works without internet.

## Play

- On the home screen, pick a puzzle type, then pick a difficulty.
- The first time you open a type, a short rules walkthrough appears. You can skip it.
- Tap a cell, then tap a number. Use **Pencil** for small notes.

## Back up your puzzles

Your progress is saved only on this iPad. To keep a copy:

1. Open **Settings** inside Logikku.
2. Tap **Save backup**. A file is downloaded.
3. Save it somewhere safe — for example **Files**, or AirDrop it to a computer.

Do this now and then, especially before updating iOS or switching iPads.

## Restore on a new iPad

1. Install Logikku on the new iPad (steps above).
2. Open **Settings → Restore from file**.
3. Pick the backup file you saved.

Your games, settings, and stats come back exactly as they were.

## A note on privacy

Logikku collects nothing and sends nothing. There are no ads and no accounts.
Everything stays on your device. See the **Privacy** page inside the app.
```

- [ ] **Step 2: Verify it renders as valid Markdown (no broken headings)**

Run: `bun run typecheck`
Expected: no errors (sanity gate; Markdown is not compiled but this confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add docs/USER_GUIDE.md
git commit -m "docs(launch): non-technical user guide (install/backup/restore)"
```

---

## Task 7: `docs/DEPLOYMENT.md` (ops runbook)

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Write the runbook**

Create `docs/DEPLOYMENT.md` with this exact content:

```markdown
# Logikku — Deployment & Launch Runbook

Audience: the maintainer. These are the human-only steps to take Logikku live.
The app code, `vercel.json`, Privacy/About pages, and version are already in the
repo. What remains needs accounts, money, and a physical iPad.

## 1. Register domains

Per `docs/NAMING.md`:

- Register `logikku.com` and `logikku.app` (≈ USD 24/yr combined). Six-letter
  `.com` names get sniped — register promptly.
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
3. Add `logikku.app`. Configure it to **redirect (301) to `logikku.com`** — set
   this in the same Domains screen ("Redirect to" option). This is a Vercel
   dashboard setting, not `vercel.json`.
4. Set `logikku.com` as the primary domain so `www` redirects to the apex.

## 4. Verify production headers

From a terminal:

```bash
curl -sI https://logikku.com | grep -i -E 'content-security-policy|strict-transport|cache-control'
```

Expected: a `content-security-policy` line containing `default-src 'self'` and
`frame-ancestors 'none'`, an HSTS line, and `cache-control` on the HTML.

Then in Safari/Chrome DevTools → **Network**, play a puzzle and confirm **zero
requests to any non-`logikku.com` origin** (the acceptance criterion).

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

## Phase 21 (later)

App Store delivery via Capacitor → iPadOS. Before any App Store filing, commission
the paid trademark clearance noted in `docs/NAMING.md`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs(launch): deployment & launch ops runbook"
```

---

## Task 8: Full regression + production build proof

**Files:** none (verification only; commit only if a gate forces a fix).

- [ ] **Step 1: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: no errors, no warnings.

- [ ] **Step 3: Full unit suite**

Run: `bun run test:run`
Expected: all tests pass, including `version`, `Privacy`, `About`, `Settings`,
`tools/vercelConfig`, and the i18n `parity` suite. (Baseline before this phase
was 499 passing; expect more now.)

- [ ] **Step 4: Production build**

Run: `bun run build`
Expected: `tsc -b` clean + `vite build` succeeds; `dist/index.html` and hashed
`dist/assets/*` are emitted, plus `sw.js` / `manifest.webmanifest` from the PWA
plugin.

- [ ] **Step 5: Local preview smoke (best-effort Lighthouse proxy)**

Run: `bun run preview`
Then load the printed URL, navigate to `/privacy` and `/about`, hard-refresh
`/settings` (confirms the SPA route resolves locally via the dev fallback), and
run Lighthouse against the preview if Chrome is available. Note: `vercel.json`
headers/CSP do NOT apply under local preview — they are verified on production
in `docs/DEPLOYMENT.md` step 4. Stop the preview server when done.

- [ ] **Step 6: Commit only if a gate required a fix**

```bash
git add -A
git commit -m "chore(launch): regression fixes"
```

(If all gates were green with nothing to change, skip this commit.)

---

## After all tasks

Use **superpowers:finishing-a-development-branch** to complete the work
(verify tests, then merge `phase-20-launch` → `main`).

Then report to the user: what shipped in-repo, and that the live launch now
depends on the human-only steps in `docs/DEPLOYMENT.md` (domains → Vercel →
iPad QA), plus a reminder to verify the Bahasa Malaysia copy in the new
`privacy`/`about` sections.
```
