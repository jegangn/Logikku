import { useT } from '@/i18n'

export function OutOfTries({ onRetry, onNew }: { onRetry: () => void; onNew: () => void }) {
  const t = useT()
  return (
    <div
      data-testid="out-of-tries"
      className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-[var(--color-bg)]/90 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-xs rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 text-center">
        <p className="text-lg text-[var(--color-text)]">{t.play.outOfTries}</p>
        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            data-testid="retry-btn"
            data-sound="tap"
            onClick={onRetry}
            className="min-h-[52px] rounded-2xl bg-[var(--color-accent-button)] px-5 text-base font-semibold text-white active:scale-[0.98] transition-transform"
          >
            {t.play.tryAgain}
          </button>
          <button
            type="button"
            data-testid="oot-new-btn"
            data-sound="tap"
            onClick={onNew}
            className="min-h-[52px] rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 text-base font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-2)] active:scale-[0.98] transition-transform"
          >
            {t.play.newPuzzle}
          </button>
        </div>
      </div>
    </div>
  )
}
