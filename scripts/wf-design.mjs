export const meta = {
  name: 'logikku-redesign-design',
  description: 'Multi-agent design panel → synthesized Logikku UI/UX redesign spec',
  phases: [
    { title: 'Design panel', detail: 'parallel design specialists per slice + adversarial older-user critic' },
    { title: 'Synthesize', detail: 'merge into one authoritative redesign spec written to docs/REDESIGN-SPEC.md' },
  ],
}

const SHARED = `
PROJECT: Logikku — an offline-first Sudoku PWA, 23 variants, built with React 19 + TypeScript 6 (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes), Tailwind CSS v4 (via @tailwindcss/vite), Zustand, React Router 7. Repo root: C:/dev/projects/Logikku.

PRIMARY DEVICE: iPad (both portrait 810x1080 AND landscape 1080x810). Installable via Safari "Add to Home Screen". Also works on iPhone and desktop.
PRIMARY PERSONA: non-technical, OLDER user. The UI must be CALM, LARGE-TOUCH, high-contrast, never busy, never childish/gamey, never beep. This is a calm puzzle, NOT a Skinner box. No streaks/lives/energy/ads.

DESIGN DIRECTION (agreed): calm minimal, Swiss/grid + a touch of "e-ink/paper" warmth. Keep the existing purple accent family but verify contrast. Light mode should feel like warm paper; dark mode deep and restful. Generous whitespace, clear type hierarchy, board readability above all. Motion subtle (150-300ms), respect prefers-reduced-motion (already implemented).

HARD CONSTRAINTS (do not violate in any proposal):
- Tailwind v4 utility classes only. The ONLY css file is src/index.css (the v4 entry with @theme tokens + @utility + @layer base). You MAY propose new tokens/utilities there. No other .css files.
- NO new dependencies (no UI kits, no icon libs, no fonts from a CDN — fonts must be system or self-hosted). SVG icons are inline already.
- NO engine changes (src/engine is pure, out of scope). NO state/store logic changes unless purely presentational.
- Keep ALL existing data-testid attributes and aria-* / roles intact (E2E + a11y depend on them). You may ADD testids but never remove/rename.
- Keep behavior identical; this is visual/layout redesign only.
- Color tokens are CSS custom properties consumed as e.g. bg-[var(--color-surface)] or via @theme-generated utilities. Both dark (default) and light (html[data-theme="light"]) must be specified for any token change.

CURRENT TOKENS (src/index.css @theme — dark default):
  --color-bg:#0b0d14 surface:#11141d surface-2:#181c28 border:#232838 border-strong:#38405a
  text:#e4e6ef text-muted:#9ba1b5 text-faint:#7c8194 accent:#8b6cf3 accent-soft:rgba(139,108,243,.18)
  accent-strong:#a98aff conflict:#e25776 given:#f0f1f7 entered:#a98aff
  font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
Light (html[data-theme="light"]): bg:#faf9f6 surface:#fff surface-2:#f3f1ec border:#e3e0d8 border-strong:#b8b3a6 text:#1d1c22 text-muted:#5a5763 accent:#6a4bd9 accent-strong:#4d2dbf given:#1d1c22 entered:#6a4bd9
Safe-area utilities exist: pad-page (2rem+inset) and pad-board (1rem+inset).

KNOWN ISSUES (grounded in screenshots at iPad sizes):
- L1 (CRITICAL): On the Play screen, every NON-samurai variant stacks vertically (board on top, input pad below) locked to max-w-[min(92vw,640px)] centered. In LANDSCAPE this wastes ~40% of the width AND pushes the digit pad BELOW THE FOLD (user must scroll to reach digits 6-9 and erase). Samurai already does a board-left/controls-right row at lg via "lg:flex-row lg:items-start lg:justify-center" in Play.tsx — that two-column model should apply to ALL variants in landscape (or whenever the viewport is wide/short). Board left, controls (mode toggle + digit pad + new/undo/redo) right.
- L2: Portrait Play is top-aligned with a large empty bottom area — wasted vertical space; the board could be larger or the column balanced.
- U1 (CRITICAL usability): The 3x3 box separator lines are too FAINT versus the cell gridlines. For Sudoku — especially older eyes — box boundaries must be clearly heavier/brighter than inner cell lines. Same for 6x6 (2x3 boxes) and 16x16 (4x4 boxes).
- U2: Settings toggle switches are 48x28px — short hit target. Volume slider track is ~16px tall — hard to grab. Enlarge for older users (aim >=44px interactive height / hit area).
- U3: Selection / peer-highlight / same-value / conflict cell states must be bold and obvious (verify weights in BoardCellsLayer.tsx). Given vs entered digit must be unmistakable.
- P1: The Play Toolbar repeats the "Logikku" wordmark on every puzzle — redundant. The variant name (e.g. "Classic · Easy") should be the hero; drop or de-emphasize the app name on Play.
- P2: The "Loading..." state is bare centered text.
- P3: Home is functional but flat; a clearer Continue/New hero and warmer rhythm would help. Don't overdesign — keep calm.

UX RULES TO HONOR (from ui-ux-pro-max): touch targets >=44x44 with >=8px spacing; body text >=16px on mobile; contrast >=4.5:1 normal text / >=3:1 large; one primary CTA per screen; consistent 4/8px spacing rhythm; tabular-nums for digits/timers; semantic color tokens (no raw hex in components); disabled states reduced-opacity; visible focus rings (exists); section spacing hierarchy.

OUTPUT REQUIREMENTS: Be CONCRETE and IMPLEMENTABLE. Give exact values: hex codes, px/rem sizes, exact Tailwind class strings, exact JSX layout structure where relevant. No vague advice like "improve spacing" — say "gap-3 -> gap-4 (16px)". Read the actual source files for precision before specifying. Anchor every change to a file path + element. Do NOT write code to disk — only return the spec.
`

