import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { useSettingsStore } from './settingsStore'
import { _resetDbForTests, getSettings } from '@/storage/db'

beforeEach(async () => {
  _resetDbForTests()
  indexedDB.deleteDatabase('logikku')
  useSettingsStore.setState({ language: 'system' })
})

describe('settingsStore language', () => {
  it('defaults to system', () => {
    expect(useSettingsStore.getState().language).toBe('system')
  })

  it('persists a language change to IndexedDB', async () => {
    await useSettingsStore.getState().set('language', 'ms')
    expect(useSettingsStore.getState().language).toBe('ms')
    const saved = await getSettings()
    expect(saved?.language).toBe('ms')
  })

  it('restores a persisted language on load', async () => {
    await useSettingsStore.getState().set('language', 'ms')
    useSettingsStore.setState({ language: 'system' })
    await useSettingsStore.getState().loadFromDb()
    expect(useSettingsStore.getState().language).toBe('ms')
  })
})
