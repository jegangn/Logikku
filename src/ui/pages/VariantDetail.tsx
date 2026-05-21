import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { DifficultyPicker } from '@/ui/components/DifficultyPicker'
import { Markdown } from '@/ui/components/markdown'
import { Onboarding } from '@/ui/components/Onboarding'
import { VariantThumbnail } from '@/ui/components/VariantThumbnail'
import {
  getVariant,
  isVariantKind,
  parseOnboardingSections,
} from '@/ui/variantCatalog'
import { useOnboardingStore } from '@/state/onboardingStore'
import { t } from '@/i18n/en'
import type { Difficulty } from '@/engine'

export function VariantDetail() {
  const { kind } = useParams<{ kind: string }>()
  const navigate = useNavigate()
  const hasSeen = useOnboardingStore((s) => s.hasSeen)
  const [pendingOnboarding, setPendingOnboarding] = useState<Difficulty | null>(null)

  if (!kind || !isVariantKind(kind)) {
    return <Navigate to="/" replace />
  }

  const variantKind = kind
  const meta = getVariant(variantKind)
  const sections = parseOnboardingSections(meta.onboarding)
  const rulesBody = sections[0]?.body ?? ''
  const catalogEntry = t.catalog[variantKind]

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
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-4 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        >
          ← {t.variant.backToHome}
        </button>

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