const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    slice: { type: 'string' },
    tokenChanges: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, dark: { type: 'string' }, light: { type: 'string' }, rationale: { type: 'string' } },
        required: ['name'],
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: { element: { type: 'string' }, current: { type: 'string' }, proposed: { type: 'string' }, rationale: { type: 'string' } },
              required: ['element', 'proposed'],
            },
          },
        },
        required: ['path', 'changes'],
      },
    },
    coordinationNotes: { type: 'string' },
  },
  required: ['slice', 'files'],
}

const CRITIQUE_SCHEMA = {
  type: 'object',
  properties: {
    requiredFixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
          fix: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['issue', 'fix'],
      },
    },
    contrastChecks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { pair: { type: 'string' }, ratio: { type: 'string' }, pass: { type: 'boolean' } },
      },
    },
    summary: { type: 'string' },
  },
  required: ['requiredFixes'],
}

phase('Design panel')

const SLICES = [
  {
    key: 'tokens',
    label: 'design-tokens-system',
    focus: `VISUAL SYSTEM & TOKENS. Own src/index.css. Propose the refined token palette (dark + light), a type scale, spacing/radius rhythm, and any new @theme tokens or @utility helpers the other slices will need (e.g. a board box-line color token, a control-surface token, larger touch utilities). Verify WCAG contrast of text-muted/text-faint on surfaces in BOTH themes and fix any that fall below 4.5:1 (large text 3:1). Define the warm-paper light feel and deep-calm dark feel precisely. Keep the purple accent family but you may nudge for calm + contrast. Specify font stack (system, no CDN). Read: src/index.css.`,
  },
  {
    key: 'play-layout',
    label: 'play-screen-layout',
    focus: `PLAY SCREEN LAYOUT (the core fix). Own src/ui/pages/Play.tsx. Design ONE responsive layout that works for ALL variants (classic, mini6, mega16, killer, sandwich, thermo, samurai...) at iPad portrait AND landscape, iPhone, and desktop, with the digit pad ALWAYS reachable without scrolling. Specify: when to use single-column (portrait/narrow) vs two-column board-left/controls-right (landscape/wide-short). Give exact container classes (flex/grid, breakpoints, min-h-dvh, max widths, gaps, alignment), how the board is sized in each mode (it is an aspect-square SVG, max-w-[min(92vw,640px)] today — propose how it scales by available height in landscape so the whole UI fits one screen), and where Toolbar, board, mode toggle, digit pad, completion banner sit in each mode. The board must never be cropped; controls must never fall below the fold on a play screen. Note: Samurai needs landscape (portrait shows RotateDevicePrompt). Read: src/ui/pages/Play.tsx, src/ui/panels/Toolbar.tsx, src/ui/panels/InputPad.tsx, src/ui/board/Board.tsx.`,
  },
  {
    key: 'board',
    label: 'board-readability',
    focus: `BOARD READABILITY. Own src/ui/board/Board.tsx, BoardCellsLayer.tsx, Cell.tsx, GridLines (inside BoardCellsLayer). Specify EXACT SVG stroke widths/colors for: thin inner cell lines vs HEAVY 3x3 (and 2x3 for 6x6, 4x4 for 16x16) box separator lines vs the outer board frame — a clear 3-tier hierarchy readable by older eyes in both themes. Specify selection highlight, peer highlight, same-value highlight, conflict (red) cell, drag-hover, locked-shake, given-vs-entered digit color/weight/size — all must be obvious and calm. Propose a board box-line token if needed (coordinate via the tokens slice naming: --color-grid-line, --color-grid-box, --color-board-frame). Read those 3 files + src/index.css token section.`,
  },
  {
    key: 'controls',
    label: 'input-and-form-controls',
    focus: `INPUT & FORM CONTROLS. Own src/ui/panels/InputPad.tsx, src/ui/panels/Toolbar.tsx, src/ui/pages/Settings.tsx. Specify: digit button sizing/grid for sizes 6/9/16 (currently min-h-56px; propose larger square buttons for older users, with the two-column landscape variant in mind — the pad may be a vertical-friendly grid on the right side); the Value/Pencil mode toggle; the erase button. For Settings: enlarge toggle switches (currently h-7 w-12 / 28px tall) to a >=44px interactive height, enlarge the volume slider thumb/track (currently ~16px) — propose a styled range input using accent token with a big thumb, all in Tailwind/inline-style as needed. For Toolbar: de-emphasize/drop "Logikku" wordmark on Play, make variant the hero, keep undo/redo/new as clear icon+touch targets. Read those 3 files.`,
  },
  {
    key: 'home-nav',
    label: 'home-nav-and-secondary',
    focus: `HOME, NAVIGATION & SECONDARY SCREENS. Own src/ui/pages/Home.tsx, src/ui/components/VariantCard.tsx, src/ui/pages/VariantDetail.tsx, src/ui/components/Onboarding.tsx, src/ui/pages/Stats.tsx, src/ui/pages/About.tsx, the loading state (Play.tsx loading branch + App.tsx '...' branch), and the completion banner (Play.tsx). Propose a warmer, calmer Home with a clear Continue/New hero (without clutter), better card rhythm, a calm board-skeleton or branded loading state instead of bare "Loading...", a calm-celebratory completion banner, and consistent section spacing across secondary pages. Keep it minimal — do not add features. Read those files.`,
  },
]

