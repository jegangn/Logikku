import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Board } from '@/ui/board/Board'
import { SamuraiBoardView } from '@/ui/board/SamuraiBoardView'
import { RotateDevicePrompt } from '@/ui/board/RotateDevicePrompt'
import { useIsPortraitOrientation } from '@/ui/hooks/useIsPortraitOrientation'
import { InputPad } from '@/ui/panels/InputPad'
import { Toolbar } from '@/ui/panels/Toolbar'
import { selectGrid, useGameStore } from '@/state/gameStore'
import { flushSave, tryHydrate, wireGamePersistence } from '@/state/persistence'
import { pickPuzzle } from '@/puzzles'
import type { Coord, Difficulty, Digit } from '@/engine'
import { digitFromGlyph } from '@/ui/glyph'
import type { EdgeMarkRecord } from '@/state/gameStore'
import type { OutsideClueDisplay } from '@/ui/board/overlays/OutsideClueOverlay'
import type { VariantPath } from '@/ui/board/overlays/PathOverlay'
import { useT } from '@/i18n'
import { isVariantKind } from '@/ui/variantCatalog'
import { playSound } from '@/audio/sound'

export function Play() {
  const t = useT()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const variant = params.get('variant') ?? 'classic'
  const difficulty = (params.get('difficulty') as Difficulty | null) ?? 'easy'
  const puzzleIdParam = params.get('puzzleId')

  const grid = useGameStore((s) => selectGrid(s))
  const selectedRaw = useGameStore((s) => s.selected)
  const selected = selectedRaw && !('gridIdx' in selectedRaw) ? selectedRaw : null
  const mode = useGameStore((s) => s.mode)
  const puzzleId = useGameStore((s) => s.puzzleId)
  const historyIndex = useGameStore((s) => s.historyIndex)
  const historyLen = useGameStore((s) => s.history.length)
  const completedAt = useGameStore((s) => s.completedAt)
  const elapsedMs = useGameStore((s) => s.elapsedMs)
  const resumeAt = useGameStore((s) => s.resumeAt)
  const paused = useGameStore((s) => s.paused)
  const lockedCells = useGameStore((s) => s.lockedCells)
  const shakeKey = useGameStore((s) => s.lastShakeKey)
  const rejectFlashCell = useGameStore((s) => s.rejectFlashCell)
  const rejectFlashKey = useGameStore((s) => s.rejectFlashKey)
  const jigsawPieceMap = useGameStore((s) => s.jigsawPieceMap)
  const parityMask = useGameStore((s) => s.parityMask)
  const edges = useGameStore((s) => s.edges)
  const thermometers = useGameStore((s) => s.thermometers)
  const arrows = useGameStore((s) => s.arrows)
  const cages = useGameStore((s) => s.cages)
  const littleKillerClues = useGameStore((s) => s.littleKillerClues)
  const sandwichClues = useGameStore((s) => s.sandwichClues)
  const skyscraperClues = useGameStore((s) => s.skyscraperClues)
  const paths = useGameStore((s) => s.paths)
  const boardState = useGameStore((s) => s.board)
  const isPortrait = useIsPortraitOrientation()

  const loadPuzzle = useGameStore((s) => s.loadPuzzle)
  const select = useGameStore((s) => s.select)
  const setMode = useGameStore((s) => s.setMode)
  const input = useGameStore((s) => s.input)
  const erase = useGameStore((s) => s.erase)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)
  const flashRejectCell = useGameStore((s) => s.flashRejectCell)

  const [dragHoverCell, setDragHoverCell] = useState<string | null>(null)

  const handleDigitDrop = useCallback(
    (
      digit: Digit,
      target: { coord: Coord; locked: boolean; given: boolean } | null,
    ) => {
      if (!target) return
      if (target.given || target.locked) {
        flashRejectCell(target.coord)
        return
      }
      select(target.coord)
      input(digit)
    },
    [select, input, flashRejectCell],
  )

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
      const next = await pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
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
    void (async () => {
      const next = await pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
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
        ...(next.sandwichClues ? { sandwichClues: next.sandwichClues } : {}),
        ...(next.skyscraperClues
          ? { skyscraperClues: next.skyscraperClues }
          : {}),
        ...(next.paths ? { paths: next.paths } : {}),
        ...(next.samuraiGivens ? { samuraiGivens: next.samuraiGivens } : {}),
      })
      setParams({ variant, difficulty, puzzleId: next.id }, { replace: true })
    })()
  }, [variant, difficulty, loadPuzzle, setParams])

  const moveSelection = useCallback(
    (dr: number, dc: number) => {
      if (variant === 'samurai') return
      const cur = selected ?? { r: -1, c: -1 }
      const size = grid?.shape.size ?? 9
      const next = {
        r: clamp(cur.r + dr, 0, size - 1),
        c: clamp(cur.c + dc, 0, size - 1),
      }
      select(next)
    },
    [selected, grid, select, variant],
  )

  const gridSize = grid?.shape.size ?? 9
  const outsideClues: ReadonlyArray<OutsideClueDisplay> | undefined = (() => {
    if (variant === 'little-killer' && littleKillerClues) {
      return littleKillerClues.map((c) => ({
        id: c.id,
        side: c.side,
        index: c.index,
        direction: c.direction,
        label: String(c.sum),
      }))
    }
    if (variant === 'sandwich' && sandwichClues) {
      return sandwichClues.map((c) => ({
        id: c.id,
        side: c.side,
        index: c.index,
        label: String(c.sum),
      }))
    }
    if (variant === 'skyscraper' && skyscraperClues) {
      return skyscraperClues.map((c) => ({
        id: c.id,
        side: c.side,
        index: c.index,
        label: String(c.count),
      }))
    }
    return undefined
  })()
  const variantPaths: ReadonlyArray<VariantPath> | undefined =
    paths && paths.length > 0
      ? paths.map((p) => ({ id: p.id, kind: p.kind, cells: p.cells }))
      : undefined
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.target instanceof HTMLInputElement) return
      const mod = ev.metaKey || ev.ctrlKey
      if (mod && (ev.key === 'z' || ev.key === 'Z')) {
        playSound('tap', {})
        if (ev.shiftKey) redo()
        else undo()
        ev.preventDefault()
        return
      }
      if (mod && (ev.key === 'y' || ev.key === 'Y')) {
        playSound('tap', {})
        redo()
        ev.preventDefault()
        return
      }
      const maybeDigit = digitFromGlyph(ev.key)
      if (maybeDigit !== null && maybeDigit <= gridSize) {
        playSound(mode === 'pencil' ? 'pencil' : 'place', { digit: maybeDigit })
        input(maybeDigit)
        ev.preventDefault()
        return
      }
      if (ev.key === 'Backspace' || ev.key === 'Delete' || ev.key === '0') {
        playSound('erase', {})
        erase()
        ev.preventDefault()
        return
      }
      if (ev.key === 'ArrowUp') { playSound('select', {}); moveSelection(-1, 0) }
      else if (ev.key === 'ArrowDown') { playSound('select', {}); moveSelection(1, 0) }
      else if (ev.key === 'ArrowLeft') { playSound('select', {}); moveSelection(0, -1) }
      else if (ev.key === 'ArrowRight') { playSound('select', {}); moveSelection(0, 1) }
      else if (ev.key === 'p' || ev.key === 'P') { playSound('tap', {}); setMode(mode === 'pencil' ? 'value' : 'pencil') }
      else return
      ev.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [input, erase, moveSelection, setMode, mode, undo, redo, gridSize])

  const solveMs =
    completedAt === null
      ? 0
      : paused || resumeAt === null
        ? elapsedMs
        : elapsedMs + (Date.parse(completedAt) - resumeAt)

  if (!grid && boardState?.kind !== 'samurai') {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-6 pad-board">
        <div
          data-testid="play-loading"
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-6"
        >
          <div
            aria-hidden="true"
            className="grid grid-cols-3 grid-rows-3 gap-[3px] size-40 rounded-lg border border-[var(--color-board-frame)] p-[3px]"
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ animationDelay: `${((i % 3) + Math.floor(i / 3)) * 90}ms` }}
              />
            ))}
          </div>
          <p className="text-[15px] text-[var(--color-text-muted)]">{t.play.loading}</p>
        </div>
      </main>
    )
  }

  return (
    <main
      data-noselect="true"
      className="min-h-dvh flex flex-col items-center justify-start pad-board gap-4 wide:flex-row wide:flex-wrap wide:items-start wide:justify-center wide:gap-6"
    >
      <Toolbar
        puzzleLabel={`${isVariantKind(variant) ? t.catalog[variant].name : variant} · ${t.difficulty[difficulty]}`}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < historyLen - 1}
        onNew={handleNew}
        onUndo={undo}
        onRedo={redo}
      />

      <div
        data-testid="play-board-col"
        className="flex w-full justify-center wide:w-auto wide:flex-1 wide:justify-end wide:self-start"
      >
        {boardState?.kind === 'samurai' ? (
          isPortrait ? (
            <RotateDevicePrompt />
          ) : (
            <SamuraiBoardView
              board={boardState.board}
              selected={
                selectedRaw && 'gridIdx' in selectedRaw ? selectedRaw : null
              }
              lockedCells={lockedCells}
              shakeKey={shakeKey}
              onSelect={(target) => select(target)}
            />
          )
        ) : (
          <Board
            grid={grid!}
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
            dragHoverCell={dragHoverCell}
            rejectFlashCell={rejectFlashCell}
            rejectFlashKey={rejectFlashKey}
            onSelect={select}
          />
        )}
      </div>

      <div
        data-testid="play-controls-col"
        className="flex w-full flex-col items-center gap-4 wide:w-[var(--play-controls-w)] wide:max-w-[var(--play-controls-w)] wide:self-start"
      >
        <InputPad
          mode={mode}
          size={grid?.shape.size ?? 9}
          disabled={completedAt !== null}
          onDigit={input}
          onErase={erase}
          onModeChange={setMode}
          onDigitDrop={handleDigitDrop}
          onDragHoverChange={setDragHoverCell}
        />
        {completedAt !== null && (
          <div
            data-testid="completed-banner"
            role="status"
            aria-live="polite"
            className="w-full max-w-[var(--play-board-max)] wide:max-w-full rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-soft)] px-6 py-6 text-center"
          >
            <div className="text-[28px] font-semibold text-[var(--color-success)]">
              {t.play.solved}
            </div>
            <div className="mt-2 text-[15px] text-[var(--color-text-muted)]">
              {t.play.yourTime} ·{' '}
              <span className="tabular-nums font-medium text-[var(--color-text)]">
                {formatMs(solveMs)}
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                data-testid="next-puzzle-btn"
                onClick={handleNew}
                className="min-h-[52px] rounded-2xl bg-[var(--color-accent-button)] px-6 text-base font-semibold text-white active:scale-[0.98] transition-transform"
              >
                {t.play.nextPuzzle}
              </button>
              <button
                type="button"
                data-testid="back-to-menu-btn"
                onClick={() => navigate('/')}
                className="min-h-[52px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-base font-medium hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] active:scale-[0.98] transition-transform"
              >
                {t.play.backToMenu}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden portrait:block w-full flex-1" aria-hidden="true" />

      <span data-testid="puzzle-id" className="sr-only">
        {puzzleId}
      </span>
    </main>
  )
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}
