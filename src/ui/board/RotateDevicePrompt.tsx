import React from 'react'
import { useT } from '@/i18n'

export function RotateDevicePrompt(): React.ReactElement {
  const t = useT()
  return (
    <div
      data-testid="rotate-device-prompt"
      className="flex flex-col items-center justify-center gap-4 px-6 py-12 w-full max-w-md mx-auto text-center"
    >
      <svg
        data-testid="rotate-icon"
        role="img"
        aria-label={t.play.rotateIcon}
        viewBox="0 0 64 64"
        width="80"
        height="80"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="14" y="6" width="20" height="36" rx="3" />
        <line x1="20" y1="38" x2="28" y2="38" />
        <path d="M40 24 a14 14 0 0 1 14 14" />
        <polyline points="48,32 54,38 60,32" />
      </svg>
      <p className="text-base text-[var(--color-text-muted)]">
        {t.play.rotatePrompt}
      </p>
    </div>
  )
}