const designSpecs = await parallel(
  SLICES.map((s) => () =>
    agent(
      `You are a senior product designer on the Logikku redesign.\n${SHARED}\n\nYOUR SLICE: ${s.focus}\n\nReturn a precise, implementable spec for YOUR slice only. Use the schema: slice name, optional token changes (name, dark value, light value, rationale), a list of files each with concrete element-level changes (element/selector, current classes-or-values, proposed classes-or-values, rationale), and any cross-slice coordination notes (e.g. a token name another slice must define). Be exhaustive and exact.`,
      { label: `design:${s.label}`, phase: 'Design panel', schema: SPEC_SCHEMA },
    ),
  ),
)

const critique = await agent(
  `You are an ADVERSARIAL accessibility & older-user usability critic for the Logikku Sudoku PWA (calm, large-touch, older non-technical iPad user).\n${SHARED}\n\nThe design panel proposed these specs (JSON):\n${JSON.stringify(designSpecs.filter(Boolean), null, 2)}\n\nStress-test the COMBINED direction. Find every weakness for the older iPad user: contrast failures (compute ratios for the proposed hex pairs), touch targets under 44px or spacing under 8px, anything that increases cognitive load, anything not reachable without scrolling on iPad portrait OR landscape, any place the board boxes are still ambiguous, any motion that could disorient, any inconsistency between slices (e.g. two slices proposing different radii/spacing), and any proposal that risks breaking strict TypeScript or removing a testid. Return concrete required fixes the synthesis MUST apply.`,
  { label: 'critique:older-user', phase: 'Design panel', schema: CRITIQUE_SCHEMA },
)

phase('Synthesize')

const synthesis = await agent(
  `You are the design lead. Merge the panel specs + the adversarial critique into ONE authoritative, internally-consistent redesign spec for Logikku.\n${SHARED}\n\nPANEL SPECS (JSON):\n${JSON.stringify(designSpecs.filter(Boolean), null, 2)}\n\nADVERSARIAL CRITIQUE (must be addressed):\n${JSON.stringify(critique, null, 2)}\n\nProduce the final spec. Resolve ALL conflicts (one spacing scale, one radius scale, one set of token values, one set of grid-line tokens used by the board). Apply every required critique fix. The spec must be directly implementable file-by-file with exact values and Tailwind class strings.\n\nWRITE the full spec to C:/dev/projects/Logikku/docs/REDESIGN-SPEC.md as well-structured markdown with these sections: 1) Design principles (short), 2) Final token table (dark + light, every token, with any contrast notes), 3) New @utility/base additions for src/index.css, 4) Per-file change list — one subsection per file (src/index.css, Play.tsx, Board.tsx, BoardCellsLayer.tsx, Cell.tsx, InputPad.tsx, Toolbar.tsx, Settings.tsx, Home.tsx, VariantCard.tsx, VariantDetail.tsx, Onboarding.tsx, Stats.tsx, About.tsx) with exact element-level before/after class strings and any new JSX structure (especially the responsive Play layout), 5) Verification checklist (what the Playwright audit must confirm: no overlap, digit pad never below fold on play screens at portrait+landscape, touch targets >=44px, contrast >=4.5:1). Use the Write tool to create the file. Then return a concise summary (the principles + token table + the Play layout structure + the list of files touched).`,
  { label: 'synthesis', phase: 'Synthesize' },
)

return { synthesis, slicesCovered: SLICES.map((s) => s.key), critiqueAddressed: true }
