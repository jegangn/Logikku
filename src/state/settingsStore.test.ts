import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from './settingsStore'
import { _resetDbForTests, getSettings } from '@/storage/db'

beforeEach(async () => {
  await _resetDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('logikku')
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
  useSettingsStore.setState({
    theme: 'system',
    strictMode: false,
    highlightConflicts: true,
    highlightPeers: true,
    pencilAutoClean: false,
    soundEnabled: true,
    soundTheme: 'marimba',
    soundVolume: 70,
    loaded: false,
  })
})

describe('settingsStore', () => {
  it('defaults to system theme, strict off, highlights on', () => {
    const s = useSettingsStore.getState()
    expect(s.theme).toBe('system')
    expect(s.strictMode).toBe(false)
    expect(s.highlightConflicts).toBe(true)
    expect(s.highlightPeers).toBe(true)
  })

  it('set persists and round-trips via loadFromDb', async () => {
    await useSettingsStore.getState().set('theme', 'light')
    await useSettingsStore.getState().set('pencilAutoClean', true)
    useSettingsStore.setState({
      theme: 'system',
      pencilAutoClean: false,
      loaded: false,
    })
    await useSettingsStore.getState().loadFromDb()
    const s = useSettingsStore.getState()
    expect(s.theme).toBe('light')
    expect(s.pencilAutoClean).toBe(true)
    expect(s.loaded).toBe(true)
  })

  it('strictMode is not persisted across reloads', async () => {
    await useSettingsStore.getState().set('strictMode', true)
    useSettingsStore.setState({ strictMode: false, loaded: false })
    await useSettingsStore.getState().loadFromDb()
    expect(useSettingsStore.getState().strictMode).toBe(false)
  })
})

describe('settingsStore sound fields', () => {
  it('defaults: sound on, marimba, volume 70', () => {
    const s = useSettingsStore.getState()
    expect(s.soundEnabled).toBe(true)
    expect(s.soundTheme).toBe('marimba')
    expect(s.soundVolume).toBe(70)
  })

  it('set persists sound fields to IndexedDB', async () => {
    await useSettingsStore.getState().set('soundTheme', 'chime')
    await useSettingsStore.getState().set('soundVolume', 40)
    await useSettingsStore.getState().set('soundEnabled', false)
    const saved = await getSettings()
    expect(saved?.soundTheme).toBe('chime')
    expect(saved?.soundVolume).toBe(40)
    expect(saved?.soundEnabled).toBe(false)
  })

  it('loadFromDb restores sound fields', async () => {
    await useSettingsStore.getState().set('soundTheme', 'click')
    useSettingsStore.setState({ soundTheme: 'marimba', loaded: false })
    await useSettingsStore.getState().loadFromDb()
    expect(useSettingsStore.getState().soundTheme).toBe('click')
  })
})
