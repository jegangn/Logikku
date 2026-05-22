import { Link, useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'

export function About() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <main className="min-h-dvh flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        >
          {t.play.back}
        </button>
        <h1 className="text-3xl font-semibold tracking-tight">{t.about.title}</h1>
        <p className="mt-4 text-[var(--color-text-muted)]">{t.about.tagline}</p>
        <p data-testid="app-version" className="mt-2 text-sm text-[var(--color-text-faint)]">
          {t.about.version} {__APP_VERSION__}
        </p>
        <p className="mt-6 text-[var(--color-text-muted)] leading-relaxed">{t.about.credit}</p>
        <div className="mt-8 flex flex-col gap-2 text-sm">
          <Link to="/privacy" className="text-[var(--color-accent-strong)] hover:underline">
            {t.about.privacyLink}
          </Link>
          <Link to="/settings" className="text-[var(--color-accent-strong)] hover:underline">
            {t.about.backupLink}
          </Link>
        </div>
      </div>
    </main>
  )
}
