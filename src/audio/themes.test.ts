import { describe, expect, it } from 'vitest'
import { THEMES, resolveSound, type SoundEvent, type SoundTheme } from './themes'

const THEME_KEYS: SoundTheme[] = ['marimba', 'click', 'chime']
const EVENT_KEYS: SoundEvent[] = ['place', 'pencil', 'erase', 'select', 'tap', 'reject', 'win']

describe('themes', () => {
  it('defines a non-empty spec for every theme × event', () => {
    for (const theme of THEME_KEYS) {
      for (const event of EVENT_KEYS) {
        const spec = resolveSound(theme, event)
        const toneCount = spec.tones?.length ?? 0
        const hasNoise = spec.noise !== undefined
        expect(toneCount > 0 || hasNoise, `${theme}/${event} must produce sound`).toBe(true)
      }
    }
  })

  it('win is an arpeggio of at least 3 tones for every theme', () => {
    for (const theme of THEME_KEYS) {
      expect(resolveSound(theme, 'win').tones?.length ?? 0).toBeGreaterThanOrEqual(3)
    }
  })

  it('THEMES has exactly the three themes', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['chime', 'click', 'marimba'])
  })
})
