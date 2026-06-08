import { useT } from '@/i18n'
import { BackButton } from '@/ui/components/BackButton'

export interface ToolbarProps {
  readonly puzzleLabel: string
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly onNew: () => void
  readonly onUndo: () => void
  readonly onRedo: () => void
}

export function Toolbar({
  puzzleLabel,
  canUndo,
  canRedo,
  onNew,
  onUndo,
  onRedo,
}: ToolbarProps) {
  const t = useT()
  return (
    <header
      data-testid="toolbar"
      className="flex items-center justify-between gap-3 w-full max-w-[var(--play-board-max)] wide:max-w-none pb-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <BackButton to="/" testId="back-home" />
        <div className="flex flex-col min-w-0">
          <h1
            data-testid="puzzle-title"
            className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-text)] truncate leading-tight"
          >
            {puzzleLabel}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <IconButton
          testId="undo-btn"
          label={t.play.undo}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          testId="redo-btn"
          label={t.play.redo}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <RedoIcon />
        </IconButton>
        <button
          type="button"
          data-testid="new-btn"
          onClick={onNew}
          className="min-h-[44px] sm:min-h-[var(--control-h)] px-4 sm:px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm sm:text-base font-semibold hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] active:scale-[0.97] transition-[transform,background-color,border-color] duration-150"
          aria-label={t.play.newPuzzle}
        >
          {t.play.new}
        </button>
      </div>
    </header>
  )
}

function IconButton({
  testId,
  label,
  disabled,
  onClick,
  children,
}: {
  testId: string
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)] disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.95] transition-[transform,background-color,border-color,color] duration-150"
    >
      {children}
    </button>
  )
}

function UndoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 14L4 9L9 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9H14C17.866 9 21 12.134 21 16V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 14L20 9L15 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9H10C6.13401 9 3 12.134 3 16V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
