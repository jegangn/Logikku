# Logikku

Sudoku, every variant. Offline-first PWA. iPad-first.

23 variants planned: Classic, X/Diagonal, Hyper/Windoku, Anti-Knight, Anti-King, Non-Consecutive, Jigsaw, Even-Odd, Mini 6×6, Kropki, XV, Greater Than, Thermometer, Arrow, Killer, Little Killer, Sandwich, Skyscraper, Palindrome, Renban, German Whispers, Mega 16×16, Samurai.

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4 via `@tailwindcss/vite`
- Zustand (state) · idb (storage) · React Router
- `vite-plugin-pwa` (Workbox) · PWA install on iPad via Safari "Add to Home Screen"
- Vitest + @testing-library/react · Playwright (Chromium + iPad device profile)
- Python + Z3 for offline puzzle generation (separate pipeline)
- Web-only: Vercel-hosted, installable as a PWA. No App Store, no native wrapper.

## Scripts

```bash
bun dev          # vite dev server
bun run build    # tsc -b && vite build
bun run preview  # serve built artifact
bun run test     # vitest watch
bun run test:run # vitest single run (CI mode)
bun run e2e      # playwright
bun run typecheck
bun run lint
```

## Repo layout

```
src/         # app code (UI + engine; engine kept React-free)
e2e/         # Playwright specs
docs/        # ARCHITECTURE, VARIANTS, GENERATION, GOTCHAS, NAMING
prompts/     # phase-00 .. phase-20 implementation prompts
```

See `CLAUDE.md` for the project bible and `docs/ARCHITECTURE.md` for the constraint system.
