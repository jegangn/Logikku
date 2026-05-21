import { Link } from 'react-router-dom'
import { VariantThumbnail } from './VariantThumbnail'
import { t } from '@/i18n/en'
import type { VariantKind } from '@/ui/variantCatalog'

interface VariantCardProps {
  readonly kind: VariantKind
  readonly disabled?: boolean
}

export function VariantCard({ kind, disabled = false }: VariantCardProps) {
  const meta = t.catalog[kind]
  const inner = (
    <>
      <VariantThumbnail kind={kind} className="size-16" />
      <div className="mt-2 text-base font-medium text-center">{meta.name}</div>
      <div className="mt-1 text-xs text-center text-[var(--color-text-muted)] leading-snug">
        {meta.description}
      </div>
    </>
  )

  const sharedClasses =
    'flex flex-col items-center justify-start min-h-[140px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3'

  if (disabled) {
    return (
      <div
        data-testid={`variant-card-${kind}`}
        aria-disabled="true"
        className={`${sharedClasses} opacity-60 cursor-not-allowed`}
      >
        {inner}
        <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">
          {t.home.comingSoon}
        </div>
      </div>
    )
  }

  return (
    <Link
      data-testid={`variant-card-${kind}`}
      to={`/variant/${kind}`}
      className={`${sharedClasses} hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-transform`}
    >
      {inner}
    </Link>
  )
}
