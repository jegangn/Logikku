# Phase 17b — Samurai Cruciform UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a playable cruciform Samurai board on iPad landscape, wired to the shipped Phase 17a engine + state, with hand-crafted demo and orientation lock.

**Architecture:** Extract `BoardCellsLayer` from `Board.tsx` so two callers can share cell rendering. Build `SamuraiBoardView` that positions 5 `BoardCellsLayer` instances in a cruciform. Add a `useIsPortraitOrientation` hook and `RotateDevicePrompt` so portrait users see a rotate hint while landscape gets the playable board. Wire `Play.tsx` to dispatch on `board.kind` and pass `samuraiGivens` from the demo bank.

**Tech Stack:** React 19, TypeScript 6 (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`), Tailwind v4, Zustand 5, Vitest 4 + happy-dom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-20-phase-17b-samurai-ui-design.md`.

**Branch:** main (continues from 17a, per the user's earlier choice).

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/ui/board/BoardCellsLayer.tsx` | Pure cells + grid-lines render for ONE `Grid`. Returns a single `<g>`. Caller closes any gridIdx over `onSelect`. |
| Create | `src/ui/board/BoardCellsLayer.test.tsx` | Unit tests for BoardCellsLayer. |
| Modify | `src/ui/board/Board.tsx` | Outer SVG shell + OverlayLayer; delegates inner cells to BoardCellsLayer. Public API unchanged. |
| Create | `src/ui/hooks/useIsPortraitOrientation.ts` | `matchMedia('(orientation: portrait)')` boolean hook. |
| Create | `src/ui/hooks/useIsPortraitOrientation.test.ts` | Hook tests against mocked matchMedia. |
| Create | `src/ui/board/RotateDevicePrompt.tsx` | Centered card with rotate icon + message. |
| Create | `src/ui/board/RotateDevicePrompt.test.tsx` | Renders icon + message. |
| Modify | `src/puzzles/types.ts` | Add `samuraiGivens?: ReadonlyArray<string>` to `PuzzleRecord`. |
| Modify | `src/puzzles/index.ts` | Validate `samuraiGivens` shape at bank load. |
| Create | `src/puzzles/samurai/easy.json` | One hand-crafted demo with 5 × 81-char strings. |
| Create | `src/puzzles/samurai.test.ts` | Loads bank, validates shape + consistency check. |
| Create | `src/ui/board/SamuraiBoardView.tsx` | Outer cruciform SVG; 5 positioned BoardCellsLayer groups; per-sub-grid view-state. |
| Create | `src/ui/board/SamuraiBoardView.test.tsx` | Renders 5 sub-grids, selection / peer / conflict across overlap. |
| Modify | `src/ui/pages/Play.tsx` | `VARIANT_LABELS['samurai']`, dispatch on `board.kind`, orientation lock, pass `samuraiGivens`, `lg:flex-row` for samurai. |
| Create | `src/ui/pages/Play.samurai.test.tsx` | Integration: load → render cruciform → tap → input → undo. |
| Modify | `docs/GOTCHAS.md` | Phase 17b entry (gotchas discovered). |

---

## Task 1: Extract `BoardCellsLayer`

Extract the inner cell loop + `GridLines` from `Board.tsx` into a pure rendering component. Board.tsx keeps the outer SVG + OverlayLayer + viewBox math; its public props API is unchanged so every existing variant test still passes. After this task, `SamuraiBoardView` has a reusable building block.

**Files:**
- Create: `src/ui/board/BoardCellsLayer.tsx`
- Create: `src/ui/board/BoardCellsLayer.test.tsx`
- Modify: `src/ui/board/Board.tsx`

- [ ] **Step 1: Write the failing test file `src/ui/board/BoardCellsLayer.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardCellsLayer } from './BoardCellsLayer'
import { CLASSIC_9, createClassicConstraint, parsePuzzle } from '@/engine'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...parsePuzzle('0'.repeat(81), CLASSIC_9), constraints: [c] }
}

describe('BoardCellsLayer', () => {
  it('renders 81 gridcells inside a single <g>', () => {
    const grid = makeGrid()
    const { container } = render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={() => {}}
        />
      </svg>,
    )
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(81)
  })

  it('marks the selected cell via data-selected', () => {
    const grid = makeGrid()
    render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={{ r: 4, c: 4 }}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={() => {}}
        />
      </svg>,
    )
    expect(screen.getByTestId('cell-4-4').getAttribute('data-selected')).toBe('true')
    expect(screen.getByTestId('cell-0-0').getAttribute('data-selected')).toBe('false')
  })

  it('fires onSelect with the local coord', async () => {
    const grid = makeGrid()
    const onSelect = vi.fn()
    render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={onSelect}
        />
      </svg>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByTestId('cell-2-3'))
    expect(onSelect).toHaveBeenCalledWith({ r: 2, c: 3 })
  })

  it('marks conflict cells via data-conflict from the conflictSet prop', () => {
    const grid = makeGrid()
    render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set(['0,0', '0,1'])}
          onSelect={() => {}}
        />
      </svg>,
    )
    expect(screen.getByTestId('cell-0-0').getAttribute('data-conflict')).toBe('true')
    expect(screen.getByTestId('cell-0-1').getAttribute('data-conflict')).toBe('true')
    expect(screen.getByTestId('cell-1-1').getAttribute('data-conflict')).toBe('false')
  })

  it('suppresses heavy box lines when suppressBoxLines=true', () => {
    const grid = makeGrid()
    const { container } = render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          suppressBoxLines
          onSelect={() => {}}
        />
      </svg>,
    )
    const heavyLines = container.querySelectorAll('line[stroke-width="2.5"]')
    // Only the 4 outer edges remain heavy (top, bottom, left, right).
    expect(heavyLines.length).toBe(4)
  })

  it('accepts an optional gridIdx prop without changing visible output', () => {
    const grid = makeGrid()
    const a = render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={() => {}}
        />
      </svg>,
    )
    const html1 = a.container.innerHTML
    a.unmount()
    const b = render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          gridIdx={1}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={() => {}}
        />
      </svg>,
    )
    const html2 = b.container.innerHTML
    expect(html2).toBe(html1)
  })
})

