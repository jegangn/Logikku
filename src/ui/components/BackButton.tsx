import { useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@/i18n'

export interface BackButtonProps {
  readonly to?: string
  readonly label?: string
  readonly className?: string
  readonly testId?: string
}

export function BackButton({ to, label, className, testId = 'back-button' }: BackButtonProps) {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()

  function handleBack() {
    if (to !== undefined) {
      navigate(to)
    } else if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={handleBack}
      aria-label={label ?? t.play.back}
      className={`inline-flex min-h-[44px] items-center gap-1 rounded-xl px-2 -ml-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:scale-[0.97] transition-transform ${className ?? ''}`}
    >
      <ChevronLeftIcon />
      <span>{label ?? t.play.back}</span>
    </button>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6L9 12L15 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
