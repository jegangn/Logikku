import type { Difficulty } from '@/engine'
import { hasBank } from '@/puzzles'
import { t } from '@/i18n/en'
import type { VariantKind } from '@/ui/variantCatalog'

const BAND_ORDER: ReadonlyArray<Difficulty> = [
  'very-easy', 'easy', 'medium', 'hard', 'tough', 'expert', 'diabolical',
]

interface DifficultyPickerProps {
  readonly variant: VariantKind
  readonly onPick: (difficulty: Difficulty) => void
}

export function DifficultyPicker({ variant, onPick }: DifficultyPickerProps) {
  const present = BAND_ORDER.filter((b) => hasBank(variant, b))
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {present.map((band) => (
        <button
          key={band}
          type="button"
          data-testid={`difficulty-${band}`}
          onClick={() => onPick(band)}
          className="min-h-[48px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-transform"
        >
          {t.difficulty[band]}
        </button>
      ))}
    </div>
  )
}
