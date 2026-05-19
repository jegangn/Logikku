import { useState } from 'react'
import { t } from '@/i18n/en'

const DISMISS_KEY = 'logikku:installBannerDismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return ua.includes('Mac') && 'ontouchend' in document
}

function shouldShowBanner(): boolean {
  if (isStandalone()) return false
  if (!isIOS()) return false
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return false
  } catch {
    return false
  }
  return true
}

export function InstallBanner() {
  const [visible, setVisible] = useState(shouldShowBanner)

  if (!visible) return null

  return (
    <div
      role="status"
      data-testid="install-banner"
      className="mt-6 rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 flex items-start gap-3"
    >
      <span aria-hidden className="text-[var(--color-accent-strong)] text-xl leading-none">⤴</span>
      <p className="flex-1 text-sm text-[var(--color-text)]">
        {t.pwa.installPrompt}
      </p>
      <button
        type="button"
        data-testid="install-dismiss"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, '1')
          } catch {
            /* ignore */
          }
          setVisible(false)
        }}
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        {t.pwa.installDismiss}
      </button>
    </div>
  )
}
