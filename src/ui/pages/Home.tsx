import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { VariantCard } from '@/ui/components/VariantCard'
import {
  VARIANT_CATALOG,
  type VariantFeature,
  type VariantSize,
} from '@/ui/variantCatalog'
import { listBanks } from '@/puzzles'
import { mostRecentUnfinished, type SavedGame } from '@/storage/db'
import { InstallBanner } from '@/pwa/InstallBanner'
import { useT } from '@/i18n'
import type { Strings } from '@/i18n/en'

const SIZE_FILTERS: ReadonlyArray<{ value: VariantSize | 'all'; labelKey: keyof Strings['home']['filters'] }> = [
  { value: 'all',     labelKey: 'sizeAll' },
  { value: '9x9',     labelKey: 'size9x9' },
  { value: '6x6',     labelKey: 'size6x6' },
  { value: '16x16',   labelKey: 'size16x16' },
  { value: 'samurai', labelKey: 'sizeSamurai' },
]

const FEATURE_FILTERS: ReadonlyArray<{ value: VariantFeature; labelKey: keyof Strings['home']['filters'] }> = [
  { value: 'classic-like',  labelKey: 'featureClassicLike' },
  { value: 'cage',          labelKey: 'featureCage' },
  { value: 'path',          labelKey: 'featurePath' },
  { value: 'outside-clue',  labelKey: 'featureOutsideClue' },
  { value: 'parity',        labelKey: 'featureParity' },
  { value: 'edge-clue',     labelKey: 'featureEdgeClue' },
  { value: 'arithmetic',    labelKey: 'featureArithmetic' },
]

export function Home() {
  const t = useT()
  const [continueGame, setContinueGame] = useState<SavedGame | null>(null)
  const [size, setSize] = useState<VariantSize | 'all'>('all')
  const [features, setFeatures] = useState<ReadonlySet<VariantFeature>>(new Set())

  useEffect(() => {
    void mostRecentUnfinished().then(setContinueGame)
  }, [])

  const variantsWithBanks = useMemo(() => {
    return new Set(listBanks().map((b) => b.variant))
  }, [])

  const visible = useMemo(() => {
    return VARIANT_CATALOG.filter((v) => {
      if (size !== 'all' && v.size !== size) return false
      for (const need of features) {
        if (!v.features.includes(need)) return false
      }
      return true
    })
  }, [size, features])

  function toggleFeature(f: VariantFeature) {
    const next = new Set(features)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    setFeatures(next)
  }

  const continueLabel = continueGame
    ? `${t.catalog[continueGame.variant as keyof typeof t.catalog]?.name ?? continueGame.variant} · ${t.difficulty[continueGame.difficulty]} · ${t.home.startedAgo(minutesAgo(continueGame.startedAt))}`
    : ''

  return (
    <main className="min-h-dvh pad-page">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-4xl font-semibold tracking-tight">{t.appName}</h1>
          <p className="text-[17px] text-[var(--color-text-muted)]">{t.tagline}</p>
        </header>

        {continueGame && (
          <Link
            to={`/play?variant=${continueGame.variant}&difficulty=${continueGame.difficulty}&puzzleId=${continueGame.id}`}
            data-testid="continue-card"
            className="block rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-6 py-5 hover:border-[var(--color-accent-strong)] active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-accent-strong)] font-semibold">
                  {t.home.continueLabel}
                </div>
                <div className="mt-1 text-[17px] font-medium leading-snug">{continueLabel}</div>
              </div>
              <span className="ml-4 shrink-0 text-[var(--color-accent-strong)]" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </div>
          </Link>
        )}

        <section className="space-y-3">
          <FilterRow
            label={t.home.filters.sizeLabel}
            chips={SIZE_FILTERS.map((f) => ({
              id: f.value,
              testId: `filter-size-${f.value}`,
              label: t.home.filters[f.labelKey],
              active: size === f.value,
              onClick: () => setSize(f.value),
            }))}
          />
          <FilterRow
            label={t.home.filters.featuresLabel}
            chips={FEATURE_FILTERS.map((f) => ({
              id: f.value,
              testId: `filter-feature-${f.value}`,
              label: t.home.filters[f.labelKey],
              active: features.has(f.value),
              onClick: () => toggleFeature(f.value),
            }))}
          />
        </section>

        {visible.length === 0 ? (
          <p
            data-testid="home-empty"
            className="py-10 text-center text-[15px] text-[var(--color-text-muted)]"
          >
            {t.home.empty}
          </p>
        ) : (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((v) => (
              <VariantCard
                key={v.kind}
                kind={v.kind}
                disabled={!variantsWithBanks.has(v.kind)}
              />
            ))}
          </section>
        )}

        <InstallBanner />

        <nav className="flex items-center justify-center gap-2 pt-4 text-[15px] text-[var(--color-text-muted)]">
          <Link
            to="/stats"
            data-testid="link-stats"
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 hover:text-[var(--color-text)]"
          >
            {t.home.stats}
          </Link>
          <span className="text-[var(--color-text-faint)]">·</span>
          <Link
            to="/settings"
            data-testid="link-settings"
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 hover:text-[var(--color-text)]"
          >
            {t.home.settings}
          </Link>
        </nav>
      </div>
    </main>
  )
}

interface ChipProps {
  readonly id: string
  readonly testId: string
  readonly label: string
  readonly active: boolean
  readonly onClick: () => void
}

function FilterRow({ label, chips }: { label: string; chips: ReadonlyArray<ChipProps> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-[var(--color-text-faint)] mr-1">
        {label}
      </span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          data-testid={c.testId}
          aria-pressed={c.active}
          onClick={c.onClick}
          className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors ${
            c.active
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function minutesAgo(isoString: string): number {
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / 60000))
}
