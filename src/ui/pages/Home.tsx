import { Link } from 'react-router-dom'
import type { Difficulty } from '@/engine'
import { hasBank } from '@/puzzles'

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
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-5xl font-semibold tracking-tight text-center">
          Logikku
        </h1>
        <p className="mt-2 text-center text-[var(--color-text-muted)]">
          Sudoku, every variant.
        </p>

        <section className="mt-10">
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
      </div>
    </main>
  )
}
