import { create } from 'zustand'
import { getSettings, putSettings, type SavedSettings } from '@/storage/db'
import type { Language } from '@/i18n/lang'
import type { SoundTheme } from '@/audio/themes'

export type Theme = 'light' | 'dark' | 'system'

export interface SettingsState {
  readonly theme: Theme
  readonly language: Language
  readonly strictMode: boolean
  readonly highlightConflicts: boolean
  readonly highlightPeers: boolean
  readonly pencilAutoClean: boolean
  readonly soundEnabled: boolean
  readonly soundTheme: SoundTheme
  readonly soundVolume: number
  readonly loaded: boolean
  loadFromDb: () => Promise<void>
  set: <K extends Exclude<keyof SettingsState, 'loaded' | 'loadFromDb' | 'set'>>(
    key: K,
    value: SettingsState[K],
  ) => Promise<void>
}

const DEFAULTS: Omit<SettingsState, 'loaded' | 'loadFromDb' | 'set'> = {
  theme: 'system',
  language: 'system',
  strictMode: false,
  highlightConflicts: true,
  highlightPeers: true,
  pencilAutoClean: false,
  soundEnabled: true,
  soundTheme: 'marimba',
  soundVolume: 70,
}

export const useSettingsStore = create<SettingsState>((setState, get) => ({
  ...DEFAULTS,
  loaded: false,

  loadFromDb: async () => {
    const saved = await getSettings()
    if (saved) {
      setState({
        theme: saved.theme ?? DEFAULTS.theme,
        language: saved.language ?? DEFAULTS.language,
        strictMode: false,
        highlightConflicts: saved.highlightConflicts ?? DEFAULTS.highlightConflicts,
        highlightPeers: saved.highlightPeers ?? DEFAULTS.highlightPeers,
        pencilAutoClean: saved.pencilAutoClean ?? DEFAULTS.pencilAutoClean,
        soundEnabled: saved.soundEnabled ?? DEFAULTS.soundEnabled,
        soundTheme: saved.soundTheme ?? DEFAULTS.soundTheme,
        soundVolume: saved.soundVolume ?? DEFAULTS.soundVolume,
        loaded: true,
      })
    } else {
      setState({ loaded: true })
    }
  },

  set: async (key, value) => {
    setState({ [key]: value } as Partial<SettingsState>)
    const s = get()
    const next: SavedSettings = {
      key: 'v1',
      theme: s.theme,
      language: s.language,
      highlightConflicts: s.highlightConflicts,
      highlightPeers: s.highlightPeers,
      pencilAutoClean: s.pencilAutoClean,
      soundEnabled: s.soundEnabled,
      soundTheme: s.soundTheme,
      soundVolume: s.soundVolume,
    }
    await putSettings(next)
  },
}))
