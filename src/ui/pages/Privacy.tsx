import { useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'

export function Privacy() {
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
        <h1 className="text-3xl font-semibold tracking-tight">{t.privacy.title}</h1>
        <div className="mt-6 space-y-4 text-[var(--color-text-muted)] leading-relaxed">
          <p>{t.privacy.body}</p>
          <p>{t.privacy.local}</p>
        </div>
        <p className="mt-8 text-sm text-[var(--color-text-faint)]">{t.privacy.updated}</p>
      </div>
    </main>
  )
}
