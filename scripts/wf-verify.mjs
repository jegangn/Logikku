export const meta = {
  name: 'logikku-redesign-verify',
  description: 'Adversarial verification panel for the Logikku UI redesign diff',
  phases: [
    { title: 'Review', detail: 'parallel reviewers: regression, spec-conformance, a11y/contrast, visual older-user' },
    { title: 'Synthesize', detail: 'collate required fixes by severity' },
  ],
}

const CONTEXT = `
Logikku is a calm offline-first Sudoku PWA (React 19 + TS strict + Tailwind v4), primary device iPad, primary user older/non-technical. A UI/layout redesign was just implemented against docs/REDESIGN-SPEC.md. Repo root: C:/dev/projects/Logikku.

Objective evidence already collected (do not re-run, trust it): typecheck/build green; vitest 536/536 green; a Playwright audit over 56 captures (iPad portrait 810x1080 + landscape 1080x810, light+dark, 14 screens) reports 0 hard failures (no overlaps, no horizontal overflow, digit pad never below the fold on play screens); edge checks pass (iPhone landscape stays single-column, desktop two-column capped, selected-cell ring renders). The ONLY known non-issues: Settings toggles measure 56x32 visually but have a ~68x52 hit area via a before: pseudo-element; and 3 PRE-EXISTING lint errors in InputPad drag-ghost (unrelated to this redesign).

Key intentional deviation from the spec: digit pad uses responsive columns (grid-cols-5 wide:grid-cols-3 for 9x9; grid-cols-4 wide:grid-cols-3 for 6) WITHOUT aspect-square/max-h, instead of the spec's single aspect-square grid-cols-3 — this was to prevent a portrait overflow. Confirm this is sound.

After-screenshots (read a few): C:/dev/outputs/logikku-ui-audit/after/  contains <screen>__<portrait|landscape>__<light|dark>.png for: play-classic, play-killer, play-sandwich, play-thermo, play-samurai, home, settings, stats, about, variant-classic, variant-killer. Edge shots: C:/dev/outputs/logikku-ui-audit/edge/ (iphone-landscape.png, selected-portrait.png).

Changed files (see \`git -C C:/dev/projects/Logikku diff --stat\` and \`git diff\`): src/index.css, src/App.tsx, src/ui/pages/{Play,Home,Settings,Stats,About,VariantDetail}.tsx, src/ui/board/{Board,BoardCellsLayer,Cell,SamuraiBoardView}.tsx, src/ui/panels/{InputPad,Toolbar}.tsx, src/ui/components/{VariantCard,Onboarding}.tsx, src/pwa/InstallBanner.tsx, plus 3 *.test.tsx updates.
`

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          file: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['severity', 'issue', 'fix'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['findings', 'summary'],
}

phase('Review')

const REVIEWERS = [
  {
    label: 'regression',
    prompt: `Read the full diff: run \`git -C C:/dev/projects/Logikku diff\`. Hunt for REGRESSIONS only: any removed/renamed data-testid, aria-*, role, or prop; any TypeScript-risky change (exactOptionalPropertyTypes / noUncheckedIndexedAccess); any leftover raw hex/rgba color literal in a component that should be a token; any leftover \`lg:\` class on the Play/Toolbar that should be \`wide:\`; unused imports or dead code; broken JSX structure (unbalanced wrappers from header/space-y rewrites). For each, give file + exact fix. If clean, return empty findings with a summary saying so.`,
  },
  {
    label: 'spec-conformance',
    prompt: `Read docs/REDESIGN-SPEC.md section 4 and the changed source files. For each per-file change in the spec, verify it was actually applied. Flag any spec item that was MISSED or applied incorrectly. Evaluate the one intentional deviation (responsive digit-pad columns vs spec's aspect-square 3-col) — confirm it satisfies the spec's intent (large touch + pad never below fold) or flag a real problem. Report missed items as findings.`,
  },
  {
    label: 'a11y-contrast',
    prompt: `Verify accessibility against the final tokens in src/index.css (read it). Compute WCAG contrast for the worst text/background pairs in BOTH themes (text-faint, text-muted, conflict, accent-as-text on surface/surface-2/bg) and confirm >=4.5:1 (>=3:1 for large/UI). Check: exactly one <h1> per screen (Play h1=puzzle title via Toolbar, Home h1=appName, secondary pages each one h1); focus-visible ring intact; prefers-reduced-motion still covers the new skeleton; the new SVG share icon in InstallBanner has aria-hidden and the button keeps its label. Flag any real contrast or a11y failure with the computed ratio.`,
  },
  {
    label: 'visual-older-user',
    prompt: `Read these after-screenshots and judge them as a calm-app designer for an older iPad user: C:/dev/outputs/logikku-ui-audit/after/play-classic__landscape__dark.png, play-classic__portrait__light.png, play-killer__portrait__dark.png, play-sandwich__landscape__dark.png, home__portrait__dark.png, settings__portrait__dark.png, stats__portrait__dark.png, about__portrait__light.png, and C:/dev/outputs/logikku-ui-audit/edge/selected-portrait.png. Look for anything that LOOKS wrong: cramped/awkward spacing, weak visual hierarchy, board box-lines still too faint, text too small, empty/unbalanced areas, color clashes, overlay variants (killer cages / sandwich clues) rendering poorly, or anything not calm/premium. Be specific (which screenshot, where). Flag only genuine visual issues, with the fix.`,
  },
]

const reviews = await parallel(
  REVIEWERS.map((r) => () =>
    agent(`You are a meticulous reviewer of the Logikku UI redesign.\n${CONTEXT}\n\nYOUR FOCUS: ${r.prompt}`, {
      label: `review:${r.label}`,
      phase: 'Review',
      schema: FINDINGS_SCHEMA,
    }),
  ),
)

phase('Synthesize')

const all = reviews.filter(Boolean).flatMap((r) => r.findings || [])
const synthesis = await agent(
  `You are the verification lead for the Logikku redesign. Here are all reviewer findings (JSON):\n${JSON.stringify(reviews.filter(Boolean), null, 2)}\n\nDe-duplicate and triage. Produce a single prioritized list of findings that are GENUINELY actionable for this calm older-user iPad Sudoku PWA. Drop false positives, stylistic nitpicks the spec already decided, and anything contradicting the agreed design (e.g. the intentional digit-pad deviation if it's sound, the toggle hit-area which is fine). For each kept finding give: severity, file, the precise fix. End with a one-line verdict: is the redesign SHIP-READY as-is, or are there must-fix items first?`,
  { label: 'verdict', phase: 'Synthesize' },
)

return { totalRawFindings: all.length, verdict: synthesis }
