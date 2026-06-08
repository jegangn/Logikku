import { useState } from 'react'
import { Markdown } from './markdown'
import { getVariant, parseOnboardingSections, type VariantKind } from '@/ui/variantCatalog'
import { useOnboardingStore } from '@/state/onboardingStore'
import { useT, useLang } from '@/i18n'

interface OnboardingProps {
  readonly kind: VariantKind
  readonly onDone: () => void
}

export function Onboarding({ kind, onDone }: OnboardingProps) {
  const t = useT()
  const lang = useLang()
  const meta = getVariant(kind)
  const sections = parseOnboardingSections(meta.onboarding[lang] ?? meta.onboarding.en)
  const markSeen = useOnboardingStore((s) => s.markSeen)
  const [index, setIndex] = useState(0)
  const section = sections[index]!
  const isLast = index === sections.length - 1

  function dismiss() {
    void markSeen(kind)
    onDone()
  }

  return (
    <div
      data-testid="onboarding-backdrop"
      onClick={dismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 pad-page"
    >
      <div
        data-testid="onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="onboarding-title" className="text-xl font-semibold">{section.title}</h2>
          <button
            type="button"
            data-testid="onboarding-skip"
            onClick={dismiss}
            className="min-h-[44px] -mr-2 px-2 inline-flex items-center text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {t.onboarding.skip}
          </button>
        </div>

        <div className="mt-4 text-[15px] leading-relaxed">
          <Markdown source={section.body} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[13px] tabular-nums text-[var(--color-text-faint)]">
            {t.onboarding.stepOf(index + 1, sections.length)}
          </div>
          {isLast ? (
            <button
              type="button"
              data-testid="onboarding-done"
              onClick={dismiss}
              className="min-h-[48px] px-6 rounded-xl bg-[var(--color-accent-button)] text-white font-semibold active:scale-[0.98] transition-transform"
            >
              {t.onboarding.done}
            </button>
          ) : (
            <button
              type="button"
              data-testid="onboarding-next"
              onClick={() => setIndex(index + 1)}
              className="min-h-[48px] px-6 rounded-xl bg-[var(--color-accent-button)] text-white font-semibold active:scale-[0.98] transition-transform"
            >
              {t.onboarding.next}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
