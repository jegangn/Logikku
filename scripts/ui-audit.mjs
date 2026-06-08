// UI audit: capture screenshots + detect layout overlaps / overflow / small touch
// targets across every screen at iPad portrait & landscape, in light & dark.
//
//   node scripts/ui-audit.mjs <baseUrl> <outDir>
//
// Exits non-zero if any hard layout problem (overlap / horizontal overflow /
// off-screen region) is found. Touch-target warnings do not fail the run.

import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5181'
const OUT = process.argv[3] ?? 'C:/dev/outputs/logikku-ui-audit/before'

// iPad gen 7 logical sizes.
const VIEWPORTS = [
  { name: 'portrait', width: 810, height: 1080 },
  { name: 'landscape', width: 1080, height: 810 },
]
const THEMES = ['light', 'dark']

// Each route + how long to settle. Board routes need extra time to pick a puzzle.
const ROUTES = [
  { id: 'home', path: '/', settle: 600 },
  { id: 'settings', path: '/settings', settle: 500 },
  { id: 'stats', path: '/stats', settle: 500 },
  { id: 'about', path: '/about', settle: 400 },
  { id: 'privacy', path: '/privacy', settle: 400 },
  { id: 'variant-classic', path: '/variant/classic', settle: 500 },
  { id: 'variant-killer', path: '/variant/killer', settle: 500 },
  { id: 'play-classic', path: '/play?variant=classic&difficulty=easy', settle: 1500 },
  { id: 'play-mini6', path: '/play?variant=mini6&difficulty=easy', settle: 1500 },
  { id: 'play-mega16', path: '/play?variant=mega16&difficulty=easy', settle: 1500 },
  { id: 'play-killer', path: '/play?variant=killer&difficulty=easy', settle: 1500 },
  { id: 'play-sandwich', path: '/play?variant=sandwich&difficulty=easy', settle: 1500 },
  { id: 'play-thermo', path: '/play?variant=thermometer&difficulty=easy', settle: 1500 },
  { id: 'play-samurai', path: '/play?variant=samurai&difficulty=easy', settle: 1500 },
]

// Regions that must never overlap each other and must stay inside the viewport.
const REGION_SELECTORS = [
  '[data-testid="toolbar"]',
  '[data-testid="board"]',
  '[data-testid="input-pad"]',
  '[data-testid="completed-banner"]',
  '[data-testid="continue-card"]',
  'main > div > h1, main h1',
]

// In-page audit. Returns { overflowX, regions, overlaps, offscreen, smallTargets }.
function pageAudit(regionSelectors) {
  const docEl = document.documentElement
  const vw = window.innerWidth
  const vh = window.innerHeight
  const overflowX = docEl.scrollWidth - docEl.clientWidth

  function rectOf(el) {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom, top: r.top, left: r.left }
  }
  function visible(el) {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
    return true
  }

  // Collect one rect per region selector (first visible match).
  const regions = []
  for (const sel of regionSelectors) {
    const el = [...document.querySelectorAll(sel)].find(visible)
    if (el) regions.push({ sel, rect: rectOf(el) })
  }

  function intersects(a, b) {
    const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    const area = ix * iy
    return area > 4 ? { ix, iy, area } : null // >4px² counts as a real overlap
  }
  // One region nested inside another (e.g. the <h1> living inside the toolbar)
  // is not a layout overlap — exclude containment with a small tolerance.
  function contains(a, b) {
    const t = 1
    return a.left - t <= b.left && a.top - t <= b.top && a.right + t >= b.right && a.bottom + t >= b.bottom
  }

  const overlaps = []
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i].rect, b = regions[j].rect
      if (contains(a, b) || contains(b, a)) continue
      const hit = intersects(a, b)
      if (hit) overlaps.push({ a: regions[i].sel, b: regions[j].sel, ...hit })
    }
  }

  const offscreen = []
  for (const reg of regions) {
    const r = reg.rect
    if (r.left < -1 || r.right > vw + 1 || r.top < -1) {
      offscreen.push({ sel: reg.sel, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), vw })
    }
  }

  // Touch-target check: interactive controls should be >= 44x44.
  const controls = [...document.querySelectorAll('button, a[href], [role="tab"], input[type="range"], select')]
  const smallTargets = []
  for (const el of controls) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 44 || r.height < 44) {
      const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('data-testid') || el.tagName).trim().slice(0, 40)
      smallTargets.push({ label, w: Math.round(r.width), h: Math.round(r.height) })
    }
  }

  // Primary controls below the fold: on a play screen the digit pad / erase must
  // be reachable without scrolling. Report how far past the viewport they sit.
  let primaryBelowFold = 0
  const pad = [...document.querySelectorAll('[data-testid="input-pad"]')].find(visible)
  if (pad) primaryBelowFold = Math.max(0, Math.round(pad.getBoundingClientRect().bottom - vh))

  return { vw, vh, overflowX, regions: regions.map((r) => r.sel), overlaps, offscreen, smallTargets, primaryBelowFold }
}