describe('Board (existing) still passes through to BoardCellsLayer', () => {
  it('renders 81 cells via the integrated Board', async () => {
    const { Board } = await import('./Board')
    const grid = makeGrid()
    render(<Board grid={grid} selected={null} onSelect={() => {}} />)
    const board = screen.getByTestId('board')
    expect(within(board).getAllByRole('gridcell')).toHaveLength(81)
  })
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `bun run test:run src/ui/board/BoardCellsLayer.test.tsx`
Expected: FAIL — `BoardCellsLayer` not found / import error.

- [ ] **Step 3: Create `src/ui/board/BoardCellsLayer.tsx`**

```tsx
import { useMemo } from 'react'
import { Cell } from './Cell'
import type { Coord, Digit, Grid } from '@/engine'
import { cellAt } from '@/engine'

export interface BoardCellsLayerProps {
  readonly grid: Grid
  readonly cellSize: number
  readonly gridIdx?: number
  readonly selectedCoord: Coord | null
  readonly selectedValue: Digit | null
  readonly peerSet: ReadonlySet<string>
  readonly conflictSet: ReadonlySet<string>
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly suppressBoxLines?: boolean
  readonly onSelect: (coord: Coord) => void
}

export function BoardCellsLayer({
  grid,
  cellSize,
  selectedCoord,
  selectedValue,
  peerSet,
  conflictSet,
  lockedCells,
  shakeKey = 0,
  suppressBoxLines = false,
  onSelect,
}: BoardCellsLayerProps) {
  const size = grid.shape.size
  const cells = useMemo(() => {
    const out: React.ReactElement[] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = cellAt(grid, { r, c })
        const key = `${r},${c}`
        const isSelected =
          selectedCoord !== null && selectedCoord.r === r && selectedCoord.c === c
        const peerHighlight = peerSet.has(key) && !isSelected
        const sameValue =
          selectedValue !== null &&
          cell.value === selectedValue &&
          !isSelected
        out.push(
          <Cell
            key={key}
            coord={{ r, c }}
            cellSize={cellSize}
            gridSize={size}
            value={cell.value}
            candidates={cell.candidates}
            given={cell.given}
            selected={isSelected}
            peerHighlight={peerHighlight}
            sameValueHighlight={sameValue}
            conflict={conflictSet.has(key)}
            locked={lockedCells?.has(key) ?? false}
            shakeKey={shakeKey}
            onSelect={onSelect}
          />,
        )
      }
    }
    return out
  }, [grid, cellSize, selectedCoord, selectedValue, peerSet, conflictSet, lockedCells, shakeKey, onSelect, size])

  return (
    <g>
      {cells}
      <GridLines
        size={size}
        cellSize={cellSize}
        shape={grid.shape}
        suppressBoxLines={suppressBoxLines}
      />
    </g>
  )
}

function GridLines({
  size,
  cellSize,
  shape,
  suppressBoxLines,
}: {
  size: number
  cellSize: number
  shape: Grid['shape']
  suppressBoxLines: boolean
}) {
  const lines: React.ReactElement[] = []
  const total = size * cellSize
  for (let i = 0; i <= size; i++) {
    const heavy = !suppressBoxLines && i % shape.boxCols === 0
    const isEdge = i === 0 || i === size
    const stroke = heavy || isEdge ? 'var(--color-border-strong)' : 'var(--color-border)'
    const w = heavy || isEdge ? 2.5 : 1
    lines.push(
      <line
        key={`v-${i}`}
        x1={i * cellSize}
        y1={0}
        x2={i * cellSize}
        y2={total}
        stroke={stroke}
        strokeWidth={w}
      />,
    )
  }
  for (let i = 0; i <= size; i++) {
    const heavy = !suppressBoxLines && i % shape.boxRows === 0
    const isEdge = i === 0 || i === size
    const stroke = heavy || isEdge ? 'var(--color-border-strong)' : 'var(--color-border)'
    const w = heavy || isEdge ? 2.5 : 1
    lines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={i * cellSize}
        x2={total}
        y2={i * cellSize}
        stroke={stroke}
        strokeWidth={w}
      />,
    )
  }
  return <g pointerEvents="none">{lines}</g>
}
```

- [ ] **Step 4: Rewrite `src/ui/board/Board.tsx` to delegate inner cells**

```tsx
import { useMemo } from 'react'
import { BoardCellsLayer } from './BoardCellsLayer'
import { OverlayLayer } from './OverlayLayer'
import type { Coord, Digit, Grid } from '@/engine'
import { cellAt, peersFromConstraints } from '@/engine'
import type { EdgeMark } from './overlays/EdgeMarkOverlay'
import type { ThermometerPath } from './overlays/ThermometerOverlay'
import type { ArrowShape } from './overlays/ArrowOverlay'
import type { CageShape } from './overlays/KillerOverlay'
import type { OutsideClueDisplay } from './overlays/OutsideClueOverlay'
import type { VariantPath } from './overlays/PathOverlay'

export interface BoardProps {
  readonly grid: Grid
  readonly selected: Coord | null
  readonly variant?: string
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly jigsawPieceMap?: ReadonlyArray<number>
  readonly parityMask?: string
  readonly edges?: ReadonlyArray<EdgeMark>
  readonly thermometers?: ReadonlyArray<ThermometerPath>
  readonly arrows?: ReadonlyArray<ArrowShape>
  readonly cages?: ReadonlyArray<CageShape>
  readonly outsideClues?: ReadonlyArray<OutsideClueDisplay>
  readonly paths?: ReadonlyArray<VariantPath>
  readonly onSelect: (coord: Coord) => void
}

const CELL_SIZE = 64

export function Board({
  grid,
  selected,
  variant,
  lockedCells,
  shakeKey = 0,
  jigsawPieceMap,
  parityMask,
  edges,
  thermometers,
  arrows,
  cages,
  outsideClues,
  paths,
  onSelect,
}: BoardProps) {
  const size = grid.shape.size
  const boardPx = size * CELL_SIZE
  const margin = outsideClues && outsideClues.length > 0 ? CELL_SIZE * 0.6 : 0

  const peerSet = useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(peersFromConstraints(selected, grid).map((p) => `${p.r},${p.c}`))
  }, [selected, grid])

  const selectedValue = selected ? cellAt(grid, selected).value : null

  const conflictSet = useMemo(() => computeConflicts(grid), [grid])

  return (
    <svg
      role="grid"
      aria-label="Sudoku board"
      data-testid="board"
      viewBox={`${-margin} ${-margin} ${boardPx + margin * 2} ${boardPx + margin * 2}`}
      className="w-full max-w-[min(92vw,640px)] aspect-square select-none"
    >
      <rect x={0} y={0} width={boardPx} height={boardPx} fill="var(--color-surface)" />
      <BoardCellsLayer
        grid={grid}
        cellSize={CELL_SIZE}
        selectedCoord={selected}
        selectedValue={selectedValue}
        peerSet={peerSet}
        conflictSet={conflictSet}
        {...(lockedCells !== undefined ? { lockedCells } : {})}
        shakeKey={shakeKey}
        suppressBoxLines={variant === 'jigsaw'}
        onSelect={onSelect}
      />
      <OverlayLayer
        gridSize={size}
        cellSize={CELL_SIZE}
        {...(variant !== undefined ? { variant } : {})}
        {...(jigsawPieceMap !== undefined ? { jigsawPieceMap } : {})}
        {...(parityMask !== undefined ? { parityMask } : {})}
        {...(edges !== undefined ? { edges } : {})}
        {...(thermometers !== undefined ? { thermometers } : {})}
        {...(arrows !== undefined ? { arrows } : {})}
        {...(cages !== undefined ? { cages } : {})}
        {...(outsideClues !== undefined ? { outsideClues } : {})}
        {...(paths !== undefined ? { paths } : {})}
      />
    </svg>
  )
}

function computeConflicts(grid: Grid): ReadonlySet<string> {
  const out = new Set<string>()
  for (const constraint of grid.constraints) {
    for (const region of constraint.regions) {
      const byDigit = new Map<Digit, Coord[]>()
      for (const coord of region.cells) {
        const cell = cellAt(grid, coord)
        if (cell.value === null) continue
        const list = byDigit.get(cell.value) ?? []
        list.push(coord)
        byDigit.set(cell.value, list)
      }
      for (const list of byDigit.values()) {
        if (list.length > 1) {
          for (const co of list) out.add(`${co.r},${co.c}`)
        }
      }
    }
    if (constraint.findConflicts) {
      for (const co of constraint.findConflicts(grid)) {
        out.add(`${co.r},${co.c}`)
      }
    }
  }
  return out
}
```

- [ ] **Step 5: Run the new test + the existing Board test**

Run: `bun run test:run src/ui/board/BoardCellsLayer.test.tsx src/ui/board/Board.test.tsx`
Expected: both PASS. Every existing assertion (81 cells, conflict, overlays) survives.

- [ ] **Step 6: Run typecheck and the full UI suite as a regression sweep**

Run: `bun run typecheck && bun run test:run src/ui`
Expected: typecheck clean; UI suite all green (variant integration tests unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/ui/board/BoardCellsLayer.tsx src/ui/board/BoardCellsLayer.test.tsx src/ui/board/Board.tsx
git commit -m "refactor(ui): extract BoardCellsLayer from Board

Board.tsx keeps the outer SVG, OverlayLayer, and conflict computation.
Inner cells + grid lines move into a pure rendering component reused
by Phase 17b's SamuraiBoardView."
```

---

## Task 2: `useIsPortraitOrientation` hook

A tiny hook that returns the current orientation as a boolean. Wraps `window.matchMedia('(orientation: portrait)')` with a `useEffect` subscription. Default `false` for first render so the cruciform doesn't flash on mount.

**Files:**
- Create: `src/ui/hooks/useIsPortraitOrientation.ts`
- Create: `src/ui/hooks/useIsPortraitOrientation.test.ts`

- [ ] **Step 1: Write the failing test `src/ui/hooks/useIsPortraitOrientation.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsPortraitOrientation } from './useIsPortraitOrientation'

interface FakeMQL {
  matches: boolean
  listeners: Array<(ev: MediaQueryListEvent) => void>
  addEventListener: (type: 'change', cb: (ev: MediaQueryListEvent) => void) => void
  removeEventListener: (type: 'change', cb: (ev: MediaQueryListEvent) => void) => void
}

function makeFakeMQL(initial: boolean): FakeMQL {
  return {
    matches: initial,
    listeners: [],
    addEventListener(_t, cb) {
      this.listeners.push(cb)
    },
    removeEventListener(_t, cb) {
      this.listeners = this.listeners.filter((l) => l !== cb)
    },
  }
}

describe('useIsPortraitOrientation', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined
  let fakeMQL: FakeMQL

  beforeEach(() => {
    fakeMQL = makeFakeMQL(true)
    originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation(() => fakeMQL) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia
  })

  it('returns true when matchMedia reports portrait', () => {
    const { result } = renderHook(() => useIsPortraitOrientation())
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia reports landscape', () => {
    fakeMQL.matches = false
    const { result } = renderHook(() => useIsPortraitOrientation())
    expect(result.current).toBe(false)
  })

  it('updates when matchMedia fires a change event', () => {
    fakeMQL.matches = true
    const { result } = renderHook(() => useIsPortraitOrientation())
    expect(result.current).toBe(true)
    act(() => {
      fakeMQL.matches = false
      for (const l of fakeMQL.listeners) {
        l({ matches: false } as MediaQueryListEvent)
      }
    })
    expect(result.current).toBe(false)
  })

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useIsPortraitOrientation())
    expect(fakeMQL.listeners.length).toBe(1)
    unmount()
    expect(fakeMQL.listeners.length).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:run src/ui/hooks/useIsPortraitOrientation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/hooks/useIsPortraitOrientation.ts`**

```ts
import { useEffect, useState } from 'react'

const QUERY = '(orientation: portrait)'

export function useIsPortraitOrientation(): boolean {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const handler = (ev: MediaQueryListEvent) => setIsPortrait(ev.matches)
    setIsPortrait(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isPortrait
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:run src/ui/hooks/useIsPortraitOrientation.test.ts`
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/hooks/useIsPortraitOrientation.ts src/ui/hooks/useIsPortraitOrientation.test.ts
git commit -m "feat(ui): add useIsPortraitOrientation hook

Wraps window.matchMedia('(orientation: portrait)') with cleanup.
Backs the samurai landscape lock landing in 17b."
```

---

## Task 3: `RotateDevicePrompt` component

A small centered card with a rotate-icon SVG and the message "Samurai needs landscape — please rotate your device." Uses existing color tokens (`--color-text-muted`, `--color-surface`).

**Files:**
- Create: `src/ui/board/RotateDevicePrompt.tsx`
- Create: `src/ui/board/RotateDevicePrompt.test.tsx`

- [ ] **Step 1: Write the failing test `src/ui/board/RotateDevicePrompt.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RotateDevicePrompt } from './RotateDevicePrompt'

describe('RotateDevicePrompt', () => {
  it('renders a rotate icon and the landscape prompt text', () => {
    render(<RotateDevicePrompt />)
    expect(screen.getByTestId('rotate-device-prompt')).toBeInTheDocument()
    expect(screen.getByText(/landscape/i)).toBeInTheDocument()
    const svg = screen.getByTestId('rotate-icon')
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('exposes an accessible aria-label', () => {
    render(<RotateDevicePrompt />)
    expect(screen.getByRole('img', { name: /rotate/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:run src/ui/board/RotateDevicePrompt.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/board/RotateDevicePrompt.tsx`**

```tsx
export function RotateDevicePrompt(): React.ReactElement {
  return (
    <div
      data-testid="rotate-device-prompt"
      className="flex flex-col items-center justify-center gap-4 px-6 py-12 w-full max-w-md mx-auto text-center"
    >
      <svg
        data-testid="rotate-icon"
        role="img"
        aria-label="Rotate device to landscape"
        viewBox="0 0 64 64"
        width="80"
        height="80"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="14" y="6" width="20" height="36" rx="3" />
        <line x1="20" y1="38" x2="28" y2="38" />
        <path d="M40 24 a14 14 0 0 1 14 14" />
        <polyline points="48,32 54,38 60,32" />
      </svg>
      <p className="text-base text-[var(--color-text-muted)]">
        Samurai needs landscape — please rotate your device.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:run src/ui/board/RotateDevicePrompt.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/board/RotateDevicePrompt.tsx src/ui/board/RotateDevicePrompt.test.tsx
git commit -m "feat(ui): add RotateDevicePrompt for samurai portrait fallback"
```

---

## Task 4: `PuzzleRecord.samuraiGivens` + bank validation

Adds the optional `samuraiGivens?: ReadonlyArray<string>` field to `PuzzleRecord`, then teaches `assertRecord` in `src/puzzles/index.ts` to validate it: length 5, each entry an 81-char string. Bank load throws on malformed shape so `bun run build` surfaces broken JSON loudly.

**Files:**
- Modify: `src/puzzles/types.ts`
- Modify: `src/puzzles/index.ts`
- Create: `src/puzzles/samurai.test.ts`

- [ ] **Step 1: Write the failing test `src/puzzles/samurai.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

// This test fails until the demo bank lands AND validation accepts samuraiGivens.
describe('puzzles/samurai bank (validation only — fixture lands in Task 5)', () => {
  it('PuzzleRecord type accepts samuraiGivens', async () => {
    const types = await import('./types')
    // Compile-time check via TS; this assertion just ensures the import resolves.
    expect(types).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test (expected to pass since it's a smoke test that survives until Task 5 extends it)**

Run: `bun run test:run src/puzzles/samurai.test.ts`
Expected: PASS (smoke only).

- [ ] **Step 3: Modify `src/puzzles/types.ts` — add samuraiGivens after `paths`**

Open the file. Inside `PuzzleRecord`, right after the closing of `paths` (line ~73, just before the closing `}` of the interface), insert:

```ts
  /** Samurai: 5 × 81-char givens strings — order [center, NW, NE, SW, SE]. */
  readonly samuraiGivens?: ReadonlyArray<string>
```

The full block should now end with both `paths` and `samuraiGivens` fields.

- [ ] **Step 4: Modify `src/puzzles/index.ts` — add validation for samuraiGivens**

Find the `assertRecord` function in `src/puzzles/index.ts`. Just before its closing `}` (after the `edges` validation block ending at line ~239), insert:

```ts
  if (obj['samuraiGivens'] !== undefined) {
    if (!Array.isArray(obj['samuraiGivens']) || obj['samuraiGivens'].length !== 5) {
      throw new Error(
        `bank ${key.variant}/${key.difficulty}: 'samuraiGivens' must be a 5-element array`,
      )
    }
    for (const s of obj['samuraiGivens'] as unknown[]) {
      if (typeof s !== 'string' || s.length !== 81) {
        throw new Error(
          `bank ${key.variant}/${key.difficulty}: each samuraiGivens entry must be an 81-char string`,
        )
      }
    }
  }
```

- [ ] **Step 5: Extend `src/puzzles/samurai.test.ts` to cover validation**

Replace the smoke test with:

```ts
import { describe, it, expect } from 'vitest'
import type { PuzzleRecord } from './types'

describe('PuzzleRecord.samuraiGivens (type + validation surface)', () => {
  it('PuzzleRecord type accepts samuraiGivens at compile time', () => {
    const rec: PuzzleRecord = {
      id: 'x', variant: 'samurai', size: 9, givens: '', difficulty: 'easy',
      se: 1, hardestTier: 0, steps: 0, generatedAt: '2026-05-20T00:00:00Z',
      samuraiGivens: ['0'.repeat(81), '0'.repeat(81), '0'.repeat(81), '0'.repeat(81), '0'.repeat(81)],
    }
    expect(rec.samuraiGivens?.length).toBe(5)
  })

  // We can't easily test the validator in isolation because import.meta.glob
  // runs at module load. Task 5 lands the demo JSON; if it's malformed the
  // module import in Play.samurai.test.tsx fails loudly. This file just
  // documents the shape contract.
})
```

- [ ] **Step 6: Run typecheck + the new tests**

Run: `bun run typecheck && bun run test:run src/puzzles/samurai.test.ts`
Expected: typecheck clean; test PASS.

- [ ] **Step 7: Commit**

```bash
git add src/puzzles/types.ts src/puzzles/index.ts src/puzzles/samurai.test.ts
git commit -m "feat(puzzles): accept samuraiGivens on PuzzleRecord

Adds optional ReadonlyArray<string> field plus a validator that rejects
arrays of the wrong length or strings that aren't 81 chars. Prepares for
the hand-crafted demo bank landing in the next task."
```

---

## Task 5: Hand-crafted demo bank `src/puzzles/samurai/easy.json`

One demo record with 5 × 81-char strings. To make consistency check trivial to satisfy, every given is placed at cell (4,4) of its sub-grid — the dead-middle cell, which is in the middle box (1,1) of any 9×9 grid and therefore never overlaps with any other sub-grid (overlaps occur only in box (0,0), (0,2), (2,0), (2,2) per `SAMURAI_LAYOUT`).

Each string is built as `'0' * 40 + 'D' + '0' * 40` where D is the digit and position 40 = row 4 × 9 + col 4. Center gets `5`, NW=`1`, NE=`2`, SW=`3`, SE=`4`. Total length = 40 + 1 + 40 = 81.

**Files:**
- Create: `src/puzzles/samurai/easy.json`
- Modify: `src/puzzles/samurai.test.ts`

- [ ] **Step 1: Extend the failing test to require the demo loads**

Append to `src/puzzles/samurai.test.ts`:

```ts
import { freshSamuraiBoardFromGivensForTest } from './samurai-test-helpers'

describe('samurai/easy.json demo bank', () => {
  it('loads via pickPuzzle and has 5 × 81-char samuraiGivens', async () => {
    const { pickPuzzle } = await import('./index')
    const rec = pickPuzzle('samurai', 'easy', 0)
    expect(rec.variant).toBe('samurai')
    expect(rec.samuraiGivens?.length).toBe(5)
    for (const s of rec.samuraiGivens!) {
      expect(typeof s).toBe('string')
      expect(s.length).toBe(81)
    }
  })

  it('passes samuraiConsistencyCheck when loaded into a samurai board', async () => {
    const { pickPuzzle } = await import('./index')
    const rec = pickPuzzle('samurai', 'easy', 0)
    expect(() => freshSamuraiBoardFromGivensForTest(rec.samuraiGivens!)).not.toThrow()
  })
})
```

- [ ] **Step 2: Create a tiny test helper `src/puzzles/samurai-test-helpers.ts`**

This avoids importing the private `freshSamuraiBoardFromGivens` from `gameStore.ts`; we just call the engine helpers directly.

```ts
import {
  createSamuraiBoard,
  parsePuzzle,
  samuraiConsistencyCheck,
} from '@/engine'

export function freshSamuraiBoardFromGivensForTest(
  samuraiGivens: ReadonlyArray<string>,
): void {
  if (samuraiGivens.length !== 5) {
    throw new Error(`expected 5 sub-grid givens, got ${samuraiGivens.length}`)
  }
  const board = createSamuraiBoard()
  for (let g = 0; g < 5; g++) {
    const parsed = parsePuzzle(samuraiGivens[g]!, board.grids[g]!.shape)
    for (let r = 0; r < parsed.shape.size; r++) {
      for (let c = 0; c < parsed.shape.size; c++) {
        const src = parsed.cells[r]![c]!
        const dst = board.grids[g]!.cells[r]![c]!
        dst.value = src.value
        dst.given = src.given
        dst.candidates = new Set(src.candidates)
      }
    }
  }
  samuraiConsistencyCheck(board)
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun run test:run src/puzzles/samurai.test.ts`
Expected: FAIL — `no bank found for samurai/easy`.

- [ ] **Step 4: Create `src/puzzles/samurai/easy.json`**

Each string below is exactly 81 chars: 40 zeros + 1 digit + 40 zeros.

```json
[
  {
    "id": "samurai-demo-001",
    "variant": "samurai",
    "size": 9,
    "givens": "",
    "samuraiGivens": [
      "000000000000000000000000000000000000000050000000000000000000000000000000000000000",
      "000000000000000000000000000000000000000010000000000000000000000000000000000000000",
      "000000000000000000000000000000000000000020000000000000000000000000000000000000000",
      "000000000000000000000000000000000000000030000000000000000000000000000000000000000",
      "000000000000000000000000000000000000000040000000000000000000000000000000000000000"
    ],
    "difficulty": "easy",
    "se": 1.0,
    "hardestTier": 0,
    "steps": 0,
    "generatedAt": "2026-05-20T00:00:00Z"
  }
]
```

**CRITICAL: verify each string is exactly 81 chars.** Each string above must be `'0' * 40 + digit + '0' * 40`. Before saving, paste each string into a 1-liner sanity check:

```bash
node -e "['000000000000000000000000000000000000000050000000000000000000000000000000000000000','000000000000000000000000000000000000000010000000000000000000000000000000000000000','000000000000000000000000000000000000000020000000000000000000000000000000000000000','000000000000000000000000000000000000000030000000000000000000000000000000000000000','000000000000000000000000000000000000000040000000000000000000000000000000000000000'].forEach((s,i)=>console.log(i,s.length,'pos40='+s[40]))"
```

Expected: each prints `length 81 pos40=<digit>`. The digit at index 40 (row 4, col 4) must be 5, 1, 2, 3, 4 in that order. If any string prints length other than 81, regenerate with `('0'.repeat(40) + d + '0'.repeat(40))` for digit `d` and replace the JSON entry.

Authoritative recipe: **40 zeros + single digit + 40 zeros = 81 chars total**. The digit lands at index 40 (row 4 × 9 + col 4 = 40).

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun run test:run src/puzzles/samurai.test.ts`
Expected: PASS — bank loads, all 5 strings length 81, consistency check OK.

- [ ] **Step 6: Verify the build still succeeds**

Run: `bun run build`
Expected: build completes with no errors; samurai bank reachable.

- [ ] **Step 7: Commit**

```bash
git add src/puzzles/samurai/easy.json src/puzzles/samurai.test.ts src/puzzles/samurai-test-helpers.ts
git commit -m "feat(puzzles): hand-crafted samurai demo bank

One record at samurai/easy with a single given per sub-grid placed at
(4,4) — the dead-middle, never-shared cell. Passes samuraiConsistencyCheck
trivially. Replaced by real banks in 17c."
```

---

## Task 6: `SamuraiBoardView` component

The cruciform renderer. Outer `<svg>` with `viewBox="0 0 ${21*CELL_SIZE} ${21*CELL_SIZE}"`. For each sub-grid, computes view-state via `samuraiSharedLocations` + classic peers, wraps a positioned `<g transform="translate(...)">` around a `BoardCellsLayer`. Paint order: corners 1–4 first, center last (so the center's box lines visually own the overlap).

**Files:**
- Create: `src/ui/board/SamuraiBoardView.tsx`
- Create: `src/ui/board/SamuraiBoardView.test.tsx`

- [ ] **Step 1: Write the failing test `src/ui/board/SamuraiBoardView.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SamuraiBoardView } from './SamuraiBoardView'
import { createSamuraiBoard, setValueShared } from '@/engine'

describe('SamuraiBoardView', () => {
  it('renders 5 sub-grid groups', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`samurai-subgrid-${i}`)).toBeInTheDocument()
    }
  })

  it('renders 5 × 81 = 405 gridcells', () => {
    const board = createSamuraiBoard()
    const { container } = render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(405)
  })

  it('sets outer SVG viewBox to 0 0 630 630 (21 × 30)', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    const svg = screen.getByTestId('samurai-board')
    expect(svg.getAttribute('viewBox')).toBe('0 0 630 630')
  })

  it('selecting a shared cell highlights it in BOTH the center and the NW corner', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView
        board={board}
        selected={{ gridIdx: 0, coord: { r: 1, c: 1 } }}
        onSelect={() => {}}
      />,
    )
    const center = screen
      .getByTestId('samurai-subgrid-0')
      .querySelector('[data-testid="cell-1-1"]')
    const nw = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-7"]')
    expect(center?.getAttribute('data-selected')).toBe('true')
    expect(nw?.getAttribute('data-selected')).toBe('true')
  })

  it('selecting an unshared cell highlights only that sub-grid', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView
        board={board}
        selected={{ gridIdx: 2, coord: { r: 5, c: 5 } }}
        onSelect={() => {}}
      />,
    )
    const ne = screen
      .getByTestId('samurai-subgrid-2')
      .querySelector('[data-testid="cell-5-5"]')
    expect(ne?.getAttribute('data-selected')).toBe('true')
    for (const otherIdx of [0, 1, 3, 4]) {
      const other = screen
        .getByTestId(`samurai-subgrid-${otherIdx}`)
        .querySelectorAll('[data-selected="true"]')
      expect(other.length).toBe(0)
    }
  })

  it('onSelect fires { gridIdx, coord } on NW corner tap', async () => {
    const board = createSamuraiBoard()
    const onSelect = vi.fn()
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={onSelect} />,
    )
    const nwCell = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-7"]')!
    const user = userEvent.setup()
    await user.click(nwCell)
    expect(onSelect).toHaveBeenCalledWith({
      gridIdx: 1,
      coord: { r: 7, c: 7 },
    })
  })

  it('peer highlight extends across the overlap when selection is shared', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView
        board={board}
        selected={{ gridIdx: 0, coord: { r: 1, c: 1 } }}
        onSelect={() => {}}
      />,
    )
    // Cells in center's row 1 (peers via classic) should NOT all be in NW.
    // But NW corner's (7,7) is the same global cell so NW should have its own
    // peer set lighting up rows/cols around (7,7).
    const nwPeerSample = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-5"]')
    // Cell.tsx peer fill is rgba(255,255,255,0.03); the rect's fill attribute
    // tells us whether peer-highlight is active.
    const rect = nwPeerSample?.querySelector('rect')
    expect(rect?.getAttribute('fill')).toBe('rgba(255, 255, 255, 0.03)')
  })

  it('reflects samuraiConflicts in both center and corner for a shared duplicate', () => {
    const board = createSamuraiBoard()
    // Place 5 at center (1,1) — propagates to NW (7,7) — and another 5 at
    // center (1,5) (same row). samuraiConflicts now includes 0,1,1 and 0,1,5.
    setValueShared(board, 0, { r: 1, c: 1 }, 5)
    setValueShared(board, 0, { r: 1, c: 5 }, 5)
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    const centerConflict = screen
      .getByTestId('samurai-subgrid-0')
      .querySelector('[data-testid="cell-1-1"]')
    const nwConflict = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-7"]')
    expect(centerConflict?.getAttribute('data-conflict')).toBe('true')
    expect(nwConflict?.getAttribute('data-conflict')).toBe('true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:run src/ui/board/SamuraiBoardView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/ui/board/SamuraiBoardView.tsx`**

```tsx
import { useMemo } from 'react'
import { BoardCellsLayer } from './BoardCellsLayer'
import type { Coord, Digit, SamuraiBoard } from '@/engine'
import {
  peersFromConstraints,
  samuraiCellAt,
  samuraiConflicts,
  samuraiSharedLocations,
} from '@/engine'

export interface SamuraiBoardViewProps {
  readonly board: SamuraiBoard
  readonly selected: { readonly gridIdx: number; readonly coord: Coord } | null
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly onSelect: (target: {
    readonly gridIdx: number
    readonly coord: Coord
  }) => void
}

const CELL_SIZE = 30
// SVG convention: x = column offset (rightward), y = row offset (downward).
// idx 0 = center, 1 = NW, 2 = NE, 3 = SW, 4 = SE.
const SUB_GRID_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 6, y: 6 },
  1: { x: 0, y: 0 },   // top-left
  2: { x: 12, y: 0 },  // top-right
  3: { x: 0, y: 12 },  // bottom-left
  4: { x: 12, y: 12 }, // bottom-right
}
const SIDE_PX = 21 * CELL_SIZE

interface SubGridState {
  readonly selectedCoord: Coord | null
  readonly selectedValue: Digit | null
  readonly peerSet: ReadonlySet<string>
  readonly conflictSet: ReadonlySet<string>
}

function computeSubGridState(
  board: SamuraiBoard,
  gridIdx: number,
  selected: { gridIdx: number; coord: Coord } | null,
  globalConflicts: ReadonlySet<string>,
): SubGridState {
  let selectedCoord: Coord | null = null
  let selectedValue: Digit | null = null
  if (selected) {
    const locs = samuraiSharedLocations(board, selected.gridIdx, selected.coord)
    const match = locs.find((l) => l.grid === gridIdx)
    if (match) {
      selectedCoord = match.coord
      selectedValue = samuraiCellAt(board, gridIdx, match.coord).value
    }
  }
  const peerSet = new Set<string>()
  if (selectedCoord) {
    const grid = board.grids[gridIdx]!
    for (const p of peersFromConstraints(selectedCoord, grid)) {
      peerSet.add(`${p.r},${p.c}`)
    }
  }
  const prefix = `${gridIdx},`
  const conflictSet = new Set<string>()
  for (const k of globalConflicts) {
    if (k.startsWith(prefix)) conflictSet.add(k.slice(prefix.length))
  }
  return { selectedCoord, selectedValue, peerSet, conflictSet }
}

// Paint order: corners 1-4 first, center (0) last so the center grid's box
// lines render on top of the overlap regions.
const PAINT_ORDER: ReadonlyArray<number> = [1, 2, 3, 4, 0]

export function SamuraiBoardView({
  board,
  selected,
  lockedCells,
  shakeKey,
  onSelect,
}: SamuraiBoardViewProps) {
  const globalConflicts = useMemo(() => samuraiConflicts(board), [board])

  return (
    <svg
      role="grid"
      aria-label="Samurai board"
      data-testid="samurai-board"
      viewBox={`0 0 ${SIDE_PX} ${SIDE_PX}`}
      className="w-full max-w-[min(92vh,720px)] aspect-square select-none"
    >
      <rect x={0} y={0} width={SIDE_PX} height={SIDE_PX} fill="var(--color-surface)" />
      {PAINT_ORDER.map((gridIdx) => {
        const pos = SUB_GRID_POSITIONS[gridIdx]!
        const state = computeSubGridState(board, gridIdx, selected, globalConflicts)
        return (
          <g
            key={gridIdx}
            data-testid={`samurai-subgrid-${gridIdx}`}
            transform={`translate(${pos.x * CELL_SIZE}, ${pos.y * CELL_SIZE})`}
          >
            <BoardCellsLayer
              grid={board.grids[gridIdx]!}
              cellSize={CELL_SIZE}
              selectedCoord={state.selectedCoord}
              selectedValue={state.selectedValue}
              peerSet={state.peerSet}
              conflictSet={state.conflictSet}
              {...(lockedCells !== undefined ? { lockedCells } : {})}
              {...(shakeKey !== undefined ? { shakeKey } : {})}
              onSelect={(coord) => onSelect({ gridIdx, coord })}
            />
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:run src/ui/board/SamuraiBoardView.test.tsx`
Expected: PASS — all 8 cases.

- [ ] **Step 5: Run typecheck + the full UI suite**

Run: `bun run typecheck && bun run test:run src/ui`
Expected: typecheck clean; suite all green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/board/SamuraiBoardView.tsx src/ui/board/SamuraiBoardView.test.tsx
git commit -m "feat(ui): add SamuraiBoardView cruciform renderer

Outer 630×630 SVG; 5 BoardCellsLayer instances positioned via translate.
Per-sub-grid view-state derived from samuraiSharedLocations and classic
peers. Corners paint first; center paints last for clean overlap lines."
```

---

## Task 7: Play.tsx — variant label + render dispatch + orientation

Adds the samurai label, dispatches on `state.board.kind`, and shows `RotateDevicePrompt` when portrait. Existing classic flow untouched. This task wires the visual pieces. Puzzle load (passing `samuraiGivens`) and layout switch ship in Task 8.

**Files:**
- Modify: `src/ui/pages/Play.tsx`

- [ ] **Step 1: Open `src/ui/pages/Play.tsx` and confirm the current state**

The relevant sections (per the current file) to modify are:
- The `VARIANT_LABELS` map (around line 25–48).
- The imports (line 1–13).
- The `selected` derivation (line 58–59).
- The board-render block in the `return (...)` (around line 273–288).

- [ ] **Step 2: Add imports for the new components**

Inside the existing import block at the top of `src/ui/pages/Play.tsx`, add three new imports right after the existing `import { Board } from '@/ui/board/Board'` line:

```tsx
import { SamuraiBoardView } from '@/ui/board/SamuraiBoardView'
import { RotateDevicePrompt } from '@/ui/board/RotateDevicePrompt'
import { useIsPortraitOrientation } from '@/ui/hooks/useIsPortraitOrientation'
```

- [ ] **Step 3: Add `samurai` to `VARIANT_LABELS`**

In the `VARIANT_LABELS` object (currently ending after `'german-whispers': 'German Whispers',`), add a new entry as the LAST line of the object literal (before the closing `}`):

```ts
  samurai: 'Samurai',
```

The full final entry sequence becomes:

```ts
  'german-whispers': 'German Whispers',
  samurai: 'Samurai',
}
```

- [ ] **Step 4: Add board.kind dispatch in the render block**

Find the block in the `return (...)` that currently renders `<Board grid={grid} ... />` (around line 273). Just above it, add:

```tsx
const boardState = useGameStore((s) => s.board)
const isPortrait = useIsPortraitOrientation()
```

Wait — hooks can't be added inside JSX. Instead, add these TWO lines near the top of the `Play()` function, right after the existing `const paths = useGameStore((s) => s.paths)` line:

```tsx
  const boardState = useGameStore((s) => s.board)
  const isPortrait = useIsPortraitOrientation()
```

Then in the JSX `return (...)`, REPLACE the existing `<Board ... />` block with:

```tsx
      {boardState?.kind === 'samurai' ? (
        isPortrait ? (
          <RotateDevicePrompt />
        ) : (
          <SamuraiBoardView
            board={boardState.board}
            selected={
              selectedRaw && 'gridIdx' in selectedRaw ? selectedRaw : null
            }
            {...(lockedCells !== undefined ? { lockedCells } : {})}
            shakeKey={shakeKey}
            onSelect={(target) => select(target)}
          />
        )
      ) : (
        <Board
          grid={grid}
          selected={selected}
          variant={variant}
          lockedCells={lockedCells}
          shakeKey={shakeKey}
          {...(jigsawPieceMap ? { jigsawPieceMap } : {})}
          {...(parityMask ? { parityMask } : {})}
          {...(edges ? { edges } : {})}
          {...(thermometers ? { thermometers } : {})}
          {...(arrows ? { arrows } : {})}
          {...(cages ? { cages } : {})}
          {...(outsideClues ? { outsideClues } : {})}
          {...(variantPaths ? { paths: variantPaths } : {})}
          onSelect={select}
        />
      )}
```

The classic branch is exactly what was there before; the samurai branch is new.

- [ ] **Step 5: Guard the early `!grid` return so samurai (which has no `grid`) still mounts**

The current early-return is:

```tsx
  if (!grid) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading…</p>
      </main>
    )
  }
