// Focused edge-case verification the main audit doesn't cover:
//  - iPhone landscape (short-side < 600) must stay SINGLE column
//  - Desktop wide must be two-column, board<=640, controls<=360
//  - Selected cell shows the ring + the selection/peer/same-value ladder,
//    and the digit pad stays above the fold after selecting.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5181'
const OUT = 'C:/dev/outputs/logikku-ui-audit/edge'
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const results = []
function check(name, cond, detail) { results.push({ name, pass: !!cond, detail }); }

async function boxes(page) {
  return page.evaluate(() => {
    const g = (s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
    return { board: g('[data-testid="play-board-col"]'), controls: g('[data-testid="play-controls-col"]'), svg: g('[data-testid="board"]'), pad: g('[data-testid="input-pad"]'), vh: window.innerHeight, vw: window.innerWidth };
  });
}

// 1. iPhone landscape — single column
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play?variant=classic&difficulty=easy`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  const b = await boxes(page);
  if (b.board && b.controls) {
    check('iPhone-landscape: single column (controls below board)', b.controls.y >= b.board.y + b.board.h - 5, `board.y=${b.board.y} h=${b.board.h} controls.y=${b.controls.y}`);
    check('iPhone-landscape: board width >= 320 (not sub-pixel)', b.svg && b.svg.w >= 320, `svg.w=${b.svg?.w}`);
  } else check('iPhone-landscape: cols present', false, JSON.stringify(b));
  await page.screenshot({ path: join(OUT, 'iphone-landscape.png'), fullPage: true }).catch(() => {});
  await ctx.close();
}

// 2. Desktop wide — two column, capped
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play?variant=classic&difficulty=easy`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  const b = await boxes(page);
  if (b.board && b.controls) {
    check('Desktop: two-column (board left of controls)', b.board.x < b.controls.x, `board.x=${b.board.x} controls.x=${b.controls.x}`);
    check('Desktop: board svg <= 640', b.svg && b.svg.w <= 642, `svg.w=${b.svg?.w}`);
    check('Desktop: controls col <= 360', b.controls.w <= 362, `controls.w=${b.controls.w}`);
    check('Desktop: pad reachable (above fold)', b.pad && b.pad.bottom <= b.vh, `pad.bottom=${b.pad?.bottom} vh=${b.vh}`);
  } else check('Desktop: cols present', false, JSON.stringify(b));
  await ctx.close();
}

// 3. Selected cell ring + ladder + pad stays above fold (iPad portrait)
{
  const ctx = await browser.newContext({ viewport: { width: 810, height: 1080 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play?variant=classic&difficulty=easy`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  // click an empty cell that should exist
  await page.locator('[data-testid="cell-4-4"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(200);
  const sel = await page.evaluate(() => {
    const ring = document.querySelector('[data-testid="cell-selected-ring-4-4"]');
    const selCell = document.querySelector('[data-testid="cell-4-4"]');
    const fill = selCell?.querySelector('rect')?.getAttribute('fill');
    const pad = document.querySelector('[data-testid="input-pad"]');
    const padBottom = pad ? Math.round(pad.getBoundingClientRect().bottom) : null;
    return { hasRing: !!ring, ringStroke: ring?.getAttribute('stroke'), selFill: fill, padBottom, vh: window.innerHeight };
  });
  check('Selected cell: ring rendered', sel.hasRing, `stroke=${sel.ringStroke}`);
  check('Selected cell: selection fill token', sel.selFill === 'var(--color-selection)', `fill=${sel.selFill}`);
  check('iPad portrait: pad above fold after select', sel.padBottom !== null && sel.padBottom <= sel.vh, `padBottom=${sel.padBottom} vh=${sel.vh}`);
  await page.screenshot({ path: join(OUT, 'selected-portrait.png'), fullPage: false }).catch(() => {});
  await ctx.close();
}

await browser.close();
let pass = 0, fail = 0;
let out = '\nEDGE-CASE CHECKS\n';
for (const r of results) { out += `  ${r.pass ? '✓' : '✗'} ${r.name}  [${r.detail}]\n`; r.pass ? pass++ : fail++; }
out += `\n${pass} pass, ${fail} fail\n`;
console.log(out);
process.exit(fail ? 1 : 0);
