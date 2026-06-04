export type SoundTheme = 'marimba' | 'click' | 'chime'

export type SoundEvent =
  | 'place'
  | 'pencil'
  | 'erase'
  | 'select'
  | 'tap'
  | 'reject'
  | 'win'

export interface Tone {
  readonly wave: OscillatorType
  readonly freq: number
  readonly dur: number
  readonly offset?: number
  readonly attack?: number
  readonly gain?: number
  readonly detune?: number
}

export interface NoiseBurst {
  readonly dur: number
  readonly gain?: number
  readonly filterHz?: number
}

export interface SoundSpec {
  readonly tones?: ReadonlyArray<Tone>
  readonly noise?: NoiseBurst
}

const marimba: Record<SoundEvent, SoundSpec> = {
  place: {
    tones: [
      { wave: 'triangle', freq: 392, dur: 0.22, attack: 0.004, gain: 0.9 },
      { wave: 'sine', freq: 784, dur: 0.18, attack: 0.004, gain: 0.22 },
    ],
  },
  pencil: { tones: [{ wave: 'triangle', freq: 330, dur: 0.12, attack: 0.003, gain: 0.5 }] },
  erase: { tones: [{ wave: 'triangle', freq: 196, dur: 0.18, attack: 0.004, gain: 0.6 }] },
  select: { tones: [{ wave: 'sine', freq: 523, dur: 0.08, attack: 0.002, gain: 0.38 }] },
  tap: { tones: [{ wave: 'sine', freq: 440, dur: 0.06, attack: 0.002, gain: 0.32 }] },
  reject: {
    tones: [
      { wave: 'triangle', freq: 220, dur: 0.16, gain: 0.55 },
      { wave: 'triangle', freq: 207, dur: 0.16, offset: 0.05, gain: 0.45 },
    ],
  },
  win: {
    tones: [
      { wave: 'triangle', freq: 523, dur: 0.25, offset: 0.0, gain: 0.65 },
      { wave: 'triangle', freq: 659, dur: 0.25, offset: 0.12, gain: 0.65 },
      { wave: 'triangle', freq: 784, dur: 0.25, offset: 0.24, gain: 0.65 },
      { wave: 'triangle', freq: 1047, dur: 0.4, offset: 0.36, gain: 0.65 },
    ],
  },
}

const click: Record<SoundEvent, SoundSpec> = {
  place: {
    noise: { dur: 0.03, gain: 0.5, filterHz: 2600 },
    tones: [{ wave: 'sine', freq: 1200, dur: 0.04, attack: 0.001, gain: 0.45 }],
  },
  pencil: { noise: { dur: 0.025, gain: 0.3, filterHz: 2000 } },
  erase: { noise: { dur: 0.045, gain: 0.5, filterHz: 1100 } },
  select: { noise: { dur: 0.02, gain: 0.3, filterHz: 3000 } },
  tap: { noise: { dur: 0.018, gain: 0.34, filterHz: 2400 } },
  reject: {
    tones: [{ wave: 'square', freq: 160, dur: 0.12, gain: 0.35 }],
    noise: { dur: 0.05, gain: 0.25, filterHz: 800 },
  },
  win: {
    tones: [
      { wave: 'square', freq: 660, dur: 0.06, offset: 0.0, gain: 0.4 },
      { wave: 'square', freq: 880, dur: 0.06, offset: 0.08, gain: 0.4 },
      { wave: 'square', freq: 1320, dur: 0.1, offset: 0.16, gain: 0.4 },
    ],
  },
}

const chime: Record<SoundEvent, SoundSpec> = {
  place: {
    tones: [
      { wave: 'sine', freq: 660, dur: 0.35, attack: 0.003, gain: 0.7 },
      { wave: 'sine', freq: 1320, dur: 0.3, attack: 0.003, gain: 0.22 },
    ],
  },
  pencil: { tones: [{ wave: 'sine', freq: 550, dur: 0.2, gain: 0.45 }] },
  erase: { tones: [{ wave: 'sine', freq: 330, dur: 0.3, gain: 0.5 }] },
  select: { tones: [{ wave: 'sine', freq: 880, dur: 0.12, gain: 0.35 }] },
  tap: { tones: [{ wave: 'sine', freq: 740, dur: 0.1, gain: 0.3 }] },
  reject: {
    tones: [
      { wave: 'sine', freq: 300, dur: 0.25, gain: 0.45, detune: -25 },
      { wave: 'sine', freq: 296, dur: 0.25, gain: 0.4 },
    ],
  },
  win: {
    tones: [
      { wave: 'sine', freq: 660, dur: 0.3, offset: 0.0, gain: 0.6 },
      { wave: 'sine', freq: 880, dur: 0.3, offset: 0.14, gain: 0.6 },
      { wave: 'sine', freq: 1100, dur: 0.5, offset: 0.28, gain: 0.6 },
      { wave: 'sine', freq: 2200, dur: 0.5, offset: 0.28, gain: 0.14 },
    ],
  },
}

export const THEMES: Record<SoundTheme, Record<SoundEvent, SoundSpec>> = {
  marimba,
  click,
  chime,
}

export function resolveSound(theme: SoundTheme, event: SoundEvent): SoundSpec {
  return THEMES[theme][event]
}
