import { useEffect, useState } from 'react'

const QUERY = '(orientation: portrait)'

export function useIsPortraitOrientation(): boolean {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    // Guard for bundler tree-shaking / non-browser environments.
    // Logikku is client-only, so in real runtime window is always present.
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    // Same guard: keeps the hook safe if ever used in a non-browser context.
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const handler = (ev: MediaQueryListEvent) => setIsPortrait(ev.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isPortrait
}