```

Replace with a version that also allows samurai:

```tsx
  if (!grid && boardState?.kind !== 'samurai') {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading…</p>
      </main>
    )
  }
```

This ensures the loading state only fires before any board is loaded — once a samurai board exists, the page mounts even though `selectGrid(state)` returns null.

- [ ] **Step 6: Adjust `gridSize` for samurai (used by digitFromGlyph guard)**

The line `const gridSize = grid?.shape.size ?? 9` needs to fall back to 9 for samurai (since samurai uses 9×9 sub-grids). No change needed — `??` already returns 9 when `grid` is null.

- [ ] **Step 7: Adjust `<InputPad ... size={...} />` for samurai**

The current line is `<InputPad mode={mode} size={grid.shape.size} ... />`. After Task 7 the early return is gated so `grid` may be `null` when board.kind === 'samurai'. Update to:

```tsx
<InputPad
  mode={mode}
  size={grid?.shape.size ?? 9}
  disabled={completedAt !== null}
  onDigit={input}
  onErase={erase}
  onModeChange={setMode}
/>
```

- [ ] **Step 8: Run typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 9: Run the existing Play tests + UI suite**

Run: `bun run test:run src/ui`
Expected: PASS — existing Play tests untouched; new components mount.

- [ ] **Step 10: Commit**

```bash
git add src/ui/pages/Play.tsx
git commit -m "feat(ui): wire samurai render dispatch + orientation lock in Play

