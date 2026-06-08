import { createPortal } from 'react-dom'
import type { Digit } from '@/engine'
import type { InputMode } from '@/state/gameStore'
import { glyphForDigit } from '@/ui/glyph'
import { useT } from '@/i18n'
import {
  useDigitDrag,
  type DigitDragBinding,
  type DragDropTarget,
} from '@/ui/hooks/useDigitDrag'

export interface InputPadProps {
  readonly mode: InputMode
  readonly disabled?: boolean
  /** Maximum digit to render (defaults to 9). 6 for Mini 6x6. */
  readonly size?: number
  readonly onDigit: (digit: Digit) => void
  readonly onErase: () => void
  readonly onModeChange: (mode: InputMode) => void
  /** Optional: enables drag-from-pad-to-board. Called on pointerup after a real drag. */
  readonly onDigitDrop?: (digit: Digit, target: DragDropTarget | null) => void
  /** Optional: notified whenever the cell under the dragged ghost changes. */
  readonly onDragHoverChange?: (cellKey: string | null) => void
}

export function InputPad({
  mode,
  disabled,
  size = 9,
  onDigit,
  onErase,
  onModeChange,
  onDigitDrop,
  onDragHoverChange,
}: InputPadProps) {
  const t = useT()
  const digits: Digit[] = []
  for (let d = 1; d <= size; d++) digits.push(d as Digit)
  // 6-digit pad: 4 cols (5 buttons + erase fits 2 rows).
  // 9-digit pad: 5 cols (9 buttons + erase across 2 rows).
  // 16-digit pad: 4 cols (4×4 digits + erase on a 5th row).
  // Portrait keeps a wide, short pad (few rows) so it never falls below the
  // board fold. In iPad-class landscape (`wide:`) the pad becomes a narrow, tall
  // 3-col column beside the board (calculator-style, large touch).
  const cols =
    size === 16 ? 'grid-cols-4'
    : size === 6 ? 'grid-cols-4 wide:grid-cols-3'
    : 'grid-cols-5 wide:grid-cols-3'

  const dragEnabled = onDigitDrop !== undefined && !disabled
  const drag = useDigitDrag({
    onDrop: (digit, target) => {
      if (onDigitDrop) onDigitDrop(digit, target)
    },
    ...(onDragHoverChange ? { onHoverCellChange: onDragHoverChange } : {}),
  })

  return (
    <div
      data-testid="input-pad"
      className="flex flex-col gap-3 w-full max-w-[var(--play-board-max)] wide:max-w-[22rem]"
      aria-label={t.play.inputPad}
    >
      <div className="flex gap-2 sm:gap-3" role="tablist" aria-label={t.play.inputMode}>
        <ModeButton
          active={mode === 'value'}
          onClick={() => onModeChange('value')}
          ariaLabel={t.play.modeValue}
        >
          {t.play.modeValue}
        </ModeButton>
        <ModeButton
          active={mode === 'pencil'}
          onClick={() => onModeChange('pencil')}
          ariaLabel={t.play.modePencil}
        >
          {t.play.modePencil}
        </ModeButton>
      </div>
      <div
        className={`grid ${cols} gap-2 sm:gap-3`}
        role="group"
        aria-label={t.play.digitPad}
      >
        {digits.map((d) => (
          <DigitButton
            key={d}
            digit={d}
            disabled={disabled}
            onClick={() => onDigit(d)}
            largeText={size <= 9}
            label={t.play.digit(glyphForDigit(d))}
            pencil={mode === 'pencil'}
            dragBinding={dragEnabled ? drag.bind(d) : null}
          />
        ))}
        <button
          type="button"
          data-testid="erase-btn"
          data-sound="erase"
          disabled={disabled}
          onClick={onErase}
          className="min-h-[var(--control-h)] sm:min-h-[var(--control-h-lg)] w-full flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)] disabled:opacity-40 active:scale-[0.96] transition-[transform,background-color,border-color,color] duration-150"
          aria-label={t.play.erase}
        >
          <BackspaceIcon />
        </button>
      </div>
      {dragEnabled && drag.activeDigit !== null && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={drag.ghostRef}
              data-testid="digit-drag-ghost"
              aria-hidden="true"
              className="digit-drag-ghost"
            >
              {glyphForDigit(drag.activeDigit)}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function DigitButton({
  digit,
  disabled,
  onClick,
  largeText = true,
  label,
  pencil,
  dragBinding,
}: {
  digit: Digit
  disabled: boolean | undefined
  onClick: () => void
  largeText?: boolean
  label: string
  pencil: boolean
  dragBinding: DigitDragBinding | null
}) {
  const glyph = glyphForDigit(digit)
  return (
    <button
      type="button"
      data-testid={`digit-${digit}`}
      data-sound={pencil ? 'pencil' : 'place'}
      data-digit={digit}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[var(--control-h)] sm:min-h-[var(--control-h-lg)] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] ${largeText ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'} font-semibold tabular-nums hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] disabled:opacity-40 active:scale-[0.96] transition-[transform,background-color,border-color] duration-150`}
      aria-label={label}
      {...(dragBinding ?? {})}
    >
      {glyph}
    </button>
  )
}

function BackspaceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 5H8.5a1 1 0 0 0-.78.375l-4.4 5.5a1 1 0 0 0 0 1.25l4.4 5.5a1 1 0 0 0 .78.375H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5l5 5M17 9.5l-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ModeButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`min-h-[48px] sm:min-h-[52px] flex-1 rounded-2xl border-2 text-base font-semibold tracking-tight transition-colors duration-150 ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-strong)]'
      }`}
    >
      {children}
    </button>
  )
}
