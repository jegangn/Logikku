import { create } from 'zustand'
import { getSettings, putSettings, type SavedSettings } from '@/storage/db'

export type Theme = 'light' | 'dark' | 'system'

export interface SettingsState {
  readonly theme: Theme
  readonly strictMode: boolean
  readonly highlightConflicts: boolean
  readonly highlightPeers: boolean
  readonly pencilAutoClean: boolean
  readonly loaded: boolean
  loadFromDb: () => Promise<void>
  set: <K extends Exclude<keyof SettingsState, 'loaded' | 'loadFromDb' | 'set'>>(
    key: K,
    value: SettingsState[K],
  ) => Promise<void>
}

const DEFAULTS: Omit<SettingsState, 'loaded' | 'loadFromDb' | 'set'> = {
  theme: 'system',
  strictMode: false,
  highlightConflicts: true,
  highlightPeers: true,
  pencilAutoClean: false,
}

export const useSettingsStore = create<SettingsState>((setState, get) => ({
  ...DEFAULTS,
  loaded: false,

  loadFromDb: async () => {
    const saved = await getSettings()
    if (saved) {
      setState({
        theme: saved.theme ?? DEFAULTS.theme,
        strictMode: false,
        highlightConflicts: saved.highlightConflicts ?? DEFAULTS.highlightConflicts,
        highlightPeers: saved.highlightPeers ?? DEFAULTS.highlightPeers,
        pencilAutoClean: saved.pencilAutoClean ?? DEFAULTS.pencilAutoClean,
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
      highlightConflicts: s.highlightConflicts,
      highlightPeers: s.highlightPeers,
      pencilAutoClean: s.pencilAutoClean,
    }
    await putSettings(next)
  },
}))
