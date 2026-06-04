import { describe, expect, it } from 'vitest'
import { isAudioAvailable, playSpec, unlockAudio } from './synth'

describe('synth (no AudioContext in happy-dom)', () => {
  it('reports audio unavailable', () => {
    expect(isAudioAvailable()).toBe(false)
  })

  it('playSpec is a safe no-op without AudioContext', () => {
    expect(() =>
      playSpec({ tones: [{ wave: 'sine', freq: 440, dur: 0.1 }] }, { volume: 0.7 }),
    ).not.toThrow()
  })

  it('unlockAudio is a safe no-op without AudioContext', () => {
    expect(() => unlockAudio()).not.toThrow()
  })
})
