import type { Digit } from '@/engine'
import type { InputMode } from '@/state/gameStore'

export interface InputPadProps {
  readonly mode: InputMode
  readonly disabled?: boolean
  readonly onDigit: (digit: Digit) => void
  readonly onErase: () => void
  readonly onModeChange: (mode: InputMode) => void
}

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function InputPad({
  mode,
  disabled,
  onDigit,
  onErase,
  onModeChange,
}: InputPadProps) {
  return (
    <div
      data-testid="input-pad"
      className="flex flex-col gap-3 w-full max-w-[min(92vw,640px)]"
      aria-label="Input pad"
    >
      <div className="flex gap-2" role="tablist" aria-label="Input mode">
        <ModeButton
          active={mode === 'value'}
          onClick={() => onModeChange('value')}
        >
          Value
        </ModeButton>
        <ModeButton
          active={mode === 'pencil'}
          onClick={() => onModeChange('pencil')}
        >
          Pencil
        </ModeButton>
      </div>
      <div
        className="grid grid-cols-5 gap-2"
        role="group"
        aria-label="Digit pad"
      >
        {DIGITS.map((d) => (
          <DigitButton
            key={d}
            digit={d}
            disabled={disabled}
            onClick={() => onDigit(d)}
          />
        ))}
        <button
          type="button"
          data-testid="erase-btn"
          disabled={disabled}
          onClick={onErase}
          className="min-h-[56px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] disabled:opacity-40 active:scale-[0.97] transition-transform"
          aria-label="Erase"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}

function DigitButton({
  digit,
  disabled,
  onClick,
}: {
  digit: Digit
  disabled: boolean | undefined
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={`digit-${digit}`}
      disabled={disabled}
      onClick={onClick}
      className="min-h-[56px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-2xl font-semibold tabular-nums hover:bg-[var(--color-surface-2)] disabled:opacity-40 active:scale-[0.97] transition-transform"
      aria-label={`Digit ${digit}`}
    >
      {digit}
    </button>
  )
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-[44px] flex-1 rounded-xl border text-sm font-medium transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
      }`}
    >
      {children}
    </button>
  )
}
