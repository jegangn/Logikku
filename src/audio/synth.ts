import type { SoundSpec } from './themes'

type Ctor = typeof AudioContext

function audioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = audioCtor()
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

export function isAudioAvailable(): boolean {
  return audioCtor() !== null
}

export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

const MASTER = 0.5
const FLOOR = 0.0001

export interface PlayOpts {
  readonly volume?: number
  readonly pitchSteps?: number
}

export function playSpec(spec: SoundSpec, opts: PlayOpts = {}): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const volume = clamp01(opts.volume ?? 1) * MASTER
  if (volume <= 0) return
  const semis = opts.pitchSteps ?? 0
  const ratio = Math.pow(2, semis / 12)
  const now = c.currentTime

  if (spec.tones) {
    for (const tone of spec.tones) {
      const start = now + (tone.offset ?? 0)
      const attack = tone.attack ?? 0.005
      const peak = volume * (tone.gain ?? 1)
      if (peak <= 0) continue
      const osc = c.createOscillator()
      osc.type = tone.wave
      osc.frequency.value = tone.freq * ratio
      if (tone.detune) osc.detune.value = tone.detune
      const g = c.createGain()
      g.gain.setValueAtTime(FLOOR, start)
      g.gain.exponentialRampToValueAtTime(peak, start + attack)
      g.gain.exponentialRampToValueAtTime(FLOOR, start + tone.dur)
      osc.connect(g).connect(c.destination)
      osc.start(start)
      osc.stop(start + tone.dur + 0.02)
    }
  }

  if (spec.noise) {
    const n = spec.noise
    const peak = volume * (n.gain ?? 1)
    if (peak > 0) {
      const frames = Math.max(1, Math.floor(c.sampleRate * n.dur))
      const buffer = c.createBuffer(1, frames, c.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
      const src = c.createBufferSource()
      src.buffer = buffer
      const g = c.createGain()
      g.gain.setValueAtTime(peak, now)
      g.gain.exponentialRampToValueAtTime(FLOOR, now + n.dur)
      let tail: AudioNode = src
      if (n.filterHz) {
        const filter = c.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = n.filterHz
        tail = src.connect(filter)
      }
      tail.connect(g).connect(c.destination)
      src.start(now)
      src.stop(now + n.dur + 0.02)
    }
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}
