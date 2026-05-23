# Phase 21 — Capacitor → iPadOS App Store (Readiness)

> **Status:** Future effort. Do NOT start until the PWA is live (Phase 20 ops done)
> and validated on a real iPad. This is a reference checklist, written on Windows;
> the actual build **must** run on a Mac.

## The hard blocker, up front

Building, signing, and submitting an iPadOS app **requires macOS + Xcode**. There is
no supported way to produce or upload an `.ipa` from Windows. Everything in
"Build & submit" below happens on a Mac. The Windows machine can only do the
web-side prep (deps, `capacitor.config.ts`, web build).

## Prerequisites (acquire before starting)

| Item | Cost / note |
|---|---|
| A Mac (or macOS VM / cloud Mac e.g. MacStadium) with **Xcode** | Xcode is free from the Mac App Store; needs ~15 GB |
| **CocoaPods** on the Mac | `sudo gem install cocoapods` (Capacitor uses it for iOS native deps) |
| **Apple Developer Program** membership | **USD 99/yr** — required to submit to the App Store |
| A physical **iPad** for on-device testing | already in hand for Phase 20 QA |
| **Trademark clearance** for "Logikku" | per `docs/NAMING.md`, commission a paid MY + EU TM opinion (~RM 2–4k) **before** filing — `LOGICO` is phonetically adjacent in classes 9/41 |
| App Store assets | icon (1024×1024, no alpha), iPad screenshots, description, keywords |

## Why Capacitor (not a fresh native app)

Logikku is already a complete offline-first PWA. Capacitor wraps the existing
`dist/` build in a `WKWebView` native shell — no rewrite. IndexedDB, the service
worker, and the Zustand stores all keep working inside the wrapper, so saved games
survive. (`docs/ARCHITECTURE.md` / root CLAUDE.md already anticipate this; iCloud
KVS becomes an *optional* later enhancement, not required for v1.)

## Decisions to lock before running commands

- **App name:** `Logikku`
- **Bundle ID (App ID):** reverse-DNS, must match App Store Connect exactly and is
  permanent. Suggest **`com.logikku.app`** (we own `logikku.app`). Decide once.
- **webDir:** `dist` (Vite output — already what `bun run build` produces).
- **Orientation:** the app already supports portrait + landscape; Samurai needs
  landscape (handled in-app by `RotateDevicePrompt`). Allow both in the iOS target.
- **Device family:** iPad (and iPhone is fine too, but iPad is the design target).

## Step A — Web-side prep (doable on Windows now, optional)

These don't need a Mac. They can be committed ahead of time so the Mac just builds.

```bash
# from C:\dev\projects\Logikku, using bun (never npm)
bun add @capacitor/core
bun add -d @capacitor/cli
bun add @capacitor/ios

# initialize config (creates capacitor.config.ts); --web-dir points at Vite output
bunx cap init Logikku com.logikku.app --web-dir dist
```

Expected `capacitor.config.ts` (adjust as needed):

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.logikku.app',
  appName: 'Logikku',
  webDir: 'dist',
  // No server.url — we ship the bundled offline app, not a remote URL.
}

export default config
```

Add `/ios/` to `.gitignore` only if you prefer not to commit the native project;
the Capacitor convention is to **commit** `ios/` so the native config is tracked.
Recommendation: commit it (do the `cap add ios` on the Mac, then commit from there).

## Step B — Build & add the iOS platform (MAC ONLY)

```bash
# 1. Build the web bundle first (Capacitor requires a build before adding a platform)
bun run build

# 2. Add the native iOS project (needs Xcode + CocoaPods → macOS only)
bunx cap add ios

# 3. Copy web build + sync native deps (re-run after every web change)
bunx cap sync ios

# 4. Open in Xcode
bunx cap open ios
```

The workflow each time the web app changes: `bun run build` → `bunx cap sync ios`.

## Step C — Configure in Xcode (MAC ONLY)

- **Signing & Capabilities:** select your Apple Developer **Team**; confirm the
  bundle identifier is `com.logikku.app`.
- **Deployment target:** set a sensible minimum iPadOS (e.g. 16.4+, which is also
  where installed-PWA IndexedDB durability improved — matches our storage notes).
- **App icons & launch screen:** generate with `@capacitor/assets`
  (`bunx @capacitor/assets generate --ios`) from a 1024×1024 source, or set them
  manually in the asset catalog. Reuse the existing PWA icons/splash in `public/`.
- **Orientation:** enable Portrait + Landscape for iPad.
- **Privacy:** Logikku collects nothing, so the `Info.plist` needs no tracking or
  data-use keys. No `NSUserTrackingUsageDescription`, no analytics SDKs.

## Step D — Test on device (MAC + iPad)

- Run on the connected iPad from Xcode. Verify: launches standalone, all 23
  variants playable, airplane-mode offline works, backup/restore works, saved
  state persists across relaunch.

## Step E — Submit to the App Store (MAC ONLY)

1. In **App Store Connect**, create the app record (same bundle ID).
2. **Privacy nutrition label:** select **"Data Not Collected"** — true for Logikku.
   This is the easiest possible privacy review.
3. In Xcode: **Product → Archive**, then **Distribute App → App Store Connect**.
4. Fill metadata: description (reuse `tagline` / About copy), keywords, support URL
   (`https://logikku.com`), the Privacy page URL (`https://logikku.com/privacy`),
   iPad screenshots.
5. Submit for review. iPad-only utility/puzzle apps with no data collection
   typically clear review quickly.

## Pre-submission checklist

- [ ] PWA is live, iPad-tested, and stable (Phase 20 fully done).
- [ ] Mac + Xcode + CocoaPods ready.
- [ ] Apple Developer Program active (USD 99/yr paid).
- [ ] Trademark clearance opinion obtained (per `docs/NAMING.md`).
- [ ] Bundle ID decided and reserved in App Store Connect (`com.logikku.app`).
- [ ] `capacitor.config.ts` correct (`webDir: dist`, no remote `server.url`).
- [ ] `bun run build` → `bunx cap sync ios` → runs on a physical iPad cleanly.
- [ ] Icons, launch screen, screenshots prepared.
- [ ] Privacy label = "Data Not Collected".
- [ ] Archive uploaded and submitted.

## Notes / gotchas to revisit when you start

- Re-verify Capacitor version specifics at start time (Capacitor 7 is current as of
  2026-05); the `cap init / add ios / sync / open` flow has been stable across v5–v7.
- Keep `bun` as the package manager; the Capacitor CLI runs fine via `bunx`.
- If offline caching misbehaves inside the WKWebView, check the service-worker scope
  and that `bunx cap sync` copied the latest `dist/` (including `sw.js`).
