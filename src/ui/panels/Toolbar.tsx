export interface ToolbarProps {
  readonly puzzleLabel: string
  readonly onNew: () => void
}

export function Toolbar({ puzzleLabel, onNew }: ToolbarProps) {
  return (
    <header
      data-testid="toolbar"
      className="flex items-center justify-between gap-3 w-full max-w-[min(92vw,640px)] pb-2"
    >
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Logikku</h1>
        <span className="text-sm text-[var(--color-text-muted)]">
          {puzzleLabel}
        </span>
      </div>
      <button
        type="button"
        data-testid="new-btn"
        onClick={onNew}
        className="min-h-[44px] px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium hover:bg-[var(--color-surface-2)] active:scale-[0.97] transition-transform"
        aria-label="New puzzle"
      >
        New
      </button>
    </header>
  )
}
