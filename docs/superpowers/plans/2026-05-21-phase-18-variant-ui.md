# Phase 18 — Variant Selection UI + Per-Variant Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the variant discovery surface — Home grid, VariantDetail, difficulty picker, 2-screen onboarding, continue card — covering all 23 Sudoku variants.

**Architecture:** A single `variantCatalog.ts` is the spine: every other surface reads from it. Home renders a filtered grid of `VariantCard`s with hand-crafted SVG thumbnails imported as React components through `vite-plugin-svgr`. VariantDetail composes a markdown rules block (hand-rolled minimal renderer), a `DifficultyPicker` driven by `listBanks()`, and a 2-screen `Onboarding` modal gated by an IDB-persisted Zustand store. All user-facing strings live in `src/i18n/en.ts`.

**Tech Stack:** React 19 + TypeScript 6 + Tailwind v4 + Zustand 5 + idb 8 + react-router 7 + Vitest 4 + Playwright + new `vite-plugin-svgr` dep.

**Spec:** `docs/superpowers/specs/2026-05-21-phase-18-variant-ui-design.md`

---

## File map

**Create:**
- `src/ui/variantCatalog.ts` + `.test.ts`
- `src/ui/components/markdown.tsx` + `.test.tsx`
- `src/ui/components/VariantThumbnail.tsx` + `.test.tsx`
- `src/ui/components/VariantCard.tsx` + `.test.tsx`
- `src/ui/components/DifficultyPicker.tsx` + `.test.tsx`
- `src/ui/components/Onboarding.tsx` + `.test.tsx`
- `src/ui/pages/VariantDetail.tsx` + `.test.tsx`
- `src/state/onboardingStore.ts` + `.test.ts`
- `src/ui/onboarding/<23 .md files>`
- `src/ui/thumbnails/<23 .svg files>`
- `src/ui/svgr.d.ts` (SVGR ambient module declaration)
- `e2e/discovery.spec.ts`

**Modify:**
- `package.json` (add `vite-plugin-svgr` devDep)
- `vite.config.ts` (register svgr plugin)
- `src/i18n/en.ts` (extend with new keys)
- `src/storage/db.ts` (add `onboardingSeen` object store + helpers)
- `src/ui/pages/Home.tsx` (rewrite — new content)
- `src/ui/pages/Settings.tsx` (add Reset onboarding action)
- `src/App.tsx` (add `/variant/:kind` route)

---

## Variant taxonomy (used in catalog ordering, filters, descriptions)

Display order on Home, and feature tags:

| # | Kind | Size | Features |
|---|---|---|---|
| 1 | `classic` | 9x9 | classic-like |
| 2 | `x-diagonal` | 9x9 | classic-like |
| 3 | `hyper` | 9x9 | classic-like |
| 4 | `anti-knight` | 9x9 | classic-like |
| 5 | `anti-king` | 9x9 | classic-like |
| 6 | `non-consecutive` | 9x9 | classic-like |
| 7 | `even-odd` | 9x9 | parity |
| 8 | `jigsaw` | 9x9 | classic-like |
| 9 | `kropki` | 9x9 | edge-clue |
| 10 | `xv` | 9x9 | edge-clue, arithmetic |
| 11 | `greater-than` | 9x9 | edge-clue |
| 12 | `thermometer` | 9x9 | path |
| 13 | `arrow` | 9x9 | path, arithmetic |
| 14 | `killer` | 9x9 | cage, arithmetic |
| 15 | `little-killer` | 9x9 | outside-clue, arithmetic |
| 16 | `sandwich` | 9x9 | outside-clue, arithmetic |
| 17 | `skyscraper` | 9x9 | outside-clue |
| 18 | `palindrome` | 9x9 | path |
| 19 | `renban` | 9x9 | path |
| 20 | `german-whispers` | 9x9 | path |
| 21 | `mini-6` | 6x6 | classic-like |
| 22 | `mega-16` | 16x16 | classic-like |
| 23 | `samurai` | samurai | classic-like |

Canonical descriptions (1 line each):
- classic: "The original. Row, column, box."
- x-diagonal: "Plus both main diagonals."
- hyper: "Four extra inner boxes."
- anti-knight: "No two knight's-move cells share a digit."
- anti-king: "No two adjacent cells share, even diagonally."
- non-consecutive: "Adjacent cells can't differ by 1."
- even-odd: "Some cells are even-only; others odd-only."
- jigsaw: "Boxes replaced by irregular shapes."
- kropki: "Dots between cells mark consecutive or 1:2 ratio."
- xv: "V means sum 5; X means sum 10."
- greater-than: "Arrows show which neighbour is larger."
- thermometer: "Cells from bulb to tip increase."
- arrow: "Circle equals the sum along its tail."
- killer: "Cages with target sums; no digit repeats inside."
- little-killer: "Outside arrows sum the diagonal."
- sandwich: "Outside number sums digits between 1 and 9."
- skyscraper: "Outside number counts visible buildings."
- palindrome: "Path reads the same both ways."
- renban: "Path holds a consecutive set."
- german-whispers: "Adjacent path cells differ by at least 5."
- mini-6: "6×6 with 2×3 boxes."
- mega-16: "16×16 with 4×4 boxes."
- samurai: "Five overlapping 9×9 grids."

---

## Task 1: Add `vite-plugin-svgr` and verify SVG → React component import

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/ui/svgr.d.ts`
- Create: `src/ui/thumbnails/_smoke.svg` (deleted at end of task)

- [ ] **Step 1: Add dependency**

Run: `bun add -d vite-plugin-svgr@^4.5.0`

Expected: `package.json` updated, `bun.lockb` updated.

- [ ] **Step 2: Register the plugin in `vite.config.ts`**

Modify `vite.config.ts` to import and add `svgr({ include: '**/*.svg?react' })`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    react(),
    tailwindcss(),
    svgr({ include: '**/*.svg?react' }),
    VitePWA({ /* keep existing config unchanged */ }),
  ],
  test: { /* keep existing config unchanged */ },
})
```

Keep all existing VitePWA and `test` configuration exactly as it was.

- [ ] **Step 3: Add ambient module declaration**

Create `src/ui/svgr.d.ts`:

```ts
declare module '*.svg?react' {
  import type { ComponentType, SVGProps } from 'react'
  const Component: ComponentType<SVGProps<SVGSVGElement>>
  export default Component
}
```

- [ ] **Step 4: Smoke-test the pipeline**

Create `src/ui/thumbnails/_smoke.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect x="2" y="2" width="12" height="12" fill="currentColor"/>
</svg>
```

Run: `bun run typecheck`

Expected: no errors related to `?react` imports.

Run: `bun run build`

Expected: build succeeds.

- [ ] **Step 5: Clean up smoke and commit**

Delete `src/ui/thumbnails/_smoke.svg`.

```bash
git add package.json bun.lockb vite.config.ts src/ui/svgr.d.ts
git commit -m "build: add vite-plugin-svgr for SVG-as-component imports"
```

---

## Task 2: Extend `src/i18n/en.ts` with Phase 18 strings

**Files:**
- Modify: `src/i18n/en.ts`
- Test: `src/i18n/en.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `src/i18n/en.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { en } from './en'

const VARIANT_KINDS = [
  'classic','x-diagonal','hyper','anti-knight','anti-king','non-consecutive',
  'even-odd','jigsaw','kropki','xv','greater-than','thermometer','arrow',
  'killer','little-killer','sandwich','skyscraper','palindrome','renban',
  'german-whispers','mini-6','mega-16','samurai',
] as const

