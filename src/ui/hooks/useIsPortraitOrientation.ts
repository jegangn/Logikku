import { useEffect, useState } from 'react'

const QUERY = '(orientation: portrait)'

export function useIsPortraitOrientation(): boolean {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const handler = (ev: MediaQueryListEvent) => setIsPortrait(ev.matches)
    setIsPortrait(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isPortrait
}
