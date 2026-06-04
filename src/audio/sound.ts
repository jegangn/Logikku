import type { Digit } from '@/engine'
import { useSettingsStore } from '@/state/settingsStore'
import { playSpec, unlockAudio } from './synth'
import { resolveSound, type SoundEvent } from './themes'

export { unlockAudio }
export type { SoundEvent } from './themes'

const PENTATONIC = [0, 2, 4, 7, 9]

export function pitchStepsForDigit(digit: Digit): number {
  const i = digit - 1
  const octave = Math.floor(i / PENTATONIC.length)
  const step = PENTATONIC[i % PENTATONIC.length] ?? 0
  return step + octave * 12
}

export interface PlaySoundOpts {
  readonly digit?: Digit
}

export function playSound(event: SoundEvent, opts: PlaySoundOpts = {}): void {
  const { soundEnabled, soundTheme, soundVolume } = useSettingsStore.getState()
  if (!soundEnabled) return
  const spec = resolveSound(soundTheme, event)
  const volume = clampVolume(soundVolume) / 100
  const pitchSteps =
    event === 'place' && opts.digit !== undefined ? pitchStepsForDigit(opts.digit) : 0
  playSpec(spec, { volume, pitchSteps })
}

function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v))
}
