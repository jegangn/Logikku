import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { useOnboardingStore } from './onboardingStore'
import { _resetDbForTests } from '@/storage/db'

describe('onboardingStore', () => {
  beforeEach(async () => {
    await _resetDbForTests()
    useOnboardingStore.setState({ seen: new Set(), loaded: false })
  })

  it('loads empty by default', async () => {
    await useOnboardingStore.getState().loadFromDb()
    expect(useOnboardingStore.getState().loaded).toBe(true)
    expect(useOnboardingStore.getState().seen.size).toBe(0)
  })

  it('markSeen persists across reload', async () => {
    await useOnboardingStore.getState().loadFromDb()
    await useOnboardingStore.getState().markSeen('killer')
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)

    useOnboardingStore.setState({ seen: new Set(), loaded: false })
    await useOnboardingStore.getState().loadFromDb()
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
  })

  it('markSeen is idempotent', async () => {
    await useOnboardingStore.getState().loadFromDb()
    await useOnboardingStore.getState().markSeen('killer')
    await useOnboardingStore.getState().markSeen('killer')
    expect(useOnboardingStore.getState().seen.size).toBe(1)
  })

  it('reset clears all seen and persists', async () => {
    await useOnboardingStore.getState().loadFromDb()
    await useOnboardingStore.getState().markSeen('killer')
    await useOnboardingStore.getState().markSeen('samurai')
    await useOnboardingStore.getState().reset()
    expect(useOnboardingStore.getState().seen.size).toBe(0)

    useOnboardingStore.setState({ seen: new Set(), loaded: false })
    await useOnboardingStore.getState().loadFromDb()
    expect(useOnboardingStore.getState().seen.size).toBe(0)
  })
})
