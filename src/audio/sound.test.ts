import { beforeEach, describe, expect, it, vi } from 'vitest'

const playSpec = vi.fn()
const unlockAudio = vi.fn()
vi.mock('./synth', () => ({
  playSpec: (...a: unknown[]) => playSpec(...a),
  unlockAudio: () => unlockAudio(),
  isAudioAvailable: () => true,
}))

import { playSound, pitchStepsForDigit } from './sound'
import { useSettingsStore } from '@/state/settingsStore'

describe('pitchStepsForDigit', () => {
  it('is 0 for digit 1 and rises with the digit', () => {
    expect(pitchStepsForDigit(1)).toBe(0)
    expect(pitchStepsForDigit(2)).toBeGreaterThan(0)
    expect(pitchStepsForDigit(9)).toBeGreaterThan(pitchStepsForDigit(5))
  })
})

describe('playSound', () => {
  beforeEach(() => {
    playSpec.mockClear()
    useSettingsStore.setState({ soundEnabled: true, soundTheme: 'marimba', soundVolume: 70 })
  })

  it('plays via synth when enabled', () => {
    playSound('tap')
    expect(playSpec).toHaveBeenCalledTimes(1)
  })

  it('is silent when soundEnabled is false', () => {
    useSettingsStore.setState({ soundEnabled: false })
    playSound('tap')
    expect(playSpec).not.toHaveBeenCalled()
  })

  it('passes volume as a 0..1 fraction', () => {
    useSettingsStore.setState({ soundVolume: 50 })
    playSound('tap')
    expect(playSpec.mock.calls[0]?.[1]).toMatchObject({ volume: 0.5 })
  })

  it('pitches place by digit', () => {
    playSound('place', { digit: 5 })
    expect(playSpec.mock.calls[0]?.[1]?.pitchSteps).toBe(pitchStepsForDigit(5))
  })
})