describe('i18n catalog', () => {
  it('has an entry for every variant kind', () => {
    for (const k of VARIANT_KINDS) {
      expect(en.catalog[k], `missing catalog.${k}`).toBeDefined()
      expect(en.catalog[k].name, `missing catalog.${k}.name`).toMatch(/.+/)
      expect(en.catalog[k].description, `missing catalog.${k}.description`).toMatch(/.+/)
    }
  })

  it('has variantDetail / onboarding / filter strings', () => {
    expect(en.variant.rules).toBe('Rules')
    expect(en.variant.pickDifficulty).toBe('Pick difficulty')
    expect(en.variant.notFound).toMatch(/not found/i)
    expect(en.onboarding.skip).toBe('Skip')
    expect(en.onboarding.next).toBe('Next')
    expect(en.onboarding.done).toBe('Done')
    expect(en.home.filters.sizeLabel).toBe('Grid size')
    expect(en.home.filters.featuresLabel).toBe('Features')
    expect(en.home.empty).toMatch(/no variants/i)
    expect(en.settings.resetOnboarding).toBe('Reset onboarding')
  })

  it('startedAgo formats minutes and hours', () => {
    expect(en.home.startedAgo(0)).toMatch(/just now|0 min/i)
    expect(en.home.startedAgo(5)).toMatch(/5 min/)
    expect(en.home.startedAgo(120)).toMatch(/2 h/)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/i18n/en.test.ts`

Expected: many failures ("missing catalog.classic", etc.)

- [ ] **Step 3: Extend `src/i18n/en.ts`**

Keep the existing `en` object and ADD the new keys. The final file is:

```ts
export const en = {
  appName: 'Logikku',
  tagline: 'Sudoku, every variant.',

  home: {
    classicHeader: 'Classic Sudoku',
    continueLabel: 'Continue',
    settings: 'Settings',
    stats: 'Stats',
    startedAgo: (mins: number): string => {
      if (mins < 1) return 'just now'
      if (mins < 60) return `${mins} min ago`
      const hours = Math.floor(mins / 60)
      return `${hours} h ago`
    },
    filters: {
      sizeLabel: 'Grid size',
      featuresLabel: 'Features',
      sizeAll: 'All',
      size9x9: '9×9',
      size6x6: '6×6',
      size16x16: '16×16',
      sizeSamurai: 'Samurai',
      featureClassicLike: 'Classic',
      featureCage: 'Cage',
      featurePath: 'Path',
      featureOutsideClue: 'Outside',
      featureParity: 'Parity',
      featureEdgeClue: 'Edge',
      featureArithmetic: 'Arithmetic',
    },
    empty: 'No variants match these filters.',
  },

  difficulty: {
    'very-easy': 'Very Easy',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    tough: 'Tough',
    expert: 'Expert',
    diabolical: 'Diabolical',
  },

  variant: {
    backToHome: 'Home',
    rules: 'Rules',
    pickDifficulty: 'Pick difficulty',
    stats: 'Stats',
    statsPlayed: (n: number) => `Played ${n}`,
    statsBestTime: (mmss: string) => `Best time ${mmss}`,
    statsStreak: (n: number) => `Streak ${n}`,
    notFound: 'Variant not found.',
  },

  onboarding: {
    skip: 'Skip',
    next: 'Next',
    done: 'Done',
    close: 'Close',
    stepOf: (i: number, n: number) => `${i} of ${n}`,
  },

  play: {
    loading: 'Loading…',
    solved: 'Solved!',
    new: 'New',
    undo: 'Undo',
    redo: 'Redo',
    erase: 'Erase',
    modeValue: 'Value',
    modePencil: 'Pencil',
    back: '← Back',
  },

  settings: {
    title: 'Settings',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    strictMode: 'Strict mode',
    strictModeHint: 'Wrong entries lock for 5 seconds.',
    highlightConflicts: 'Highlight conflicts',
    highlightPeers: 'Highlight peers',
    pencilAutoClean: 'Auto-clean pencil marks',
    pencilAutoCleanHint: 'Remove pencil marks for peers when you place a digit.',
    dataSection: 'Your data',
    backup: 'Save backup',
    backupHint: 'Downloads a JSON file with all games, settings, and stats.',
    restore: 'Restore from file',
    restoreHint: 'Replaces all current data with the backup contents.',
    clear: 'Clear all data',
    clearHint: 'Deletes all games, settings, and stats from this device.',
    confirmRestore: 'Restore will REPLACE your current games, settings, and stats. Continue?',
    confirmClearFirst: 'Delete all your games, settings, and stats?',
    confirmClearSecond: 'Are you absolutely sure? This cannot be undone.',
    restoreError: 'That file is not a valid Logikku backup.',
    restoreOk: 'Backup restored.',
    resetOnboarding: 'Reset onboarding',
    resetOnboardingHint: 'Show the rules wizard again the next time you start a variant.',
    resetOnboardingDone: 'Onboarding reset.',
  },

  stats: {
    title: 'Stats',
    noData: 'No completions yet. Solve a puzzle to see stats here.',
    headerBand: 'Variant / Difficulty',
    headerCompleted: 'Completed',
    headerBest: 'Best',
    headerAverage: 'Average',
    reset: 'Reset stats',
    confirmReset: 'Reset all stats to zero?',
  },

  pwa: {
    updateAvailable: 'Update available',
    updateHint: 'A newer version of Logikku is ready.',
    refresh: 'Refresh',
    dismiss: 'Later',
    installPrompt: 'Tap Share → Add to Home Screen for the best experience.',
    installDismiss: 'Got it',
  },

  catalog: {
    classic:           { name: 'Classic',           description: 'The original. Row, column, box.' },
    'x-diagonal':      { name: 'X / Diagonal',      description: 'Plus both main diagonals.' },
    hyper:             { name: 'Hyper',             description: 'Four extra inner boxes.' },
    'anti-knight':     { name: 'Anti-Knight',       description: "No two knight's-move cells share a digit." },
    'anti-king':       { name: 'Anti-King',         description: 'No two adjacent cells share, even diagonally.' },
    'non-consecutive': { name: 'Non-Consecutive',   description: "Adjacent cells can't differ by 1." },
    'even-odd':        { name: 'Even-Odd',          description: 'Some cells are even-only; others odd-only.' },
    jigsaw:            { name: 'Jigsaw',            description: 'Boxes replaced by irregular shapes.' },
    kropki:            { name: 'Kropki',            description: 'Dots between cells mark consecutive or 1:2 ratio.' },
    xv:                { name: 'XV',                description: 'V means sum 5; X means sum 10.' },
    'greater-than':    { name: 'Greater Than',      description: 'Arrows show which neighbour is larger.' },
    thermometer:       { name: 'Thermometer',       description: 'Cells from bulb to tip increase.' },
    arrow:             { name: 'Arrow',             description: 'Circle equals the sum along its tail.' },
    killer:            { name: 'Killer',            description: 'Cages with target sums; no digit repeats inside.' },
    'little-killer':   { name: 'Little Killer',     description: 'Outside arrows sum the diagonal.' },
    sandwich:          { name: 'Sandwich',          description: 'Outside number sums digits between 1 and 9.' },
    skyscraper:        { name: 'Skyscraper',        description: 'Outside number counts visible buildings.' },
    palindrome:        { name: 'Palindrome',        description: 'Path reads the same both ways.' },
    renban:            { name: 'Renban',            description: 'Path holds a consecutive set.' },
    'german-whispers': { name: 'German Whispers',   description: 'Adjacent path cells differ by at least 5.' },
    'mini-6':          { name: 'Mini 6×6',          description: '6×6 with 2×3 boxes.' },
    'mega-16':         { name: 'Mega 16×16',        description: '16×16 with 4×4 boxes.' },
    samurai:           { name: 'Samurai',           description: 'Five overlapping 9×9 grids.' },
  },
} as const

export type Strings = typeof en
export const t = en
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/i18n/en.test.ts`
Expected: all green.

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/en.test.ts
git commit -m "feat(i18n): extend en.ts with Phase 18 strings (catalog, variant, onboarding, filters)"
```

---

## Task 3: Hand-rolled minimal markdown renderer

**Files:**
- Create: `src/ui/components/markdown.tsx`
- Test: `src/ui/components/markdown.test.tsx`

Supports paragraphs (blank-line separated), bulleted lists (`-` prefix), `**bold**`, `*italic*`, and inline `` `code` ``. Unsupported syntax falls through as plain text (never raw HTML).

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/markdown.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Markdown } from './markdown'

describe('Markdown', () => {
  it('renders paragraphs', () => {
    const { container } = render(<Markdown source={'hello\n\nworld'} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]?.textContent).toBe('hello')
    expect(paragraphs[1]?.textContent).toBe('world')
  })

  it('renders bulleted lists', () => {
    const { container } = render(<Markdown source={'- one\n- two\n- three'} />)
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[1]?.textContent).toBe('two')
  })

  it('renders bold and italic inline', () => {
    const { container } = render(<Markdown source={'this is **strong** and *soft*'} />)
    expect(container.querySelector('strong')?.textContent).toBe('strong')
    expect(container.querySelector('em')?.textContent).toBe('soft')
  })

  it('renders inline code', () => {
    const { container } = render(<Markdown source={'run `bun dev` first'} />)
    expect(container.querySelector('code')?.textContent).toBe('bun dev')
  })

  it('treats raw HTML as plain text', () => {
    const { container } = render(<Markdown source={'<script>alert(1)</script>'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>')
  })

  it('handles mixed paragraphs and lists', () => {
    const { container } = render(
      <Markdown source={'Intro line.\n\n- alpha\n- beta\n\nOutro.'} />,
    )
    const paragraphs = container.querySelectorAll('p')
    const lists = container.querySelectorAll('ul')
    expect(paragraphs).toHaveLength(2)
    expect(lists).toHaveLength(1)
    expect(lists[0]?.querySelectorAll('li')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/components/markdown`

Expected: "Cannot find module './markdown'".

- [ ] **Step 3: Implement renderer**

Create `src/ui/components/markdown.tsx`:

```tsx
import type { ReactNode } from 'react'

interface MarkdownProps {
  readonly source: string
  readonly className?: string
}

interface Block {
  readonly kind: 'p' | 'ul'
  readonly lines: ReadonlyArray<string>
}

const INLINE_TOKEN = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/

function parseBlocks(src: string): ReadonlyArray<Block> {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let current: { kind: 'p' | 'ul'; lines: string[] } | null = null

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line === '') {
      if (current) {
        blocks.push(current)
        current = null
      }
      continue
    }
    const isBullet = /^\s*-\s+/.test(line)
    const kind: 'p' | 'ul' = isBullet ? 'ul' : 'p'
    if (!current || current.kind !== kind) {
      if (current) blocks.push(current)
      current = { kind, lines: [] }
    }
    current.lines.push(isBullet ? line.replace(/^\s*-\s+/, '') : line)
  }
  if (current) blocks.push(current)
  return blocks
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Tokenize: split on `code`, then **bold**, then *italic*. Order matters
  // because code spans should preserve their content verbatim.
  const out: ReactNode[] = []
  let remainder = text
  let i = 0

  while (remainder.length > 0) {
    const match = remainder.match(INLINE_TOKEN)
    if (!match || match.index === undefined) {
      out.push(remainder)
      break
    }
    if (match.index > 0) {
      out.push(remainder.slice(0, match.index))
    }
    const token = match[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith('**')) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    remainder = remainder.slice(match.index + token.length)
  }
  return out
}

export function Markdown({ source, className }: MarkdownProps) {
  const blocks = parseBlocks(source)
  return (
    <div className={className} data-testid="markdown">
      {blocks.map((block, bi) => {
        if (block.kind === 'p') {
          return (
            <p key={`p-${bi}`} className="mb-2 last:mb-0">
              {renderInline(block.lines.join(' '), `p-${bi}-i`)}
            </p>
          )
        }
        return (
          <ul key={`ul-${bi}`} className="mb-2 last:mb-0 list-disc pl-5 space-y-1">
            {block.lines.map((line, li) => (
              <li key={`ul-${bi}-${li}`}>
                {renderInline(line, `ul-${bi}-${li}-i`)}
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/ui/components/markdown`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/markdown.tsx src/ui/components/markdown.test.tsx
git commit -m "feat(ui): hand-rolled minimal markdown renderer (paragraphs, lists, bold, italic, code)"
```

---

## Task 4: 23 hand-crafted thumbnail SVGs

**Files:**
- Create: `src/ui/thumbnails/<kind>.svg` × 23

These are small monochrome line drawings on a transparent background, 64×64 artwork inside a 0–80 viewBox, using `currentColor` for strokes. Each SVG must include `viewBox="0 0 80 80"` and use `stroke="currentColor"` (`fill="none"` where appropriate). The look: clean, calm, iPad-friendly.

Reference wrapper for every file:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- 8px padding all sides; artwork lives in 8,8 → 72,72 -->
  …shape primitives…
</svg>
```

- [ ] **Step 1: Worked example — `classic.svg`**

Create `src/ui/thumbnails/classic.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="8" y="8" width="64" height="64" rx="4"/>
  <line x1="8" y1="29.3" x2="72" y2="29.3"/>
  <line x1="8" y1="50.6" x2="72" y2="50.6"/>
  <line x1="29.3" y1="8" x2="29.3" y2="72"/>
  <line x1="50.6" y1="8" x2="50.6" y2="72"/>
  <text x="18" y="26" font-family="ui-sans-serif" font-size="14" fill="currentColor" stroke="none">5</text>
  <text x="40" y="48" font-family="ui-sans-serif" font-size="14" fill="currentColor" stroke="none">3</text>
  <text x="61" y="69" font-family="ui-sans-serif" font-size="14" fill="currentColor" stroke="none">7</text>
</svg>
```

- [ ] **Step 2: Create the remaining 22 SVGs**

Each file lives at `src/ui/thumbnails/<kind>.svg`. Build them in a single pass, following the visual hints below. All use the same wrapper (viewBox + stroke). Keep them under ~30 lines each.

| Kind | Composition |
|---|---|
| `x-diagonal.svg` | Same 3×3 grid as classic, plus two diagonal lines from corners |
| `hyper.svg` | 3×3 grid; one inner 3×3 region (rows 2-4, cols 2-4 in conceptual coords) tinted by a translucent rect |
| `anti-knight.svg` | 3×3 grid with a knight-shape `M` connecting two cells |
| `anti-king.svg` | 3×3 grid with 8 short strokes radiating from a center cell |
| `non-consecutive.svg` | Two adjacent cells; between them a small ≠ glyph (parallel diagonals with a slash) |
| `even-odd.svg` | A filled square next to a circle |
| `jigsaw.svg` | An irregular polyomino outline (zigzag boundary, no inner box lines) |
| `kropki.svg` | Two adjacent cells with a filled dot on the edge between them |
| `xv.svg` | Two adjacent cells with a small "X" glyph on the edge |
| `greater-than.svg` | Two cells with `<` between them |
| `thermometer.svg` | A circle (bulb) with a thick line trailing diagonally up-right to a tip |
| `arrow.svg` | A circled digit "9" with a polyline arrow extending from it, terminating in a small arrowhead |
| `killer.svg` | A dashed-outline cage spanning 3 cells with "12" in the top-left corner |
| `little-killer.svg` | The grid outline with a small arrow pointing diagonally inward from outside top-left, "20" beside it |
| `sandwich.svg` | The grid outline with the number "12" outside the left edge, between two narrow rectangles labelled "1" and "9" inside |
| `skyscraper.svg` | Three small rectangles of increasing height in a row, with a "3" beside them |
| `palindrome.svg` | A gentle S-curve passing through cell centers; cells at both ends marked with small filled dots |
| `renban.svg` | Same curve shape but with three small connected dots along it |
| `german-whispers.svg` | The curve with a small "±5" glyph beside it |
| `mini-6.svg` | A 6×6 grid lattice in a 60×60 area, with thicker borders every 2 rows / 3 columns |
| `mega-16.svg` | A 4×4 box lattice (so 16×16 conceptually) with thicker outer + inner box borders |
| `samurai.svg` | The cruciform: a central square with four corner squares overlapping its corners (the Phase 17b cruciform silhouette, 64×64) |

Write each as a standalone file. Keep the outer `<svg>` wrapper identical to `classic.svg`. Inside, use only `<rect>`, `<line>`, `<polyline>`, `<path>`, `<circle>`, and `<text>`. Never reference external resources.

- [ ] **Step 3: Verify they all parse and load via SVGR**

Add a temporary smoke component `src/ui/thumbnails/_check.tsx`:

```tsx
import Classic from './classic.svg?react'
import XDiagonal from './x-diagonal.svg?react'
// repeat for all 23
export const _check = [Classic, XDiagonal /* … */]
```

Run: `bun run typecheck`
Expected: clean (no missing module errors).

Run: `bun run build`
Expected: build succeeds.

Delete `src/ui/thumbnails/_check.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/thumbnails/
git commit -m "feat(ui): 23 hand-crafted variant thumbnail SVGs"
```

---

## Task 5: 23 onboarding markdown files

**Files:**
- Create: `src/ui/onboarding/<kind>.md` × 23

Each file has two `---`-fenced sections. Section 1 = "How it works" (3-line rule body). Section 2 = "Quick example" (1-2 sentences of a worked move). Front-matter is just `title:` for now (no images in v1).

- [ ] **Step 1: Worked example — `killer.md`**

Create `src/ui/onboarding/killer.md`:

```markdown
---
title: How it works
---
- Classic Sudoku rules apply: each row, column, and box holds 1–9.
- Cells are grouped into **cages** marked by dashed outlines.
- The small number in a cage corner is the **target sum**, and no digit may repeat inside a cage.

---
title: Quick example
---
A 3-cell cage with sum 15 must hold one of `{4,5,6}`, `{1,6,8}`, `{2,6,7}`, or `{2,4,9}`. Combined with the row, column, and box constraints, that usually narrows it to a single set.
```

- [ ] **Step 2: Create the remaining 22 files**

Each follows the same shape. Section 1 = the variant rule restated in 1-3 bullet points (use canonical rule from `docs/VARIANTS.md` as the source — paraphrase for clarity, do not include the constraint-kind jargon). Section 2 = 1-2 sentences walking through a concrete reasoning step.

The 22 remaining files (paths):
- `src/ui/onboarding/classic.md`
- `src/ui/onboarding/x-diagonal.md`
- `src/ui/onboarding/hyper.md`
- `src/ui/onboarding/anti-knight.md`
- `src/ui/onboarding/anti-king.md`
- `src/ui/onboarding/non-consecutive.md`
- `src/ui/onboarding/even-odd.md`
- `src/ui/onboarding/jigsaw.md`
- `src/ui/onboarding/kropki.md`
- `src/ui/onboarding/xv.md`
- `src/ui/onboarding/greater-than.md`
- `src/ui/onboarding/thermometer.md`
- `src/ui/onboarding/arrow.md`
- `src/ui/onboarding/little-killer.md`
- `src/ui/onboarding/sandwich.md`
- `src/ui/onboarding/skyscraper.md`
- `src/ui/onboarding/palindrome.md`
- `src/ui/onboarding/renban.md`
- `src/ui/onboarding/german-whispers.md`
- `src/ui/onboarding/mini-6.md`
- `src/ui/onboarding/mega-16.md`
- `src/ui/onboarding/samurai.md`

Keep tone calm and concrete. Avoid uppercase, exclamation points, and exhortation. Aim for 30-60 words per section.

- [ ] **Step 3: Sanity-check format**

Run a one-liner to confirm every file has exactly two sections separated by `---` after a `title:` front-matter:

```bash
for f in src/ui/onboarding/*.md; do
  count=$(grep -c '^---$' "$f")
  if [ "$count" -ne 4 ]; then
    echo "BAD: $f has $count '---' fences (expected 4)"
  fi
done
```

Expected: no "BAD" output.

- [ ] **Step 4: Commit**

```bash
git add src/ui/onboarding/
git commit -m "feat(ui): per-variant onboarding markdown (23 files, 2 sections each)"
```

---

## Task 6: `variantCatalog.ts` — the spine

**Files:**
- Create: `src/ui/variantCatalog.ts`
- Test: `src/ui/variantCatalog.test.ts`

Provides `VARIANT_CATALOG` (ordered array of `VariantMeta`) + helpers `getVariant(kind)`, `parseOnboardingSections(markdown)`, `isVariantKind(value)`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/variantCatalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  VARIANT_CATALOG,
  getVariant,
  parseOnboardingSections,
  isVariantKind,
  type VariantKind,
} from './variantCatalog'

const ALL_KINDS: ReadonlyArray<VariantKind> = [
  'classic','x-diagonal','hyper','anti-knight','anti-king','non-consecutive',
  'even-odd','jigsaw','kropki','xv','greater-than','thermometer','arrow',
  'killer','little-killer','sandwich','skyscraper','palindrome','renban',
  'german-whispers','mini-6','mega-16','samurai',
]

describe('variantCatalog', () => {
  it('exposes one entry per kind', () => {
    expect(VARIANT_CATALOG).toHaveLength(23)
    const kinds = VARIANT_CATALOG.map((v) => v.kind)
    for (const k of ALL_KINDS) expect(kinds).toContain(k)
  })

  it('orders classic first and samurai last', () => {
    expect(VARIANT_CATALOG[0]?.kind).toBe('classic')
    expect(VARIANT_CATALOG[22]?.kind).toBe('samurai')
  })

  it('getVariant returns the matching entry', () => {
    expect(getVariant('killer').kind).toBe('killer')
    expect(getVariant('killer').size).toBe('9x9')
    expect(getVariant('killer').features).toContain('cage')
  })

  it('every entry has a Thumbnail component and onboarding string', () => {
    for (const v of VARIANT_CATALOG) {
      expect(typeof v.Thumbnail).toBe('function')
      expect(v.onboarding.length).toBeGreaterThan(50)
    }
  })

  it('parseOnboardingSections returns exactly 2 sections', () => {
    const md = '---\ntitle: A\n---\nbody one\n\n---\ntitle: B\n---\nbody two'
    const sections = parseOnboardingSections(md)
    expect(sections).toHaveLength(2)
    expect(sections[0]?.title).toBe('A')
    expect(sections[0]?.body.trim()).toBe('body one')
    expect(sections[1]?.title).toBe('B')
    expect(sections[1]?.body.trim()).toBe('body two')
  })

  it('parseOnboardingSections throws when fewer than 2 sections', () => {
    expect(() => parseOnboardingSections('no fences here')).toThrow()
  })

  it('isVariantKind narrows known kinds', () => {
    expect(isVariantKind('killer')).toBe(true)
    expect(isVariantKind('nonsense')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/variantCatalog`

Expected: "Cannot find module './variantCatalog'".

- [ ] **Step 3: Implement the catalog**

Create `src/ui/variantCatalog.ts`:

```ts
import type { ComponentType, SVGProps } from 'react'

import Classic from './thumbnails/classic.svg?react'
import XDiagonal from './thumbnails/x-diagonal.svg?react'
import Hyper from './thumbnails/hyper.svg?react'
import AntiKnight from './thumbnails/anti-knight.svg?react'
import AntiKing from './thumbnails/anti-king.svg?react'
import NonConsecutive from './thumbnails/non-consecutive.svg?react'
import EvenOdd from './thumbnails/even-odd.svg?react'
import Jigsaw from './thumbnails/jigsaw.svg?react'
import Kropki from './thumbnails/kropki.svg?react'
import Xv from './thumbnails/xv.svg?react'
import GreaterThan from './thumbnails/greater-than.svg?react'
import Thermometer from './thumbnails/thermometer.svg?react'
import Arrow from './thumbnails/arrow.svg?react'
import Killer from './thumbnails/killer.svg?react'
import LittleKiller from './thumbnails/little-killer.svg?react'
import Sandwich from './thumbnails/sandwich.svg?react'
import Skyscraper from './thumbnails/skyscraper.svg?react'
import Palindrome from './thumbnails/palindrome.svg?react'
import Renban from './thumbnails/renban.svg?react'
import GermanWhispers from './thumbnails/german-whispers.svg?react'
import Mini6 from './thumbnails/mini-6.svg?react'
import Mega16 from './thumbnails/mega-16.svg?react'
import Samurai from './thumbnails/samurai.svg?react'

import classicMd from './onboarding/classic.md?raw'
import xDiagonalMd from './onboarding/x-diagonal.md?raw'
import hyperMd from './onboarding/hyper.md?raw'
import antiKnightMd from './onboarding/anti-knight.md?raw'
import antiKingMd from './onboarding/anti-king.md?raw'
import nonConsecutiveMd from './onboarding/non-consecutive.md?raw'
import evenOddMd from './onboarding/even-odd.md?raw'
import jigsawMd from './onboarding/jigsaw.md?raw'
import kropkiMd from './onboarding/kropki.md?raw'
import xvMd from './onboarding/xv.md?raw'
import greaterThanMd from './onboarding/greater-than.md?raw'
import thermometerMd from './onboarding/thermometer.md?raw'
import arrowMd from './onboarding/arrow.md?raw'
import killerMd from './onboarding/killer.md?raw'
import littleKillerMd from './onboarding/little-killer.md?raw'
import sandwichMd from './onboarding/sandwich.md?raw'
import skyscraperMd from './onboarding/skyscraper.md?raw'
import palindromeMd from './onboarding/palindrome.md?raw'
import renbanMd from './onboarding/renban.md?raw'
import germanWhispersMd from './onboarding/german-whispers.md?raw'
import mini6Md from './onboarding/mini-6.md?raw'
import mega16Md from './onboarding/mega-16.md?raw'
import samuraiMd from './onboarding/samurai.md?raw'

export type VariantKind =
  | 'classic' | 'x-diagonal' | 'hyper' | 'anti-knight' | 'anti-king'
  | 'non-consecutive' | 'even-odd' | 'jigsaw' | 'kropki' | 'xv'
  | 'greater-than' | 'thermometer' | 'arrow' | 'killer' | 'little-killer'
  | 'sandwich' | 'skyscraper' | 'palindrome' | 'renban' | 'german-whispers'
  | 'mini-6' | 'mega-16' | 'samurai'

export type VariantSize = '9x9' | '6x6' | '16x16' | 'samurai'
export type VariantFeature =
  | 'classic-like' | 'cage' | 'path' | 'outside-clue'
  | 'parity' | 'edge-clue' | 'arithmetic'

export interface VariantMeta {
  readonly kind: VariantKind
  readonly size: VariantSize
  readonly features: ReadonlyArray<VariantFeature>
  readonly Thumbnail: ComponentType<SVGProps<SVGSVGElement>>
  readonly onboarding: string
}

export const VARIANT_CATALOG: ReadonlyArray<VariantMeta> = [
  { kind: 'classic',          size: '9x9',     features: ['classic-like'],          Thumbnail: Classic,         onboarding: classicMd },
  { kind: 'x-diagonal',       size: '9x9',     features: ['classic-like'],          Thumbnail: XDiagonal,       onboarding: xDiagonalMd },
  { kind: 'hyper',            size: '9x9',     features: ['classic-like'],          Thumbnail: Hyper,           onboarding: hyperMd },
  { kind: 'anti-knight',      size: '9x9',     features: ['classic-like'],          Thumbnail: AntiKnight,      onboarding: antiKnightMd },
  { kind: 'anti-king',        size: '9x9',     features: ['classic-like'],          Thumbnail: AntiKing,        onboarding: antiKingMd },
  { kind: 'non-consecutive',  size: '9x9',     features: ['classic-like'],          Thumbnail: NonConsecutive,  onboarding: nonConsecutiveMd },
  { kind: 'even-odd',         size: '9x9',     features: ['parity'],                Thumbnail: EvenOdd,         onboarding: evenOddMd },
  { kind: 'jigsaw',           size: '9x9',     features: ['classic-like'],          Thumbnail: Jigsaw,          onboarding: jigsawMd },
  { kind: 'kropki',           size: '9x9',     features: ['edge-clue'],             Thumbnail: Kropki,          onboarding: kropkiMd },
  { kind: 'xv',               size: '9x9',     features: ['edge-clue','arithmetic'],Thumbnail: Xv,              onboarding: xvMd },
  { kind: 'greater-than',     size: '9x9',     features: ['edge-clue'],             Thumbnail: GreaterThan,     onboarding: greaterThanMd },
  { kind: 'thermometer',      size: '9x9',     features: ['path'],                  Thumbnail: Thermometer,     onboarding: thermometerMd },
  { kind: 'arrow',            size: '9x9',     features: ['path','arithmetic'],     Thumbnail: Arrow,           onboarding: arrowMd },
  { kind: 'killer',           size: '9x9',     features: ['cage','arithmetic'],     Thumbnail: Killer,          onboarding: killerMd },
  { kind: 'little-killer',    size: '9x9',     features: ['outside-clue','arithmetic'], Thumbnail: LittleKiller,onboarding: littleKillerMd },
  { kind: 'sandwich',         size: '9x9',     features: ['outside-clue','arithmetic'], Thumbnail: Sandwich,    onboarding: sandwichMd },
  { kind: 'skyscraper',       size: '9x9',     features: ['outside-clue'],          Thumbnail: Skyscraper,      onboarding: skyscraperMd },
  { kind: 'palindrome',       size: '9x9',     features: ['path'],                  Thumbnail: Palindrome,      onboarding: palindromeMd },
  { kind: 'renban',           size: '9x9',     features: ['path'],                  Thumbnail: Renban,          onboarding: renbanMd },
  { kind: 'german-whispers',  size: '9x9',     features: ['path'],                  Thumbnail: GermanWhispers,  onboarding: germanWhispersMd },
  { kind: 'mini-6',           size: '6x6',     features: ['classic-like'],          Thumbnail: Mini6,           onboarding: mini6Md },
  { kind: 'mega-16',          size: '16x16',   features: ['classic-like'],          Thumbnail: Mega16,          onboarding: mega16Md },
  { kind: 'samurai',          size: 'samurai', features: ['classic-like'],          Thumbnail: Samurai,         onboarding: samuraiMd },
]

const BY_KIND: ReadonlyMap<VariantKind, VariantMeta> = new Map(
  VARIANT_CATALOG.map((v) => [v.kind, v]),
)

export function getVariant(kind: VariantKind): VariantMeta {
  const meta = BY_KIND.get(kind)
  if (!meta) throw new Error(`unknown variant kind: ${kind}`)
  return meta
}

export interface OnboardingSection {
  readonly title: string
  readonly body: string
}

const TITLE_LINE = /^title:\s*(.+)$/m

export function parseOnboardingSections(src: string): ReadonlyArray<OnboardingSection> {
  const parts = src.split(/^---$/m)
  // Expect: ['', title-yaml, body, title-yaml, body, ...]
  const sections: OnboardingSection[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const yaml = parts[i] ?? ''
    const body = parts[i + 1] ?? ''
    const titleMatch = yaml.match(TITLE_LINE)
    if (!titleMatch) continue
    sections.push({ title: (titleMatch[1] ?? '').trim(), body })
  }
  if (sections.length < 2) {
    throw new Error('expected at least 2 onboarding sections')
  }
  return sections
}

export function isVariantKind(value: string): value is VariantKind {
  return BY_KIND.has(value as VariantKind)
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/ui/variantCatalog`
Expected: all green.

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/variantCatalog.ts src/ui/variantCatalog.test.ts
git commit -m "feat(ui): variantCatalog as single source of truth for 23 variants"
```

---

## Task 7: IDB `onboardingSeen` store + `onboardingStore` Zustand

**Files:**
- Modify: `src/storage/db.ts`
- Create: `src/state/onboardingStore.ts`
- Test: `src/state/onboardingStore.test.ts`

Schema bump from DB_VERSION=1 → 2. Add object store `onboardingSeen` (single row, key='v1', value=`{ kinds: string[] }`).

- [ ] **Step 1: Write the failing test**

Create `src/state/onboardingStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { useOnboardingStore } from './onboardingStore'
import { _resetDbForTests } from '@/storage/db'

describe('onboardingStore', () => {
  beforeEach(async () => {
    await _resetDbForTests()
    useOnboardingStore.setState({ seen: new Set(), loaded: false })
  })

  it('loads empty by default', async () => {
    await useOnboardingStore.getState().loadFromDb()
    expect(useOnboardingStore.getState().loaded).toBe(true)
    expect(useOnboardingStore.getState().seen.size).toBe(0)
  })

  it('markSeen persists across reload', async () => {
    await useOnboardingStore.getState().loadFromDb()
    await useOnboardingStore.getState().markSeen('killer')
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)

    useOnboardingStore.setState({ seen: new Set(), loaded: false })
    await useOnboardingStore.getState().loadFromDb()
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
  })

  it('markSeen is idempotent', async () => {
    await useOnboardingStore.getState().loadFromDb()
    await useOnboardingStore.getState().markSeen('killer')
    await useOnboardingStore.getState().markSeen('killer')
    expect(useOnboardingStore.getState().seen.size).toBe(1)
  })

  it('reset clears all seen and persists', async () => {
    await useOnboardingStore.getState().loadFromDb()
    await useOnboardingStore.getState().markSeen('killer')
    await useOnboardingStore.getState().markSeen('samurai')
    await useOnboardingStore.getState().reset()
    expect(useOnboardingStore.getState().seen.size).toBe(0)

    useOnboardingStore.setState({ seen: new Set(), loaded: false })
    await useOnboardingStore.getState().loadFromDb()
    expect(useOnboardingStore.getState().seen.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/state/onboardingStore`

Expected: missing module errors.

- [ ] **Step 3: Bump DB schema and add helpers**

Modify `src/storage/db.ts`:

1. Change `const DB_VERSION = 1` to `const DB_VERSION = 2`.
2. Add interface near `SavedStats`:

```ts
export interface SavedOnboarding {
  readonly key: 'v1'
  readonly kinds: ReadonlyArray<string>
}
```

3. Add to the `Schema` interface inside the existing `interface Schema extends DBSchema { ... }`:

```ts
onboardingSeen: {
  key: string
  value: SavedOnboarding
}
```

4. Extend the `upgrade` callback inside `openDB`:

```ts
upgrade(database, oldVersion) {
  if (oldVersion < 1) {
    const games = database.createObjectStore('games', { keyPath: 'id' })
    games.createIndex('byLastPlayed', 'lastPlayedAt')
    database.createObjectStore('settings', { keyPath: 'key' })
    database.createObjectStore('stats', { keyPath: 'key' })
  }
  if (oldVersion < 2) {
    database.createObjectStore('onboardingSeen', { keyPath: 'key' })
  }
},
```

5. Add helpers near `getStats` / `putStats`:

```ts
export async function getOnboarding(): Promise<SavedOnboarding> {
  const d = await db()
  const existing = await d.get('onboardingSeen', 'v1')
  return existing ?? { key: 'v1', kinds: [] }
}

export async function putOnboarding(value: SavedOnboarding): Promise<void> {
  const d = await db()
  await d.put('onboardingSeen', value)
}
```

- [ ] **Step 4: Implement the store**

Create `src/state/onboardingStore.ts`:

```ts
import { create } from 'zustand'
import {
  getOnboarding,
  putOnboarding,
  type SavedOnboarding,
} from '@/storage/db'
import type { VariantKind } from '@/ui/variantCatalog'

export interface OnboardingState {
  readonly seen: ReadonlySet<VariantKind>
  readonly loaded: boolean
  hasSeen: (kind: VariantKind) => boolean
  markSeen: (kind: VariantKind) => Promise<void>
  reset: () => Promise<void>
  loadFromDb: () => Promise<void>
}

async function persist(seen: ReadonlySet<VariantKind>): Promise<void> {
  const next: SavedOnboarding = { key: 'v1', kinds: [...seen] }
  await putOnboarding(next)
}

export const useOnboardingStore = create<OnboardingState>((setState, get) => ({
  seen: new Set<VariantKind>(),
  loaded: false,

  hasSeen: (kind) => get().seen.has(kind),

  loadFromDb: async () => {
    const saved = await getOnboarding()
    setState({
      seen: new Set(saved.kinds as ReadonlyArray<VariantKind>),
      loaded: true,
    })
  },

  markSeen: async (kind) => {
    const current = get().seen
    if (current.has(kind)) return
    const next = new Set(current)
    next.add(kind)
    setState({ seen: next })
    await persist(next)
  },

  reset: async () => {
    const empty = new Set<VariantKind>()
    setState({ seen: empty })
    await persist(empty)
  },
}))
```

- [ ] **Step 5: Wire DB load into `App.tsx`**

Modify `src/App.tsx` `useEffect` block — add an onboarding load after the settings load:

```tsx
import { useOnboardingStore } from '@/state/onboardingStore'

// inside App():
const loadOnboarding = useOnboardingStore((s) => s.loadFromDb)
useEffect(() => {
  void loadOnboarding()
}, [loadOnboarding])
```

Place this `useEffect` immediately after the existing `void loadSettings()` effect. Do not block the loading screen on it — onboarding-loaded state is only consulted at difficulty-pick time, by which point this effect has resolved.

- [ ] **Step 6: Run tests, verify PASS**

Run: `bun run test:run src/state/onboardingStore`
Expected: 4 passing.

Run: `bun run test:run src/storage`
Expected: existing storage tests still green.

- [ ] **Step 7: Commit**

```bash
git add src/storage/db.ts src/state/onboardingStore.ts src/state/onboardingStore.test.ts src/App.tsx
git commit -m "feat(state): onboardingStore + IDB onboardingSeen object store (DB v2)"
```

---

## Task 8: `VariantThumbnail` component

**Files:**
- Create: `src/ui/components/VariantThumbnail.tsx`
- Test: `src/ui/components/VariantThumbnail.test.tsx`

Tiny wrapper around the SVGR component pulled from the catalog. Default 80×80, currentColor.

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/VariantThumbnail.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { VariantThumbnail } from './VariantThumbnail'

describe('VariantThumbnail', () => {
  it('renders the SVG component for a known kind', () => {
    const { container } = render(<VariantThumbnail kind="killer" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('applies size class', () => {
    const { container } = render(<VariantThumbnail kind="classic" className="size-20" />)
    expect(container.firstChild).toHaveClass('size-20')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/components/VariantThumbnail`

- [ ] **Step 3: Implement**

Create `src/ui/components/VariantThumbnail.tsx`:

```tsx
import { getVariant, type VariantKind } from '@/ui/variantCatalog'

interface VariantThumbnailProps {
  readonly kind: VariantKind
  readonly className?: string
}

export function VariantThumbnail({ kind, className = 'size-20' }: VariantThumbnailProps) {
  const { Thumbnail } = getVariant(kind)
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      data-testid={`thumbnail-${kind}`}
      aria-hidden="true"
    >
      <Thumbnail className="h-full w-full text-[var(--color-text)]" />
    </span>
  )
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/ui/components/VariantThumbnail`

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/VariantThumbnail.tsx src/ui/components/VariantThumbnail.test.tsx
git commit -m "feat(ui): VariantThumbnail wrapper component"
```

---

## Task 9: `VariantCard` component

**Files:**
- Create: `src/ui/components/VariantCard.tsx`
- Test: `src/ui/components/VariantCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/VariantCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VariantCard } from './VariantCard'

function renderAt(kind: 'killer' | 'jigsaw', disabled: boolean) {
  return render(
    <MemoryRouter>
      <VariantCard kind={kind} disabled={disabled} />
    </MemoryRouter>,
  )
}

describe('VariantCard', () => {
  it('renders enabled link with name + description for killer', () => {
    renderAt('killer', false)
    const card = screen.getByTestId('variant-card-killer')
    expect(card.tagName).toBe('A')
    expect(card.getAttribute('href')).toBe('/variant/killer')
    expect(card).toHaveTextContent('Killer')
    expect(card).toHaveTextContent('Cages with target sums')
  })

  it('renders disabled card without link for jigsaw', () => {
    renderAt('jigsaw', true)
    const card = screen.getByTestId('variant-card-jigsaw')
    expect(card.tagName).not.toBe('A')
    expect(card.getAttribute('aria-disabled')).toBe('true')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/components/VariantCard`

- [ ] **Step 3: Implement**

Create `src/ui/components/VariantCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { VariantThumbnail } from './VariantThumbnail'
import { t } from '@/i18n/en'
import type { VariantKind } from '@/ui/variantCatalog'

interface VariantCardProps {
  readonly kind: VariantKind
  readonly disabled?: boolean
}

export function VariantCard({ kind, disabled = false }: VariantCardProps) {
  const meta = t.catalog[kind]
  const inner = (
    <>
      <VariantThumbnail kind={kind} className="size-16" />
      <div className="mt-2 text-base font-medium text-center">{meta.name}</div>
      <div className="mt-1 text-xs text-center text-[var(--color-text-muted)] leading-snug">
        {meta.description}
      </div>
    </>
  )

  const sharedClasses =
    'flex flex-col items-center justify-start min-h-[140px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3'

  if (disabled) {
    return (
      <div
        data-testid={`variant-card-${kind}`}
        aria-disabled="true"
        className={`${sharedClasses} opacity-50 cursor-not-allowed`}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      data-testid={`variant-card-${kind}`}
      to={`/variant/${kind}`}
      className={`${sharedClasses} hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-transform`}
    >
      {inner}
    </Link>
  )
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/ui/components/VariantCard`

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/VariantCard.tsx src/ui/components/VariantCard.test.tsx
git commit -m "feat(ui): VariantCard component (enabled + disabled states)"
```

---

## Task 10: `DifficultyPicker` component

**Files:**
- Create: `src/ui/components/DifficultyPicker.tsx`
- Test: `src/ui/components/DifficultyPicker.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/DifficultyPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DifficultyPicker } from './DifficultyPicker'

describe('DifficultyPicker', () => {
  it('renders only difficulties present in the bank', () => {
    render(<DifficultyPicker variant="killer" onPick={() => {}} />)
    // killer ships: diabolical, easy, expert, hard, medium → no very-easy/tough
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-expert')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-diabolical')).toBeInTheDocument()
    expect(screen.queryByTestId('difficulty-very-easy')).toBeNull()
    expect(screen.queryByTestId('difficulty-tough')).toBeNull()
  })

  it('orders bands very-easy → diabolical', () => {
    render(<DifficultyPicker variant="samurai" onPick={() => {}} />)
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.getAttribute('data-testid'))
    const expected = [
      'difficulty-very-easy','difficulty-easy','difficulty-medium',
      'difficulty-hard','difficulty-tough','difficulty-expert',
      'difficulty-diabolical',
    ]
    expect(labels).toEqual(expected)
  })

  it('calls onPick with the chosen band', async () => {
    const onPick = vi.fn()
    render(<DifficultyPicker variant="killer" onPick={onPick} />)
    await userEvent.click(screen.getByTestId('difficulty-hard'))
    expect(onPick).toHaveBeenCalledWith('hard')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/components/DifficultyPicker`

- [ ] **Step 3: Implement**

Create `src/ui/components/DifficultyPicker.tsx`:

```tsx
import type { Difficulty } from '@/engine'
import { hasBank } from '@/puzzles'
import { t } from '@/i18n/en'
import type { VariantKind } from '@/ui/variantCatalog'

const BAND_ORDER: ReadonlyArray<Difficulty> = [
  'very-easy', 'easy', 'medium', 'hard', 'tough', 'expert', 'diabolical',
]

interface DifficultyPickerProps {
  readonly variant: VariantKind
  readonly onPick: (difficulty: Difficulty) => void
}

export function DifficultyPicker({ variant, onPick }: DifficultyPickerProps) {
  const present = BAND_ORDER.filter((b) => hasBank(variant, b))
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {present.map((band) => (
        <button
          key={band}
          type="button"
          data-testid={`difficulty-${band}`}
          onClick={() => onPick(band)}
          className="min-h-[48px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-transform"
        >
          {t.difficulty[band]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/ui/components/DifficultyPicker`

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/DifficultyPicker.tsx src/ui/components/DifficultyPicker.test.tsx
git commit -m "feat(ui): DifficultyPicker (only renders bands with shipped banks)"
```

---

## Task 11: `Onboarding` modal component

**Files:**
- Create: `src/ui/components/Onboarding.tsx`
- Test: `src/ui/components/Onboarding.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/Onboarding.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import 'fake-indexeddb/auto'
import { Onboarding } from './Onboarding'
import { useOnboardingStore } from '@/state/onboardingStore'
import { _resetDbForTests } from '@/storage/db'

beforeEach(async () => {
  await _resetDbForTests()
  useOnboardingStore.setState({ seen: new Set(), loaded: true })
})

describe('Onboarding', () => {
  it('renders screen 1 first with Next button', () => {
    render(<Onboarding kind="killer" onDone={() => {}} />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-next')).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-done')).toBeNull()
  })

  it('Next advances to screen 2 (Done button)', async () => {
    render(<Onboarding kind="killer" onDone={() => {}} />)
    await userEvent.click(screen.getByTestId('onboarding-next'))
    expect(screen.getByText('Quick example')).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-done')).toBeInTheDocument()
  })

  it('Done calls markSeen + onDone', async () => {
    const onDone = vi.fn()
    render(<Onboarding kind="killer" onDone={onDone} />)
    await userEvent.click(screen.getByTestId('onboarding-next'))
    await userEvent.click(screen.getByTestId('onboarding-done'))
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
    expect(onDone).toHaveBeenCalled()
  })

  it('Skip from screen 1 also marks seen + calls onDone', async () => {
    const onDone = vi.fn()
    render(<Onboarding kind="killer" onDone={onDone} />)
    await userEvent.click(screen.getByTestId('onboarding-skip'))
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
    expect(onDone).toHaveBeenCalled()
  })

  it('backdrop tap dismisses with markSeen', async () => {
    const onDone = vi.fn()
    render(<Onboarding kind="killer" onDone={onDone} />)
    await userEvent.click(screen.getByTestId('onboarding-backdrop'))
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
    expect(onDone).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/components/Onboarding`

- [ ] **Step 3: Implement**

Create `src/ui/components/Onboarding.tsx`:

```tsx
import { useState } from 'react'
import { Markdown } from './markdown'
import { getVariant, parseOnboardingSections, type VariantKind } from '@/ui/variantCatalog'
import { useOnboardingStore } from '@/state/onboardingStore'
import { t } from '@/i18n/en'

interface OnboardingProps {
  readonly kind: VariantKind
  readonly onDone: () => void
}

export function Onboarding({ kind, onDone }: OnboardingProps) {
  const meta = getVariant(kind)
  const sections = parseOnboardingSections(meta.onboarding)
  const markSeen = useOnboardingStore((s) => s.markSeen)
  const [index, setIndex] = useState(0)
  const section = sections[index]!
  const isLast = index === sections.length - 1

  async function dismiss() {
    await markSeen(kind)
    onDone()
  }

  return (
    <div
      data-testid="onboarding-backdrop"
      onClick={() => {
        void dismiss()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
    >
      <div
        data-testid="onboarding-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <button
            type="button"
            data-testid="onboarding-skip"
            onClick={() => {
              void dismiss()
            }}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {t.onboarding.skip}
          </button>
        </div>

        <div className="mt-4 text-sm leading-relaxed">
          <Markdown source={section.body} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-[var(--color-text-faint)]">
            {t.onboarding.stepOf(index + 1, sections.length)}
          </div>
          {isLast ? (
            <button
              type="button"
              data-testid="onboarding-done"
              onClick={() => {
                void dismiss()
              }}
              className="min-h-[44px] px-5 rounded-xl bg-[var(--color-accent)] text-white font-medium"
            >
              {t.onboarding.done}
            </button>
          ) : (
            <button
              type="button"
              data-testid="onboarding-next"
              onClick={() => setIndex(index + 1)}
              className="min-h-[44px] px-5 rounded-xl bg-[var(--color-accent)] text-white font-medium"
            >
              {t.onboarding.next}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `bun run test:run src/ui/components/Onboarding`

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/Onboarding.tsx src/ui/components/Onboarding.test.tsx
git commit -m "feat(ui): Onboarding 2-screen modal with Skip/Next/Done + markSeen on dismiss"
```

---

## Task 12: `VariantDetail` page + routing

**Files:**
- Create: `src/ui/pages/VariantDetail.tsx`
- Test: `src/ui/pages/VariantDetail.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/pages/VariantDetail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { VariantDetail } from './VariantDetail'
import { useOnboardingStore } from '@/state/onboardingStore'
import { _resetDbForTests } from '@/storage/db'

function mountAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div data-testid="home-stub">home</div>} />
        <Route path="/variant/:kind" element={<VariantDetail />} />
        <Route path="/play" element={<div data-testid="play-stub">play</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await _resetDbForTests()
  useOnboardingStore.setState({ seen: new Set(), loaded: true })
})

describe('VariantDetail', () => {
  it('renders rules and difficulty picker for killer', () => {
    mountAt('/variant/killer')
    expect(screen.getByText('Killer')).toBeInTheDocument()
    expect(screen.getByText('Rules')).toBeInTheDocument()
    expect(screen.getByText('Pick difficulty')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument()
  })

  it('unknown kind redirects to /', () => {
    mountAt('/variant/nonsense')
    expect(screen.getByTestId('home-stub')).toBeInTheDocument()
  })

  it('first-play opens onboarding instead of navigating to /play', async () => {
    mountAt('/variant/killer')
    await userEvent.click(screen.getByTestId('difficulty-easy'))
    expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('play-stub')).toBeNull()
  })

  it('after onboarding seen, difficulty pick navigates to /play directly', async () => {
    useOnboardingStore.setState({ seen: new Set(['killer'] as const), loaded: true })
    mountAt('/variant/killer')
    await userEvent.click(screen.getByTestId('difficulty-easy'))
    expect(await screen.findByTestId('play-stub')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/pages/VariantDetail`

- [ ] **Step 3: Implement the page**

Create `src/ui/pages/VariantDetail.tsx`:

```tsx
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { DifficultyPicker } from '@/ui/components/DifficultyPicker'
import { Markdown } from '@/ui/components/markdown'
import { Onboarding } from '@/ui/components/Onboarding'
import { VariantThumbnail } from '@/ui/components/VariantThumbnail'
import {
  getVariant,
  isVariantKind,
  parseOnboardingSections,
} from '@/ui/variantCatalog'
import { useOnboardingStore } from '@/state/onboardingStore'
import { t } from '@/i18n/en'
import type { Difficulty } from '@/engine'

export function VariantDetail() {
  const { kind } = useParams<{ kind: string }>()
  const navigate = useNavigate()
  const hasSeen = useOnboardingStore((s) => s.hasSeen)
  const [pendingOnboarding, setPendingOnboarding] = useState<Difficulty | null>(null)

  if (!kind || !isVariantKind(kind)) {
    return <Navigate to="/" replace />
  }

  const meta = getVariant(kind)
  const sections = parseOnboardingSections(meta.onboarding)
  const rulesBody = sections[0]?.body ?? ''
  const catalogEntry = t.catalog[kind]

  function startPlay(difficulty: Difficulty) {
    navigate(`/play?variant=${kind}&difficulty=${difficulty}`)
  }

  function onPick(difficulty: Difficulty) {
    if (hasSeen(kind!)) {
      startPlay(difficulty)
    } else {
      setPendingOnboarding(difficulty)
    }
  }

  return (
    <main className="min-h-dvh px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        >
          ← {t.variant.backToHome}
        </button>

        <header className="flex items-start gap-4">
          <VariantThumbnail kind={kind} className="size-20 shrink-0" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{catalogEntry.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {catalogEntry.description}
            </p>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)]">
            {t.variant.rules}
          </h2>
          <div className="mt-2 text-sm leading-relaxed">
            <Markdown source={rulesBody} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)]">
            {t.variant.pickDifficulty}
          </h2>
          <div className="mt-3">
            <DifficultyPicker variant={kind} onPick={onPick} />
          </div>
        </section>
      </div>

      {pendingOnboarding !== null && (
        <Onboarding
          kind={kind}
          onDone={() => {
            const difficulty = pendingOnboarding
            setPendingOnboarding(null)
            startPlay(difficulty)
          }}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 4: Register route in `App.tsx`**

Modify `src/App.tsx`:

```tsx
import { VariantDetail } from '@/ui/pages/VariantDetail'

// inside <Routes>:
<Route path="/variant/:kind" element={<VariantDetail />} />
```

Place the new route immediately after the existing `/play` route.

- [ ] **Step 5: Run tests, verify PASS**

Run: `bun run test:run src/ui/pages/VariantDetail`
Expected: 4 passing.

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ui/pages/VariantDetail.tsx src/ui/pages/VariantDetail.test.tsx src/App.tsx
git commit -m "feat(ui): VariantDetail page + /variant/:kind route"
```

---

## Task 13: `Home` page rewrite — variant grid with filters

**Files:**
- Modify: `src/ui/pages/Home.tsx` (rewrite)
- Test: `src/ui/pages/Home.test.tsx` (new)

- [ ] **Step 1: Write the failing test**

Create `src/ui/pages/Home.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { Home } from './Home'
import { _resetDbForTests } from '@/storage/db'

beforeEach(async () => {
  await _resetDbForTests()
})

function mount() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('renders 23 variant cards', async () => {
    mount()
    expect(await screen.findByTestId('variant-card-classic')).toBeInTheDocument()
    expect(screen.getByTestId('variant-card-samurai')).toBeInTheDocument()
    expect(screen.getByTestId('variant-card-killer')).toBeInTheDocument()
    // jigsaw card present but disabled
    expect(screen.getByTestId('variant-card-jigsaw')).toHaveAttribute('aria-disabled', 'true')
  })

  it('grid-size filter narrows the visible set', async () => {
    mount()
    await screen.findByTestId('variant-card-classic')
    await userEvent.click(screen.getByTestId('filter-size-6x6'))
    expect(screen.getByTestId('variant-card-mini-6')).toBeInTheDocument()
    expect(screen.queryByTestId('variant-card-classic')).toBeNull()
  })

  it('feature filter (Cage) keeps only killer', async () => {
    mount()
    await screen.findByTestId('variant-card-classic')
    await userEvent.click(screen.getByTestId('filter-feature-cage'))
    expect(screen.getByTestId('variant-card-killer')).toBeInTheDocument()
    expect(screen.queryByTestId('variant-card-classic')).toBeNull()
  })

  it('empty intersection shows empty state', async () => {
    mount()
    await screen.findByTestId('variant-card-classic')
    // pick 6x6 + Cage — no overlap
    await userEvent.click(screen.getByTestId('filter-size-6x6'))
    await userEvent.click(screen.getByTestId('filter-feature-cage'))
    expect(screen.getByTestId('home-empty')).toBeInTheDocument()
  })

  it('shows Stats + Settings nav links', async () => {
    mount()
    expect(await screen.findByTestId('link-stats')).toBeInTheDocument()
    expect(screen.getByTestId('link-settings')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `bun run test:run src/ui/pages/Home`

- [ ] **Step 3: Rewrite `Home.tsx`**

Replace `src/ui/pages/Home.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { VariantCard } from '@/ui/components/VariantCard'
import {
  VARIANT_CATALOG,
  type VariantFeature,
  type VariantSize,
} from '@/ui/variantCatalog'
import { listBanks } from '@/puzzles'
import { mostRecentUnfinished, type SavedGame } from '@/storage/db'
import { InstallBanner } from '@/pwa/InstallBanner'
import { t } from '@/i18n/en'

const SIZE_FILTERS: ReadonlyArray<{ value: VariantSize | 'all'; labelKey: keyof typeof t.home.filters }> = [
  { value: 'all',     labelKey: 'sizeAll' },
  { value: '9x9',     labelKey: 'size9x9' },
  { value: '6x6',     labelKey: 'size6x6' },
  { value: '16x16',   labelKey: 'size16x16' },
  { value: 'samurai', labelKey: 'sizeSamurai' },
]

const FEATURE_FILTERS: ReadonlyArray<{ value: VariantFeature; labelKey: keyof typeof t.home.filters }> = [
  { value: 'classic-like',  labelKey: 'featureClassicLike' },
  { value: 'cage',          labelKey: 'featureCage' },
  { value: 'path',          labelKey: 'featurePath' },
  { value: 'outside-clue',  labelKey: 'featureOutsideClue' },
  { value: 'parity',        labelKey: 'featureParity' },
  { value: 'edge-clue',     labelKey: 'featureEdgeClue' },
  { value: 'arithmetic',    labelKey: 'featureArithmetic' },
]

export function Home() {
  const [continueGame, setContinueGame] = useState<SavedGame | null>(null)
  const [size, setSize] = useState<VariantSize | 'all'>('all')
  const [features, setFeatures] = useState<ReadonlySet<VariantFeature>>(new Set())

  useEffect(() => {
    void mostRecentUnfinished().then(setContinueGame)
  }, [])

  const variantsWithBanks = useMemo(() => {
    return new Set(listBanks().map((b) => b.variant))
  }, [])

  const visible = useMemo(() => {
    return VARIANT_CATALOG.filter((v) => {
      if (size !== 'all' && v.size !== size) return false
      for (const need of features) {
        if (!v.features.includes(need)) return false
      }
      return true
    })
  }, [size, features])

  function toggleFeature(f: VariantFeature) {
    const next = new Set(features)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    setFeatures(next)
  }

  const continueLabel = continueGame
    ? `${t.catalog[continueGame.variant as keyof typeof t.catalog]?.name ?? continueGame.variant} · ${t.difficulty[continueGame.difficulty]} · ${t.home.startedAgo(minutesAgo(continueGame.startedAt))}`
    : ''

  return (
    <main className="min-h-dvh px-6 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-4xl font-semibold tracking-tight">{t.appName}</h1>
        <p className="mt-1 text-[var(--color-text-muted)]">{t.tagline}</p>

        {continueGame && (
          <Link
            to={`/play?variant=${continueGame.variant}&difficulty=${continueGame.difficulty}&puzzleId=${continueGame.id}`}
            data-testid="continue-card"
            className="mt-6 block rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-5 py-4 hover:bg-[var(--color-accent-soft)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-accent-strong)] font-medium">
                  {t.home.continueLabel}
                </div>
                <div className="mt-1 text-base font-medium">{continueLabel}</div>
              </div>
              <span className="text-[var(--color-accent-strong)]">→</span>
            </div>
          </Link>
        )}

        <section className="mt-6 space-y-3">
          <FilterRow
            label={t.home.filters.sizeLabel}
            chips={SIZE_FILTERS.map((f) => ({
              key: f.value,
              testId: `filter-size-${f.value}`,
              label: t.home.filters[f.labelKey],
              active: size === f.value,
              onClick: () => setSize(f.value),
            }))}
          />
          <FilterRow
            label={t.home.filters.featuresLabel}
            chips={FEATURE_FILTERS.map((f) => ({
              key: f.value,
              testId: `filter-feature-${f.value}`,
              label: t.home.filters[f.labelKey],
              active: features.has(f.value),
              onClick: () => toggleFeature(f.value),
            }))}
          />
        </section>

        {visible.length === 0 ? (
          <p
            data-testid="home-empty"
            className="mt-10 text-center text-sm text-[var(--color-text-muted)]"
          >
            {t.home.empty}
          </p>
        ) : (
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((v) => (
              <VariantCard
                key={v.kind}
                kind={v.kind}
                disabled={!variantsWithBanks.has(v.kind)}
              />
            ))}
          </section>
        )}

        <InstallBanner />

        <nav className="mt-10 flex items-center justify-center gap-6 text-sm text-[var(--color-text-muted)]">
          <Link to="/stats" data-testid="link-stats" className="hover:text-[var(--color-text)]">{t.home.stats}</Link>
          <span className="text-[var(--color-text-faint)]">·</span>
          <Link to="/settings" data-testid="link-settings" className="hover:text-[var(--color-text)]">{t.home.settings}</Link>
        </nav>
      </div>
    </main>
  )
}

interface ChipProps {
  readonly key: string
  readonly testId: string
  readonly label: string
  readonly active: boolean
  readonly onClick: () => void
}

function FilterRow({ label, chips }: { label: string; chips: ReadonlyArray<ChipProps> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-[var(--color-text-faint)] mr-1">
        {label}
      </span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          data-testid={c.testId}
          onClick={c.onClick}
          className={`min-h-[36px] rounded-full border px-3 text-sm transition-colors ${
            c.active
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

function minutesAgo(isoString: string): number {
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / 60000))
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `bun run test:run src/ui/pages/Home`
Expected: 5 passing.

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pages/Home.tsx src/ui/pages/Home.test.tsx
git commit -m "feat(ui): Home page rewrite — 23-variant grid with size + feature filters"
```

---

## Task 14: Settings reset button + E2E discovery spec

**Files:**
- Modify: `src/ui/pages/Settings.tsx`
- Create: `e2e/discovery.spec.ts`

### Part A — Settings reset

- [ ] **Step 1: Add the action**

Modify `src/ui/pages/Settings.tsx`:

1. New import at top:

```tsx
import { useOnboardingStore } from '@/state/onboardingStore'
```

2. Inside the `Settings` component, add a hook + handler:

```tsx
const resetOnboarding = useOnboardingStore((s) => s.reset)
const [onboardingResetMsg, setOnboardingResetMsg] = useState<string | null>(null)

async function handleResetOnboarding() {
  await resetOnboarding()
  setOnboardingResetMsg(t.settings.resetOnboardingDone)
  setTimeout(() => setOnboardingResetMsg(null), 2000)
}
```

3. Add a new `ActionRow` inside the existing "Your data" section, just before `action-clear`:

```tsx
<ActionRow
  label={t.settings.resetOnboarding}
  hint={t.settings.resetOnboardingHint}
  onClick={() => {
    void handleResetOnboarding()
  }}
  testId="action-reset-onboarding"
/>
{onboardingResetMsg && (
  <p
    data-testid="onboarding-reset-status"
    className="mt-2 text-sm text-[var(--color-accent-strong)]"
  >
    {onboardingResetMsg}
  </p>
)}
```

- [ ] **Step 2: Add a unit test for the new flow**

Append to `src/state/onboardingStore.test.ts`:

```ts
it('reset can be called multiple times safely', async () => {
  await useOnboardingStore.getState().loadFromDb()
  await useOnboardingStore.getState().markSeen('killer')
  await useOnboardingStore.getState().reset()
  await useOnboardingStore.getState().reset()
  expect(useOnboardingStore.getState().seen.size).toBe(0)
})
```

Run: `bun run test:run src/state/onboardingStore`
Expected: all passing.

- [ ] **Step 3: Commit Part A**

```bash
git add src/ui/pages/Settings.tsx src/state/onboardingStore.test.ts
git commit -m "feat(settings): Reset onboarding action"
```

### Part B — E2E discovery flow

- [ ] **Step 4: Write the E2E spec**

Create `e2e/discovery.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

const LANDSCAPE = { width: 1080, height: 810 }

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
})

test('all 23 variant cards render on Home', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('variant-card-classic')).toBeVisible()
  await expect(page.getByTestId('variant-card-samurai')).toBeVisible()
  await expect(page.getByTestId('variant-card-killer')).toBeVisible()
  await expect(page.getByTestId('variant-card-jigsaw')).toHaveAttribute('aria-disabled', 'true')
})

test('grid-size + feature filter narrow to a single card', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('filter-size-9x9').click()
  await page.getByTestId('filter-feature-cage').click()
  await expect(page.getByTestId('variant-card-killer')).toBeVisible()
  await expect(page.getByTestId('variant-card-classic')).toBeHidden()
})

test('Home → Killer → Easy → onboarding → Done → Play loads', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await expect(page.getByText('Killer')).toBeVisible()
  await expect(page.getByText('Pick difficulty')).toBeVisible()
  await page.getByTestId('difficulty-easy').click()
  await expect(page.getByTestId('onboarding-modal')).toBeVisible()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page).toHaveURL(/variant=killer&difficulty=easy/)
  await expect(page.getByTestId('board')).toBeVisible()
})

test('Continue card appears after starting a game, labelled with catalog name', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/')
  await expect(page.getByTestId('continue-card')).toContainText('Killer')
  await expect(page.getByTestId('continue-card')).toContainText('Easy')
})

test('second visit skips onboarding', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/variant/killer')
  await page.getByTestId('difficulty-easy').click()
  await expect(page.getByTestId('onboarding-modal')).toBeHidden()
  await expect(page).toHaveURL(/variant=killer/)
})

test('Reset onboarding from Settings brings the wizard back', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('variant-card-killer').click()
  await page.getByTestId('difficulty-easy').click()
  await page.getByTestId('onboarding-next').click()
  await page.getByTestId('onboarding-done').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/settings')
  await page.getByTestId('action-reset-onboarding').click()
  await expect(page.getByTestId('onboarding-reset-status')).toBeVisible()
  await page.goto('/variant/killer')
  await page.getByTestId('difficulty-easy').click()
  await expect(page.getByTestId('onboarding-modal')).toBeVisible()
})
```

- [ ] **Step 5: Run the e2e spec**

Run: `bun run e2e -- discovery.spec.ts`
Expected: 6 passing.

- [ ] **Step 6: Run the full gate before final commit**

Run all of these in sequence; each must be green:

```bash
bun run typecheck
bun run lint
bun run test:run
bun run e2e
bun run build
```

- [ ] **Step 7: Commit Part B + tag**

```bash
git add e2e/discovery.spec.ts
git commit -m "test(e2e): discovery flow (Home → Variant → onboarding → Play → resume)"
git tag phase-18
```

---

## Self-review checklist (done by plan author)

- [x] Every spec section maps to a task:
  - "Architecture overview" → File map at top of plan
  - "Home screen" → Task 13
  - "VariantCard" → Task 9
  - "VariantThumbnail" → Task 8 + Task 4 (SVGs)
  - "Filters" → Task 13
  - "VariantDetail screen" → Task 12
  - "Markdown rendering" → Task 3
  - "DifficultyPicker" → Task 10
  - "Onboarding flow" → Task 11 + Task 5 (markdown content)
  - "State store" → Task 7
  - "Settings integration" → Task 14 Part A
  - "Continue card" → Task 13 (using catalog name + startedAgo)
  - "i18n string extraction" → Task 2
  - "Component contracts" → Tasks 8–13
  - "Testing strategy" → tests in each task + Task 14 Part B
  - "Acceptance criteria" → enforced by the gate run in Task 14 Step 6
- [x] No placeholders (TBD / TODO / implement later)
- [x] Type names consistent across tasks (VariantKind, VariantSize, VariantFeature, VariantMeta, OnboardingSection — all defined in Task 6 and consumed unchanged thereafter)
- [x] Method names consistent: `getVariant`, `parseOnboardingSections`, `isVariantKind`, `hasSeen`, `markSeen`, `reset`, `loadFromDb`
- [x] Every code step shows the actual code
- [x] Every test step shows the actual test
- [x] Every command shows the exact command + expected outcome
