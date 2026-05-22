/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { en, type Strings } from './en'
import { ms } from './ms'
import { applyLang, resolveLang, watchSystemLang } from './lang'
import { useSettingsStore } from '@/state/settingsStore'

const TABLES: Record<'en' | 'ms', Strings> = { en, ms }

interface LanguageValue {
  readonly t: Strings
  readonly lang: 'en' | 'ms'
}

const LanguageContext = createContext<LanguageValue>({ t: en, lang: 'en' })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSettingsStore((s) => s.language)
  const [, forceTick] = useState(0)

  useEffect(() => {
    applyLang(language)
    if (language === 'system') {
      return watchSystemLang(() => forceTick((n) => n + 1))
    }
    return
  }, [language])

  const lang = resolveLang(language)
  const value = useMemo<LanguageValue>(() => ({ t: TABLES[lang], lang }), [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useT(): Strings {
  return useContext(LanguageContext).t
}

export function useLang(): 'en' | 'ms' {
  return useContext(LanguageContext).lang
}
