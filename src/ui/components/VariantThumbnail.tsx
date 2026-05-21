import { getVariant, type VariantKind } from '@/ui/variantCatalog'

interface VariantThumbnailProps {
  readonly kind: VariantKind
  readonly className?: string
}

export function VariantThumbnail({ kind, className = 'size-20' }: VariantThumbnailProps) {
  const { Thumbnail } = getVariant(kind)
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      data-testid={`thumbnail-${kind}`}
      aria-hidden="true"
    >
      <Thumbnail className="h-full w-full text-[var(--color-text)]" />
    </span>
  )
}
