import { useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Board } from '@/ui/board/Board'
import { InputPad } from '@/ui/panels/InputPad'
import { Toolbar } from '@/ui/panels/Toolbar'
import { useGameStore } from '@/state/gameStore'
import { pickPuzzle } from '@/puzzles'
import type { Difficulty, Digit } from '@/engine'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'very-easy': 'Very Easy',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  tough: 'Tough',
  expert: 'Expert',
  diabolical: 'Diabolical',
}

export function Play() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const variant = params.get('variant') ?? 'classic'
  const difficulty = (params.get('difficulty') as Difficulty | null) ?? 'easy'

  const grid = useGameStore((s) => s.grid)
  const selected = useGameStore((s) => s.selected)
  const mode = useGameStore((s) => s.mode)
  const puzzleId = useGameStore((s) => s.puzzleId)
  const loadPuzzle = useGameStore((s) => s.loadPuzzle)
  const select = useGameStore((s) => s.select)
  const setMode = useGameStore((s) => s.setMode)
  const input = useGameStore((s) => s.input)
  const erase = useGameStore((s) => s.erase)

  useEffect(() => {
    const puzzle = pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
    loadPuzzle(puzzle.id, puzzle.givens)
  }, [variant, difficulty, loadPuzzle])

  const handleNew = useCallback(() => {
    const puzzle = pickPuzzle(variant, difficulty, Math.floor(Math.random() * 100000))
    loadPuzzle(puzzle.id, puzzle.givens)
  }, [variant, difficulty, loadPuzzle])

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

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.target instanceof HTMLInputElement) return
      if (ev.key >= '1' && ev.key <= '9') {
        input(Number(ev.key) as Digit)
        ev.preventDefault()
        return
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
  }, [input, erase, moveSelection, setMode, mode])

  if (!grid) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col items-center px-3 py-4 gap-4">
      <Toolbar
        puzzleLabel={`Classic · ${DIFFICULTY_LABELS[difficulty]}`}
        onNew={handleNew}
      />
      <Board grid={grid} selected={selected} onSelect={select} />
      <InputPad
        mode={mode}
        onDigit={input}
        onErase={erase}
        onModeChange={setMode}
      />
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
