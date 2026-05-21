import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Home } from '@/ui/pages/Home'
import { Play } from '@/ui/pages/Play'
import { VariantDetail } from '@/ui/pages/VariantDetail'
import { Settings } from '@/ui/pages/Settings'
import { Stats } from '@/ui/pages/Stats'
import { useSettingsStore } from '@/state/settingsStore'
import { useOnboardingStore } from '@/state/onboardingStore'
import { applyTheme, watchSystemTheme } from '@/theme'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

export default function App() {
  const theme = useSettingsStore((s) => s.theme)
  const loadSettings = useSettingsStore((s) => s.loadFromDb)
  const loaded = useSettingsStore((s) => s.loaded)
  const loadOnboarding = useOnboardingStore((s) => s.loadFromDb)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    void loadOnboarding()
  }, [loadOnboarding])

  useEffect(() => {
    applyTheme(theme)
    if (theme === 'system') {
      return watchSystemTheme(() => applyTheme('system'))
    }
    return
  }, [theme])

  if (!loaded) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">…</p>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/variant/:kind" element={<VariantDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
      <UpdatePrompt />
    </BrowserRouter>
  )
}
