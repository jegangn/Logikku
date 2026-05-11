import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Difficulty } from '@/engine'
import { hasBank } from '@/puzzles'
import { mostRecentUnfinished, type SavedGame } from '@/storage/db'

const DIFFICULTIES: ReadonlyArray<Difficulty> = [
  'easy',
  'medium',
  'hard',
  'tough',
  'expert',
]

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'very-easy': 'Very Easy',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  tough: 'Tough',
  expert: 'Expert',
  diabolical: 'Diabolical',
}

export function Home() {
  const [continueGame, setContinueGame] = useState<SavedGame | null>(null)

  useEffect(() => {
    void mostRecentUnfinished().then(setContinueGame)
  }, [])

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-semibold tracking-tight text-center">
          Logikku
        </h1>
        <p className="mt-2 text-center text-[var(--color-text-muted)]">
          Sudoku, every variant.
        </p>

        {continueGame && (
          <Link
            to={`/play?variant=${continueGame.variant}&difficulty=${continueGame.difficulty}&puzzleId=${continueGame.id}`}
            data-testid="continue-card"
            className="mt-8 block rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-5 py-4 hover:bg-[var(--color-accent-soft)] active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-accent-strong)] font-medium">
                  Continue
                </div>
                <div className="mt-1 text-base font-medium">
                  {continueGame.variant.charAt(0).toUpperCase() +
                    continueGame.variant.slice(1)}{' '}
                  · {DIFFICULTY_LABELS[continueGame.difficulty]}
                </div>
              </div>
              <span className="text-[var(--color-accent-strong)]">→</span>
            </div>
          </Link>
        )}

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)] mb-3">
            Classic Sudoku
          </h2>
          <div className="grid gap-2">
            {DIFFICULTIES.map((difficulty) =>
              hasBank('classic', difficulty) ? (
                <Link
                  key={difficulty}
                  to={`/play?variant=classic&difficulty=${difficulty}`}
                  data-testid={`difficulty-${difficulty}`}
                  className="block min-h-[56px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 flex items-center justify-between hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-transform"
                >
                  <span className="text-base font-medium">
                    {DIFFICULTY_LABELS[difficulty]}
                  </span>
                  <span className="text-[var(--color-text-faint)]">→</span>
                </Link>
              ) : null,
            )}
          </div>
        </section>

        <nav className="mt-10 flex items-center justify-center gap-6 text-sm text-[var(--color-text-muted)]">
          <Link
            to="/stats"
            data-testid="link-stats"
            className="hover:text-[var(--color-text)]"
          >
            Stats
          </Link>
          <span className="text-[var(--color-text-faint)]">·</span>
          <Link
            to="/settings"
            data-testid="link-settings"
            className="hover:text-[var(--color-text)]"
          >
            Settings
          </Link>
        </nav>
      </div>
    </main>
  )
}
