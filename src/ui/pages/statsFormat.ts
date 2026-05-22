import type { Strings } from '@/i18n/en'
import { isVariantKind } from '@/ui/variantCatalog'

export function formatBand(key: string, t: Strings): string {
  const [variant, difficulty] = key.split(':')
  const label = t.difficulty[difficulty as keyof typeof t.difficulty] ?? difficulty
  const variantName =
    variant && isVariantKind(variant)
      ? t.catalog[variant].name
      : (variant ?? '').charAt(0).toUpperCase() + (variant ?? '').slice(1)
  return `${variantName} · ${label}`
}