VARIANT_LABELS gets a 'samurai' entry. The render block dispatches on
board.kind: classic stays as before; samurai shows RotateDevicePrompt
in portrait and SamuraiBoardView in landscape. Loading guard is
relaxed so samurai mounts even though selectGrid is null."
```

---

## Task 8: Play.tsx — load samuraiGivens + landscape InputPad layout

Two final wiring steps: extract `samuraiGivens` from the picked record and pass it into `loadPuzzle`, and switch the outer container to `lg:flex-row` when the variant is samurai so the pad sits to the right of the cruciform in landscape.

**Files:**
- Modify: `src/ui/pages/Play.tsx`
- Create: `src/ui/pages/Play.samurai.test.tsx`

- [ ] **Step 1: Write the failing integration test `src/ui/pages/Play.samurai.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Play } from './Play'
import { useGameStore } from '@/state/gameStore'

function mountAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play" element={<Play />} />
      </Routes>
    </MemoryRouter>,
  )
}

// Force landscape: matchMedia('(orientation: portrait)').matches = false
function mockOrientation(portrait: boolean) {
  const listeners: Array<(ev: MediaQueryListEvent) => void> = []
  ;(window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = vi
    .fn()
    .mockImplementation(() => ({
      matches: portrait,
      addEventListener: (_t: string, cb: (ev: MediaQueryListEvent) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_t: string, cb: (ev: MediaQueryListEvent) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  useGameStore.setState({
    board: null,
    selected: null,
    history: [],
    historyIndex: -1,
    completedAt: null,
    puzzleId: null,
  } as Partial<ReturnType<typeof useGameStore.getState>>)
  mockOrientation(false)
})

describe('Play.tsx — samurai variant', () => {
  it('renders cruciform when /play?variant=samurai&difficulty=easy', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    expect(await screen.findByTestId('samurai-board')).toBeInTheDocument()
    expect(screen.queryByTestId('board')).toBeNull()
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`samurai-subgrid-${i}`)).toBeInTheDocument()
    }
  })

  it('tapping a shared cell selects in both center and NW', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const centerCell = within(screen.getByTestId('samurai-subgrid-0'))
      .getByTestId('cell-1-1')
    await user.click(centerCell)
    expect(centerCell.getAttribute('data-selected')).toBe('true')
    const nwCell = within(screen.getByTestId('samurai-subgrid-1'))
      .getByTestId('cell-7-7')
    expect(nwCell.getAttribute('data-selected')).toBe('true')
  })

  it('keyboard digit places in both shared cells', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const centerCell = within(screen.getByTestId('samurai-subgrid-0'))
      .getByTestId('cell-1-1')
    await user.click(centerCell)
    await user.keyboard('7')
    expect(centerCell.textContent).toMatch(/7/)
    const nwCell = within(screen.getByTestId('samurai-subgrid-1'))
      .getByTestId('cell-7-7')
    expect(nwCell.textContent).toMatch(/7/)
  })

  it('Backspace clears the placement on both sides', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const centerCell = within(screen.getByTestId('samurai-subgrid-0'))
      .getByTestId('cell-1-1')
    await user.click(centerCell)
    await user.keyboard('7')
    await user.keyboard('{Backspace}')
    const nwCell = within(screen.getByTestId('samurai-subgrid-1'))
      .getByTestId('cell-7-7')
    expect(centerCell.textContent).not.toMatch(/7/)
    expect(nwCell.textContent).not.toMatch(/7/)
  })

  it('toolbar label reads "Samurai · Easy"', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    expect(screen.getByText(/Samurai · Easy/)).toBeInTheDocument()
  })

  it('portrait orientation swaps the cruciform for RotateDevicePrompt', async () => {
    mockOrientation(true)
    mountAt('/play?variant=samurai&difficulty=easy')
    expect(await screen.findByTestId('rotate-device-prompt')).toBeInTheDocument()
    expect(screen.queryByTestId('samurai-board')).toBeNull()
  })

  it('classic variant still renders the legacy Board', async () => {
    mountAt('/play?variant=classic&difficulty=easy')
    expect(await screen.findByTestId('board')).toBeInTheDocument()
    expect(screen.queryByTestId('samurai-board')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:run src/ui/pages/Play.samurai.test.tsx`
Expected: FAIL — the puzzle load path doesn't pass `samuraiGivens` yet, so `loadPuzzle` for variant=samurai throws "samurai variant requires samuraiGivens".

- [ ] **Step 3: Modify the puzzle-load path in `src/ui/pages/Play.tsx`**

In the `useEffect` that calls `loadPuzzle` (currently around lines 98–143), add a `samuraiGivens` pass-through. Inside the `loadPuzzle({ ... })` call, append (just before the closing `})` ):

```ts
            ...(next.samuraiGivens
              ? { samuraiGivens: next.samuraiGivens }
              : {}),
```

After this line, the call looks like:

```tsx
loadPuzzle({
  id: next.id,
  variant,
  difficulty,
  givens: next.givens,
  ...(next.regions ? { regions: next.regions } : {}),
  ...(next.parityMask ? { parityMask: next.parityMask } : {}),
  ...(next.edges
    ? { edges: next.edges as ReadonlyArray<EdgeMarkRecord> }
    : {}),
  ...(next.thermometers ? { thermometers: next.thermometers } : {}),
  ...(next.arrows ? { arrows: next.arrows } : {}),
  ...(next.cages ? { cages: next.cages } : {}),
  ...(next.littleKillerClues
    ? { littleKillerClues: next.littleKillerClues }
    : {}),
  ...(next.sandwichClues
    ? { sandwichClues: next.sandwichClues }
    : {}),
  ...(next.skyscraperClues
    ? { skyscraperClues: next.skyscraperClues }
    : {}),
  ...(next.paths ? { paths: next.paths } : {}),
  ...(next.samuraiGivens ? { samuraiGivens: next.samuraiGivens } : {}),
})
```

- [ ] **Step 4: Mirror the same in `handleNew`**

The `handleNew` callback (around line 154–166) also calls `loadPuzzle`. Update it to:

```tsx
const handleNew = useCallback(() => {
  const next = pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
  loadPuzzle({
    id: next.id,
    variant,
    difficulty,
    givens: next.givens,
    ...(next.regions ? { regions: next.regions } : {}),
    ...(next.parityMask ? { parityMask: next.parityMask } : {}),
    ...(next.edges ? { edges: next.edges as never } : {}),
    ...(next.samuraiGivens ? { samuraiGivens: next.samuraiGivens } : {}),
  })
  setParams({ variant, difficulty, puzzleId: next.id }, { replace: true })
}, [variant, difficulty, loadPuzzle, setParams])
```

- [ ] **Step 5: Switch the outer container to flex-row when variant=samurai**

Find the `<main ...>` opening tag (currently around line 261–264):

```tsx
<main
  data-noselect="true"
  className="min-h-dvh flex flex-col items-center px-3 py-4 gap-4"
>
```

Replace with:

```tsx
<main
  data-noselect="true"
  className={
    variant === 'samurai'
      ? 'min-h-dvh flex flex-col items-center px-3 py-4 gap-4 lg:flex-row lg:items-start lg:justify-center'
      : 'min-h-dvh flex flex-col items-center px-3 py-4 gap-4'
  }
>
```

- [ ] **Step 6: Run the integration test**

Run: `bun run test:run src/ui/pages/Play.samurai.test.tsx`
Expected: PASS — 7/7 cases including portrait branch + classic regression.

- [ ] **Step 7: Run the full UI + state suite as a regression sweep**

Run: `bun run test:run src/ui src/state`
Expected: all PASS — Phase 17a state tests + every UI suite still green.

- [ ] **Step 8: Run typecheck + lint + build**

Run: `bun run typecheck && bun run lint && bun run build`
Expected: all three clean.

- [ ] **Step 9: Commit**

```bash
git add src/ui/pages/Play.tsx src/ui/pages/Play.samurai.test.tsx
git commit -m "feat(ui): wire samurai puzzle load + landscape layout in Play

Picked records pass samuraiGivens into loadPuzzle (both useEffect and
handleNew). When variant=samurai, the outer flex container switches to
lg:flex-row so the InputPad sits to the right of the cruciform on iPad
landscape. Integration test covers tap, digit, backspace, label, and
the portrait → RotateDevicePrompt fallback."
```

---

## Task 9: Verification gate + GOTCHAS entry

Final sweep: full test suite, typecheck, lint, build all green. Document Phase 17b gotchas in `docs/GOTCHAS.md`. Manual iPad smoke is performed by the user — flag what to check.

**Files:**
- Modify: `docs/GOTCHAS.md`

- [ ] **Step 1: Run the entire test suite**

Run: `bun run test:run`
Expected: all green. Compare against 17a baseline (368 tests). Expected delta: +~25 new tests (BoardCellsLayer 6, useIsPortraitOrientation 4, RotateDevicePrompt 2, puzzles/samurai 3, SamuraiBoardView 8, Play.samurai 7). Final ≈ 393 tests.

- [ ] **Step 2: Run typecheck, lint, and build**

Run: `bun run typecheck && bun run lint && bun run build`
Expected: all clean.

- [ ] **Step 3: Append a Phase 17b entry to `docs/GOTCHAS.md`**

Append at the bottom of the file (use 2026-05-20 as the date):

```markdown
## 2026-05-20 — Phase 17b cruciform UI

**`BoardCellsLayer` extraction is the one-time DRY win.** `Board.tsx` and `SamuraiBoardView.tsx` now share the inner cell-rendering machinery. The extracted component is pure — it takes derived state (selectedCoord, selectedValue, peerSet, conflictSet) and renders. All derivation stays in the parent. This lets `SamuraiBoardView` compute per-sub-grid view-state from a single global selection without `Board.tsx` having to know anything about samurai.

**Selection state is a discriminated union, the view derives.** Per Phase 17a, `state.selected` is `Coord | {gridIdx, coord} | null`. `Play.tsx` reads `selectedRaw` and narrows in two places: classic gets `Coord | null` via the `'gridIdx' in selectedRaw` guard; samurai gets the wide shape. `SamuraiBoardView` re-narrows per sub-grid via `samuraiSharedLocations`. The duplicate narrowing is intentional — each consumer derives only what it needs.

**Paint order matters for visual cleanliness.** Corners (gridIdx 1–4) paint first; center (0) paints last. The 3×3 overlap regions belong to BOTH a corner box and a center box; without ordering, the corner's heavy box lines would peek through the center's box lines. With this order, the center's heavy lines win, and the cruciform reads as one connected board.

**`CELL_SIZE=30` is a trade-off.** Yields 21×30 = 630 px side, which fits the iPad landscape ~768 px short axis with room for the InputPad. Below Apple's 44 px touch-target guideline. Acceptable for an iPad puzzle UI; revisit only if the iPad smoke uncovers tap accuracy issues. If we bump to 36 px, the board becomes 756 px square — still fits 1024 px landscape but crowds the pad.

**Orientation lock is UI-only, not navigation.** Rotating the iPad doesn't unmount the game; the matchMedia hook toggles which child renders. State (selection, board values, history) survives every rotation. The user can play landscape → rotate to portrait (see prompt) → rotate back → resume from the same cell. Tested in `Play.samurai.test.tsx`.

**Demo fixture uses (4,4) givens only.** The middle-middle cell (r=4, c=4) is in box (1,1) of any 9×9 grid, which never overlaps with another sub-grid (overlaps live in corner boxes (0,0), (0,2), (2,0), (2,2)). One given per sub-grid at (4,4) trivially passes `samuraiConsistencyCheck`. Real banks land in 17c.

**`samuraiConflicts` returns global keys; we slice them per sub-grid.** The engine returns `${gridIdx},${r},${c}`; the view strips the `${gridIdx},` prefix to feed each sub-grid's `BoardCellsLayer`. If we ever want a "global conflict" indicator (e.g., highlighting the entire overlap), that lives at the SamuraiBoardView layer — not in BoardCellsLayer.

**Manual iPad smoke checklist (run on real device before declaring 17b shipped):**
- Open `/play?variant=samurai&difficulty=easy` in iPad Safari.
- Portrait: rotate prompt visible, readable text.
- Landscape: cruciform fills the short axis; InputPad fits to the right.
- Tap a shared cell (e.g. center 1,1 or NW 7,7): both light up.
- Enter a digit via keyboard or pad: both cells show it; classic peers in both sub-grids drop the candidate.
- Pencil-mark on a shared cell: marks appear in both.
- Undo/redo across mixed shared/unshared placements.
- Background Safari, reopen: state restored.
- Rotate during play: prompt appears, rotate back, same selection.
```

- [ ] **Step 4: Commit**

```bash
git add docs/GOTCHAS.md
git commit -m "docs(gotchas): Phase 17b cruciform UI notes"
```

- [ ] **Step 5: Tag the phase**

```bash
git tag phase-17b
```

---

## Self-review checklist (done by the planner, not the implementer)

**Spec coverage** — every section of `docs/superpowers/specs/2026-05-20-phase-17b-samurai-ui-design.md` mapped to a task:
- Renderer architecture (BoardCellsLayer + SamuraiBoardView): Tasks 1 + 6.
- Shared-cell visual (double-render): Task 6 (paint order).
- Orientation strategy (force landscape + RotateDevicePrompt): Tasks 2 + 3 + 7.
- InputPad placement (lg:flex-row): Task 8.
- Shared-cell highlight (both center + corner light up; peer-highlight across overlap): Task 6 test cases.
- Demo fixture: Tasks 4 + 5.
- Acceptance criteria: covered by Task 9.

**Placeholder scan** — no "TBD", "TODO", "fill in", or vague directives. Every step has either complete code or a runnable shell command.

**Type consistency** — `SamuraiBoardViewProps`, `BoardCellsLayerProps`, hook signatures, `samuraiGivens?: ReadonlyArray<string>` field name match across tasks and against the existing `gameStore.ts` shape (`loadPuzzle` already accepts `samuraiGivens` from 17a).

**Test design** — each new file gets its own failing test first; integration test in Task 8 covers the full Play.tsx wiring; regression sweeps in Tasks 1, 6, 8, and 9 catch any UI suite breakage.
