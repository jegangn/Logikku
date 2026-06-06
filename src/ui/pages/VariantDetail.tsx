import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { DifficultyPicker } from '@/ui/components/DifficultyPicker'
import { Markdown } from '@/ui/components/markdown'
import { Onboarding } from '@/ui/components/Onboarding'
import { VariantThumbnail } from '@/ui/components/VariantThumbnail'
import { BackButton } from '@/ui/components/BackButton'
import {
  getVariant,
  isVariantKind,
  parseOnboardingSections,
} from '@/ui/variantCatalog'
import { useOnboardingStore } from '@/state/onboardingStore'
import { useStatsStore } from '@/state/statsStore'
import { useT, useLang } from '@/i18n'
import type { Difficulty } from '@/engine'

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function VariantDetail() {
  const t = useT()
  const lang = useLang()
  const { kind } = useParams<{ kind: string }>()
  const navigate = useNavigate()
  const hasSeen = useOnboardingStore((s) => s.hasSeen)
  const byBand = useStatsStore((s) => s.byBand)
  const loadStats = useStatsStore((s) => s.loadFromDb)
  const [pendingOnboarding, setPendingOnboarding] = useState<Difficulty | null>(null)

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  if (!kind || !isVariantKind(kind)) {
    return <Navigate to="/" replace />
  }

  const variantKind = kind
  const meta = getVariant(variantKind)
  const sections = parseOnboardingSections(meta.onboarding[lang] ?? meta.onboarding.en)
  const rulesBody = sections[0]?.body ?? ''
  const catalogEntry = t.catalog[variantKind]

  const variantBands = Object.entries(byBand).filter(
    ([k]) => k.split(':')[0] === variantKind,
  )
  const played = variantBands.reduce((sum, [, s]) => sum + s.completed, 0)
  const bestMs = variantBands.reduce<number | null>((best, [, s]) => {
    if (s.bestTimeMs === null) return best
    return best === null ? s.bestTimeMs : Math.min(best, s.bestTimeMs)
  }, null)

  function startPlay(difficulty: Difficulty) {
    navigate(`/play?variant=${variantKind}&difficulty=${difficulty}`)
  }

  function onPick(difficulty: Difficulty) {
    if (hasSeen(variantKind)) {
      startPlay(difficulty)
    } else {
      setPendingOnboarding(difficulty)
    }
  }

  return (
    <main className="min-h-dvh px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <BackButton className="mb-4" />

        <header className="flex items-start gap-4">
          <VariantThumbnail kind={variantKind} className="size-20 shrink-0" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{catalogEntry.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {catalogEntry.description}
            </p>
          </div>
        </header>

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)]">
            {t.variant.rules}
          </h2>
          <div className="mt-2 text-sm leading-relaxed">
            <Markdown source={rulesBody} />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)]">
            {t.variant.pickDifficulty}
          </h2>
          <div className="mt-3">
            <DifficultyPicker variant={variantKind} onPick={onPick} />
          </div>
        </section>

        {played > 0 && (
          <section className="mt-8" data-testid="variant-stats">
            <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)]">
              {t.variant.stats}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {t.variant.statsPlayed(played)}
              {bestMs !== null && ` · ${t.variant.statsBestTime(formatMs(bestMs))}`}
            </p>
          </section>
        )}
      </div>

      {pendingOnboarding !== null && (
        <Onboarding
          kind={variantKind}
          onDone={() => {
            const difficulty = pendingOnboarding
            setPendingOnboarding(null)
            startPlay(difficulty)
          }}
        />
      )}
    </main>
  )
}
