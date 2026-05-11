import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from './settingsStore'
import { _resetDbForTests } from '@/storage/db'

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
