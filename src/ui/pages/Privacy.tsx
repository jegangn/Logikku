import { useT } from '@/i18n'
import { BackButton } from '@/ui/components/BackButton'

export function Privacy() {
  const t = useT()

  return (
    <main className="min-h-dvh flex flex-col items-center pad-page">
      <div className="w-full max-w-md">
        <BackButton className="mb-6" />
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
