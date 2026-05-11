import { useEffect, useState } from 'react'

type RegisterSW = (opts?: {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
}) => (reloadPage?: boolean) => Promise<void>

let cached: RegisterSW | null = null

async function loadRegister(): Promise<RegisterSW | null> {
  if (cached) return cached
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null
  try {
    const mod = await import('virtual:pwa-register')
    cached = mod.registerSW as RegisterSW
    return cached
  } catch {
    return null
  }
}

export function useRegisterSW() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadRegister().then((register) => {
      if (cancelled || !register) return
      const update = register({
        immediate: true,
        onNeedRefresh: () => setNeedRefresh(true),
      })
      setUpdateSW(() => update)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    needRefresh,
    update: async () => {
      if (updateSW) await updateSW(true)
      setNeedRefresh(false)
    },
    dismiss: () => setNeedRefresh(false),
  }
}
