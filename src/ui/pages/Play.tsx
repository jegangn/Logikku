import { useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Board } from '@/ui/board/Board'
import { InputPad } from '@/ui/panels/InputPad'
import { Toolbar } from '@/ui/panels/Toolbar'
import { useGameStore } from '@/state/gameStore'
import { flushSave, tryHydrate, wireGamePersistence } from '@/state/persistence'
import { pickPuzzle } from '@/puzzles'
import type { Difficulty, Digit } from '@/engine'
import type { EdgeMarkRecord } from '@/state/gameStore'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'very-easy': 'Very Easy',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  tough: 'Tough',
  expert: 'Expert',
  diabolical: 'Diabolical',
}

const VARIANT_LABELS: Record<string, string> = {
  classic: 'Classic',
  'x-diagonal': 'X-Sudoku',
  hyper: 'Hyper',
  'anti-knight': 'Anti-Knight',
  'anti-king': 'Anti-King',
  'non-consecutive': 'Non-Consecutive',
  jigsaw: 'Jigsaw',
  'even-odd': 'Even-Odd',
  'mini-6': 'Mini 6×6',
  kropki: 'Kropki',
  xv: 'XV',
  'greater-than': 'Greater Than',
}

export function Play() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const variant = params.get('variant') ?? 'classic'
  const difficulty = (params.get('difficulty') as Difficulty | null) ?? 'easy'
  const puzzleIdParam = params.get('puzzleId')

  const grid = useGameStore((s) => s.grid)
  const selected = useGameStore((s) => s.selected)
  const mode = useGameStore((s) => s.mode)
  const puzzleId = useGameStore((s) => s.puzzleId)
  const historyIndex = useGameStore((s) => s.historyIndex)
  const historyLen = useGameStore((s) => s.history.length)
  const completedAt = useGameStore((s) => s.completedAt)
  const lockedCells = useGameStore((s) => s.lockedCells)
  const shakeKey = useGameStore((s) => s.lastShakeKey)
  const jigsawPieceMap = useGameStore((s) => s.jigsawPieceMap)
  const parityMask = useGameStore((s) => s.parityMask)
  const edges = useGameStore((s) => s.edges)

  const loadPuzzle = useGameStore((s) => s.loadPuzzle)
  const select = useGameStore((s) => s.select)
  const setMode = useGameStore((s) => s.setMode)
  const input = useGameStore((s) => s.input)
  const erase = useGameStore((s) => s.erase)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)

  const hydrationRunRef = useRef<string | null>(null)

  useEffect(() => {
    const cleanup = wireGamePersistence()
    return () => {
      void flushSave()
      cleanup()
    }
  }, [])

  useEffect(() => {
    const target = puzzleIdParam
    const key = `${variant}:${difficulty}:${target ?? 'random'}`
    if (hydrationRunRef.current === key) return
    hydrationRunRef.current = key

    async function go() {
      if (target) {
        const hydrated = await tryHydrate(target)
        if (hydrated) return
      }
      const next = pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
      const hydratedNew = await tryHydrate(next.id)
      if (!hydratedNew) {
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
        })
      }
      if (!target) {
        hydrationRunRef.current = `${variant}:${difficulty}:${next.id}`
        setParams({ variant, difficulty, puzzleId: next.id }, { replace: true })
      }
    }
    void go()
  }, [variant, difficulty, puzzleIdParam, loadPuzzle, setParams])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') pause()
      else resume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [pause, resume])

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
    })
    setParams({ variant, difficulty, puzzleId: next.id }, { replace: true })
  }, [variant, difficulty, loadPuzzle, setParams])

  const moveSelection = useCallback(
    (dr: number, dc: number) => {
      const cur = selected ?? { r: -1, c: -1 }
      const size = grid?.shape.size ?? 9
      const next = {
        r: clamp(cur.r + dr, 0, size - 1),
        c: clamp(cur.c + dc, 0, size - 1),
      }
      select(next)
    },
    [selected, grid, select],
  )

  const gridSize = grid?.shape.size ?? 9
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.target instanceof HTMLInputElement) return
      const mod = ev.metaKey || ev.ctrlKey
      if (mod && (ev.key === 'z' || ev.key === 'Z')) {
        if (ev.shiftKey) redo()
        else undo()
        ev.preventDefault()
        return
      }
      if (mod && (ev.key === 'y' || ev.key === 'Y')) {
        redo()
        ev.preventDefault()
        return
      }
      if (ev.key >= '1' && ev.key <= '9') {
        const digit = Number(ev.key)
        if (digit <= gridSize) {
          input(digit as Digit)
          ev.preventDefault()
          return
        }
      }
      if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === '0') {
        erase()
        ev.preventDefault()
        return
      }
      if (ev.key === 'ArrowUp') moveSelection(-1, 0)
      else if (ev.key === 'ArrowDown') moveSelection(1, 0)
      else if (ev.key === 'ArrowLeft') moveSelection(0, -1)
      else if (ev.key === 'ArrowRight') moveSelection(0, 1)
      else if (ev.key === 'p' || ev.key === 'P') setMode(mode === 'pencil' ? 'value' : 'pencil')
      else return
      ev.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, erase, moveSelection, setMode, mode, undo, redo, gridSize])

  if (!grid) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading…</p>
      </main>
    )
  }

  return (
    <main
      data-noselect="true"
      className="min-h-dvh flex flex-col items-center px-3 py-4 gap-4"
    >
      <Toolbar
        puzzleLabel={`${VARIANT_LABELS[variant] ?? variant} · ${DIFFICULTY_LABELS[difficulty]}`}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < historyLen - 1}
        onNew={handleNew}
        onUndo={undo}
        onRedo={redo}
      />
      <Board
        grid={grid}
        selected={selected}
        variant={variant}
        lockedCells={lockedCells}
        shakeKey={shakeKey}
        {...(jigsawPieceMap ? { jigsawPieceMap } : {})}
        {...(parityMask ? { parityMask } : {})}
        {...(edges ? { edges } : {})}
        onSelect={select}
      />
      <InputPad
        mode={mode}
        size={grid.shape.size}
        disabled={completedAt !== null}
        onDigit={input}
        onErase={erase}
        onModeChange={setMode}
      />
      {completedAt !== null && (
        <p
          data-testid="completed-banner"
          className="text-[var(--color-accent-strong)] font-medium"
        >
          Solved!
        </p>
      )}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-2 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        data-testid="back-home"
      >
        ← Back
      </button>
      <span data-testid="puzzle-id" className="sr-only">
        {puzzleId}
      </span>
    </main>
  )
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
