import { useRegisterSW } from './useRegisterSW'
import { t } from '@/i18n/en'

export function UpdatePrompt() {
  const { needRefresh, update, dismiss } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="update-prompt"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-xl px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{t.pwa.updateAvailable}</div>
            <div className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {t.pwa.updateHint}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            data-testid="update-dismiss"
            className="px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
          >
            {t.pwa.dismiss}
          </button>
          <button
            type="button"
            onClick={() => void update()}
            data-testid="update-refresh"
            className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)]"
          >
            {t.pwa.refresh}
          </button>
        </div>
      </div>
    </div>
  )
}
