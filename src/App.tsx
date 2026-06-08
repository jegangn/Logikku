import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Home } from '@/ui/pages/Home'
import { Play } from '@/ui/pages/Play'
import { VariantDetail } from '@/ui/pages/VariantDetail'
import { Settings } from '@/ui/pages/Settings'
import { Stats } from '@/ui/pages/Stats'
import { Privacy } from '@/ui/pages/Privacy'
import { About } from '@/ui/pages/About'
import { useSettingsStore } from '@/state/settingsStore'
import { useOnboardingStore } from '@/state/onboardingStore'
import { applyTheme, watchSystemTheme } from '@/theme'
import { LanguageProvider } from '@/i18n'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'
import { SoundController } from '@/audio/SoundController'

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
      <main className="min-h-dvh flex items-center justify-center pad-page">
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
          <div
            aria-hidden="true"
            className="grid grid-cols-3 grid-rows-3 gap-[3px] size-24 rounded-lg border border-[var(--color-board-frame)] p-[2px]"
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/variant/:kind" element={<VariantDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
        </Routes>
        <UpdatePrompt />
        <SoundController />
      </BrowserRouter>
    </LanguageProvider>
  )
}
