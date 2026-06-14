import { useGameStore } from '@/state/gameStore'
import { useElapsedTime, formatClock } from '@/ui/hooks/useElapsedTime'
import { useT } from '@/i18n'

export function StatusRow({ difficultyLabel }: { difficultyLabel: string }) {
  const t = useT()
  const mistakes = useGameStore((s) => s.mistakes)
  const maxMistakes = useGameStore((s) => s.maxMistakes)
  const paused = useGameStore((s) => s.paused)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)
  const ms = useElapsedTime()
  return (
    <div
      data-testid="status-row"
      className="flex items-center justify-between w-full max-w-[var(--play-board-max)] wide:max-w-none px-1 pb-2 text-[15px] text-[var(--color-text-muted)]"
    >
      <span data-testid="status-difficulty">{difficultyLabel}</span>
      <span data-testid="status-mistakes">
        {t.play.mistakes}:{' '}
        <span className={mistakes > 0 ? 'text-[var(--color-conflict)] font-medium' : ''}>{mistakes}</span>
        /{maxMistakes}
      </span>
      <button
        type="button"
        data-testid="pause-btn"
        data-sound="tap"
        onClick={() => (paused ? resume() : pause())}
        aria-label={paused ? t.play.resume : t.play.pause}
        className="inline-flex items-center gap-1.5 touch-target-sm rounded-lg px-2 hover:bg-[var(--color-surface-2)] active:scale-[0.97] transition-[transform,background-color]"
      >
        <span className="tabular-nums">{formatClock(ms)}</span>
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
