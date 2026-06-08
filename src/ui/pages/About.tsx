import { Link } from 'react-router-dom'
import { useT } from '@/i18n'
import { BackButton } from '@/ui/components/BackButton'

export function About() {
  const t = useT()

  return (
    <main className="min-h-dvh flex flex-col items-center pad-page">
      <div className="w-full max-w-md">
        <BackButton className="mb-6" />
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t.about.title}</h1>
          <p className="text-[17px] text-[var(--color-text-muted)]">{t.about.tagline}</p>
          <p data-testid="app-version" className="text-[15px] tabular-nums text-[var(--color-text-faint)]">
            {t.about.version} {__APP_VERSION__}
          </p>
        </header>
        <p className="mt-8 text-[15px] text-[var(--color-text-muted)] leading-relaxed">{t.about.credit}</p>
        <div className="mt-8 flex flex-col gap-1 text-[15px]">
          <Link to="/privacy" className="inline-flex min-h-[44px] items-center text-[var(--color-accent-strong)] hover:underline">
            {t.about.privacyLink}
          </Link>
          <Link to="/settings" className="inline-flex min-h-[44px] items-center text-[var(--color-accent-strong)] hover:underline">
            {t.about.backupLink}
          </Link>
        </div>
      </div>
    </main>
  )
}
