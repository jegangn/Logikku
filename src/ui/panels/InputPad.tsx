import type { Digit } from '@/engine'
import type { InputMode } from '@/state/gameStore'
import { glyphForDigit } from '@/ui/glyph'

export interface InputPadProps {
  readonly mode: InputMode
  readonly disabled?: boolean
  /** Maximum digit to render (defaults to 9). 6 for Mini 6x6. */
  readonly size?: number
  readonly onDigit: (digit: Digit) => void
  readonly onErase: () => void
  readonly onModeChange: (mode: InputMode) => void
}

export function InputPad({
  mode,
  disabled,
  size = 9,
  onDigit,
  onErase,
  onModeChange,
}: InputPadProps) {
  const digits: Digit[] = []
  for (let d = 1; d <= size; d++) digits.push(d as Digit)
  // 6-digit pad: 4 cols (5 buttons + erase fits 2 rows).
  // 9-digit pad: 5 cols (9 buttons + erase across 2 rows).
  // 16-digit pad: 4 cols (4×4 digits + erase on a 5th row).
  const cols =
    size === 6 ? 'grid-cols-4'
    : size === 16 ? 'grid-cols-4'
    : 'grid-cols-5'
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
        className={`grid ${cols} gap-2`}
        role="group"
        aria-label="Digit pad"
      >
        {digits.map((d) => (
          <DigitButton
            key={d}
            digit={d}
            disabled={disabled}
            onClick={() => onDigit(d)}
            largeText={size <= 9}
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
  largeText = true,
}: {
  digit: Digit
  disabled: boolean | undefined
  onClick: () => void
  largeText?: boolean
}) {
  const glyph = glyphForDigit(digit)
  return (
    <button
      type="button"
      data-testid={`digit-${digit}`}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[56px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${largeText ? 'text-2xl' : 'text-xl'} font-semibold tabular-nums hover:bg-[var(--color-surface-2)] disabled:opacity-40 active:scale-[0.97] transition-transform`}
      aria-label={`Digit ${glyph}`}
    >
      {glyph}
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
