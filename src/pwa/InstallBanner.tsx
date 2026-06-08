import { useState } from 'react'
import { useT } from '@/i18n'

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
  const t = useT()
  const [visible, setVisible] = useState(shouldShowBanner)

  if (!visible) return null

  return (
    <div
      role="status"
      data-testid="install-banner"
      className="rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-5 py-4 flex items-start gap-3"
    >
      <svg
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-[var(--color-accent-strong)]"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16V4" />
        <path d="M8 8l4-4 4 4" />
        <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
      </svg>
      <p className="flex-1 text-[15px] leading-snug text-[var(--color-text)]">
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
        className="min-h-[44px] -my-1 px-2 inline-flex items-center text-[15px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        {t.pwa.installDismiss}
      </button>
    </div>
  )
}