const problems = []
const summaryRows = []

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: theme,
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: true,
    })
    const page = await ctx.newPage()
    for (const route of ROUTES) {
      const tag = `${route.id}__${vp.name}__${theme}`
      try {
        await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 15000 })
      } catch {
        await page.goto(BASE + route.path, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      }
      await page.waitForTimeout(route.settle)
      const audit = await page.evaluate(pageAudit, REGION_SELECTORS)
      await page.screenshot({ path: join(OUT, tag + '.png'), fullPage: true }).catch(() => {})

      const hardIssues = []
      if (audit.overflowX > 1) hardIssues.push(`horizontal-overflow ${audit.overflowX}px`)
      if (audit.overlaps.length) hardIssues.push(...audit.overlaps.map((o) => `overlap ${o.a} ↔ ${o.b} (${Math.round(o.area)}px²)`))
      if (audit.offscreen.length) hardIssues.push(...audit.offscreen.map((o) => `offscreen ${o.sel} [${o.left}..${o.right}] vw=${o.vw}`))
      // Digit pad below the fold is a hard fail only on play screens.
      if (route.id.startsWith('play-') && audit.primaryBelowFold > 2) hardIssues.push(`input-pad below fold by ${audit.primaryBelowFold}px (must scroll to reach digits)`)

      const status = hardIssues.length ? 'FAIL' : (audit.smallTargets.length ? 'warn' : 'ok')
      summaryRows.push({ tag, status, hardIssues, smallTargets: audit.smallTargets, regions: audit.regions })
      if (hardIssues.length) problems.push({ tag, hardIssues })
    }
    await ctx.close()
  }
}
await browser.close()

await writeFile(join(OUT, '_report.json'), JSON.stringify(summaryRows, null, 2))

// Console report
let out = `\nUI AUDIT — ${BASE}\nscreens=${ROUTES.length} viewports=${VIEWPORTS.length} themes=${THEMES.length} → ${summaryRows.length} captures\n`
const fails = summaryRows.filter((r) => r.status === 'FAIL')
const warns = summaryRows.filter((r) => r.status === 'warn')
out += `\nOK:   ${summaryRows.filter((r) => r.status === 'ok').length}`
out += `\nWARN: ${warns.length}`
out += `\nFAIL: ${fails.length}\n`
if (fails.length) {
  out += `\n--- HARD LAYOUT PROBLEMS ---\n`
  for (const f of fails) out += `  ✗ ${f.tag}\n` + f.hardIssues.map((i) => `      ${i}`).join('\n') + '\n'
}
// De-dup small-target warnings by label
const tgt = new Map()
for (const r of warns) for (const s of r.smallTargets) {
  const k = `${s.label} ${s.w}x${s.h}`
  tgt.set(k, (tgt.get(k) || 0) + 1)
}
if (tgt.size) {
  out += `\n--- TOUCH TARGETS < 44px (distinct) ---\n`
  for (const [k, n] of [...tgt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) out += `  ⚠ ${k}  ×${n}\n`
}
out += `\nScreenshots + _report.json → ${OUT}\n`
console.log(out)

process.exit(problems.length ? 1 : 0)
