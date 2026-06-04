# Sound System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calm, satisfying, fully-synthesized sound layer to Logikku — every tap clicks (including placing numbers), with 3 selectable themes in Settings (default = Marimba).

**Architecture:** A browser-only `src/audio/` module synthesizes all sounds via the Web Audio API (no files, no libraries). One global capture-phase `pointerdown` listener plays a sound for every interactive tap, choosing the sound from a `data-sound` attribute on the tapped control (digits = `place`/`pencil` pitched by digit, board cells = `select`, erase = `erase`, everything else = `tap`). Outcome sounds (`reject`, `win`) are driven off existing game-store signals (`rejectFlashKey`, `lastShakeKey`, `completedAt`). Keyboard input plays sounds from the existing Play keydown handler. No `gameStore` changes are required.

**Tech Stack:** Web Audio API, React 19, TypeScript (strict), Zustand 5, Vitest 4 + happy-dom + @testing-library/react, Tailwind v4, bun.

**Run tests with:** `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run` · typecheck: `… run typecheck` · build: `… run build`. (bun is not on PATH; use the full path.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/audio/themes.ts` (create) | Pure data: `SoundTheme`, `SoundEvent`, `SoundSpec`, `Tone`, `NoiseBurst` types; `THEMES` table (3×7); `resolveSound()`. |
| `src/audio/synth.ts` (create) | Web Audio engine: lazy `AudioContext`, `isAudioAvailable()`, `unlockAudio()`, `playSpec(spec, opts)`. Feature-detected; no-ops without AudioContext. |
| `src/audio/sound.ts` (create) | Bridge: `playSound(event, opts)` reads settings (enabled/theme/volume) → `playSpec`; `pitchStepsForDigit()`. |
| `src/audio/SoundController.tsx` (create) | React component mounted in App: global `pointerdown` tap listener + `reject`/`win` store effects. Renders nothing. |
| `src/state/settingsStore.ts` (modify) | Add `soundEnabled`, `soundTheme`, `soundVolume` fields + defaults + persistence. |
| `src/storage/db.ts` (modify) | Add the three fields to `SavedSettings`. |
| `src/i18n/en.ts`, `src/i18n/ms.ts` (modify) | Sound-section setting labels. |
| `src/ui/board/Cell.tsx` (modify) | Add `data-sound="select"` to the cell `<g>`. |
| `src/ui/panels/InputPad.tsx` (modify) | Add `data-sound`/`data-digit` to digit buttons, `data-sound="erase"` to erase. |
| `src/ui/pages/Play.tsx` (modify) | Keyboard `playSound` calls. |
| `src/ui/pages/Settings.tsx` (modify) | New "Sound" section (toggle, theme control w/ preview, volume slider). |
| `src/App.tsx` (modify) | Mount `<SoundController/>`. |

---

### Task 1: Theme data + resolver (`src/audio/themes.ts`)

**Files:**
- Create: `src/audio/themes.ts`
- Test: `src/audio/themes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/themes.test.ts
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
      expect((resolveSound(theme, 'win').tones?.length ?? 0)).toBeGreaterThanOrEqual(3)
    }
  })

  it('THEMES has exactly the three themes', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['chime', 'click', 'marimba'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/themes.test.ts`
Expected: FAIL — cannot resolve `./themes`.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/themes.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/themes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/audio/themes.ts src/audio/themes.test.ts
git commit -m "feat(audio): synth theme data + resolver (marimba/click/chime)"
git push origin main
```

---

### Task 2: Web Audio synth engine (`src/audio/synth.ts`)

**Files:**
- Create: `src/audio/synth.ts`
- Test: `src/audio/synth.test.ts`

**Note:** happy-dom does not implement `AudioContext`, so the engine must feature-detect and no-op. Tests assert it never throws there.

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/synth.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/synth.test.ts`
Expected: FAIL — cannot resolve `./synth`.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/synth.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/synth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/audio/synth.ts src/audio/synth.test.ts
git commit -m "feat(audio): Web Audio synth engine (feature-detected, safe no-op)"
git push origin main
```

---

### Task 3: Settings store + db fields

**Files:**
- Modify: `src/storage/db.ts` (the `SavedSettings` interface, ~lines 102-109)
- Modify: `src/state/settingsStore.ts`
- Test: `src/state/settingsStore.test.ts` (create if absent; otherwise append)

- [ ] **Step 1: Write the failing test**

```ts
// src/state/settingsStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from './settingsStore'
import { _resetDbForTests, getSettings } from '@/storage/db'

describe('settingsStore sound fields', () => {
  beforeEach(async () => {
    await _resetDbForTests()
  })

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
    await useSettingsStore.getState().loadFromDb()
    expect(useSettingsStore.getState().soundTheme).toBe('click')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/state/settingsStore.test.ts`
Expected: FAIL — `soundEnabled`/`soundTheme`/`soundVolume` undefined.

- [ ] **Step 3a: Add fields to `SavedSettings` in `src/storage/db.ts`**

Replace the `SavedSettings` interface (currently lines 102-109) with:

```ts
export interface SavedSettings {
  readonly key: 'v1'
  readonly theme?: 'light' | 'dark' | 'system'
  readonly language?: 'en' | 'ms' | 'system'
  readonly highlightConflicts?: boolean
  readonly highlightPeers?: boolean
  readonly pencilAutoClean?: boolean
  readonly soundEnabled?: boolean
  readonly soundTheme?: 'marimba' | 'click' | 'chime'
  readonly soundVolume?: number
}
```

- [ ] **Step 3b: Add fields to `src/state/settingsStore.ts`**

Add the import at the top (after the existing imports):

```ts
import type { SoundTheme } from '@/audio/themes'
```

In the `SettingsState` interface, add after `pencilAutoClean: boolean`:

```ts
  readonly soundEnabled: boolean
  readonly soundTheme: SoundTheme
  readonly soundVolume: number
```

In `DEFAULTS`, add after `pencilAutoClean: false,`:

```ts
  soundEnabled: true,
  soundTheme: 'marimba',
  soundVolume: 70,
```

In `loadFromDb`, inside the `if (saved)` `setState({...})`, add after `pencilAutoClean: saved.pencilAutoClean ?? DEFAULTS.pencilAutoClean,`:

```ts
        soundEnabled: saved.soundEnabled ?? DEFAULTS.soundEnabled,
        soundTheme: saved.soundTheme ?? DEFAULTS.soundTheme,
        soundVolume: saved.soundVolume ?? DEFAULTS.soundVolume,
```

In `set`, in the `next: SavedSettings` object, add after `pencilAutoClean: s.pencilAutoClean,`:

```ts
      soundEnabled: s.soundEnabled,
      soundTheme: s.soundTheme,
      soundVolume: s.soundVolume,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/state/settingsStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage/db.ts src/state/settingsStore.ts src/state/settingsStore.test.ts
git commit -m "feat(settings): persist soundEnabled/soundTheme/soundVolume"
git push origin main
```

---

### Task 4: Sound bridge (`src/audio/sound.ts`)

**Files:**
- Create: `src/audio/sound.ts`
- Test: `src/audio/sound.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/sound.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/sound.test.ts`
Expected: FAIL — cannot resolve `./sound`.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/sound.ts
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
  const pitchSteps = event === 'place' && opts.digit !== undefined ? pitchStepsForDigit(opts.digit) : 0
  playSpec(spec, { volume, pitchSteps })
}

function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/sound.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/audio/sound.ts src/audio/sound.test.ts
git commit -m "feat(audio): playSound bridge — settings-gated, pitched by digit"
git push origin main
```

---

### Task 5: SoundController (global tap listener + outcome effects)

**Files:**
- Create: `src/audio/SoundController.tsx`
- Test: `src/audio/SoundController.test.tsx`
- Modify: `src/App.tsx`

The controller mounts one capture-phase `pointerdown` listener that plays a sound for every interactive tap, reading the sound name from the nearest `data-sound` ancestor (digits carry `data-digit` for pitch); falls back to `tap`. It also subscribes to `gameStore` and plays `reject` on `rejectFlashKey`/`lastShakeKey` increments and `win` when `completedAt` transitions to set.

- [ ] **Step 1: Write the failing test**

```tsx
// src/audio/SoundController.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

const playSound = vi.fn()
const unlockAudio = vi.fn()
vi.mock('./sound', () => ({
  playSound: (...a: unknown[]) => playSound(...a),
  unlockAudio: () => unlockAudio(),
}))

import { SoundController } from './SoundController'

function tapDown(el: Element) {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true }))
}

describe('SoundController tap listener', () => {
  beforeEach(() => {
    playSound.mockClear()
    unlockAudio.mockClear()
  })
  afterEach(cleanup)

  it('plays "tap" for a plain button', () => {
    render(<SoundController />)
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    tapDown(btn)
    expect(playSound).toHaveBeenCalledWith('tap', expect.anything())
    btn.remove()
  })

  it('plays the data-sound event with data-digit for a digit button', () => {
    render(<SoundController />)
    const btn = document.createElement('button')
    btn.setAttribute('data-sound', 'place')
    btn.setAttribute('data-digit', '5')
    document.body.appendChild(btn)
    tapDown(btn)
    expect(playSound).toHaveBeenCalledWith('place', { digit: 5 })
    btn.remove()
  })

  it('stays silent for data-sound="off"', () => {
    render(<SoundController />)
    const wrap = document.createElement('div')
    wrap.setAttribute('data-sound', 'off')
    const btn = document.createElement('button')
    wrap.appendChild(btn)
    document.body.appendChild(wrap)
    tapDown(btn)
    expect(playSound).not.toHaveBeenCalled()
    wrap.remove()
  })

  it('ignores taps on non-interactive elements', () => {
    render(<SoundController />)
    const div = document.createElement('div')
    document.body.appendChild(div)
    tapDown(div)
    expect(playSound).not.toHaveBeenCalled()
    div.remove()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/SoundController.test.tsx`
Expected: FAIL — cannot resolve `./SoundController`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/audio/SoundController.tsx
import { useEffect, useRef } from 'react'
import { useGameStore } from '@/state/gameStore'
import { playSound, unlockAudio, type SoundEvent } from './sound'

const INTERACTIVE = 'button, a, [role="tab"], [role="switch"], [data-sound]'
const SOUND_EVENTS: ReadonlySet<string> = new Set<SoundEvent>([
  'place', 'pencil', 'erase', 'select', 'tap', 'reject', 'win',
])

export function SoundController() {
  useEffect(() => {
    function onPointerDown(ev: PointerEvent) {
      unlockAudio()
      const target = ev.target
      if (!(target instanceof Element)) return
      const off = target.closest('[data-sound="off"]')
      if (off) return
      const el = target.closest(INTERACTIVE)
      if (!el) return
      const named = el.closest('[data-sound]')
      const attr = named?.getAttribute('data-sound')
      const event: SoundEvent = attr && SOUND_EVENTS.has(attr) ? (attr as SoundEvent) : 'tap'
      const digitAttr = named?.getAttribute('data-digit')
      if (event === 'place' && digitAttr) {
        playSound('place', { digit: Number(digitAttr) as never })
      } else {
        playSound(event, {})
      }
    }
    document.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [])

  const prevReject = useRef(0)
  const prevShake = useRef(0)
  const prevCompleted = useRef<string | null>(null)

  useEffect(() => {
    prevReject.current = useGameStore.getState().rejectFlashKey
    prevShake.current = useGameStore.getState().lastShakeKey
    prevCompleted.current = useGameStore.getState().completedAt
    return useGameStore.subscribe((s) => {
      if (s.rejectFlashKey !== prevReject.current) {
        prevReject.current = s.rejectFlashKey
        playSound('reject', {})
      }
      if (s.lastShakeKey !== prevShake.current) {
        prevShake.current = s.lastShakeKey
        playSound('reject', {})
      }
      if (s.completedAt !== prevCompleted.current) {
        const wasNull = prevCompleted.current === null
        prevCompleted.current = s.completedAt
        if (wasNull && s.completedAt !== null) playSound('win', {})
      }
    })
  }, [])

  return null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run -- src/audio/SoundController.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Mount in `src/App.tsx`**

Add the import after the `UpdatePrompt` import:

```ts
import { SoundController } from '@/audio/SoundController'
```

Add `<SoundController />` right after `<UpdatePrompt />` inside `<BrowserRouter>`:

```tsx
        <UpdatePrompt />
        <SoundController />
```

- [ ] **Step 6: Commit**

```bash
git add src/audio/SoundController.tsx src/audio/SoundController.test.tsx src/App.tsx
git commit -m "feat(audio): SoundController — global tap listener + reject/win effects"
git push origin main
```

---

### Task 6: Annotate gameplay controls with `data-sound`

**Files:**
- Modify: `src/ui/board/Cell.tsx` (the cell `<g>` that has `data-cell-r`)
- Modify: `src/ui/panels/InputPad.tsx` (digit buttons + erase button + InputPad root)

- [ ] **Step 1: Cell — add `data-sound="select"`**

On the `<g>` element that already carries `data-cell-r={coord.r}`, add `data-sound="select"` alongside it.

- [ ] **Step 2: InputPad — digit buttons**

In `DigitButton`, add to the `<button>`: `data-sound={pencil ? 'pencil' : 'place'}` and `data-digit={digit}`. Thread the mode in by adding a `pencil: boolean` prop to `DigitButton` and passing `pencil={mode === 'pencil'}` from the `digits.map(...)`. Update the `DigitButton` prop type with `pencil: boolean`.

- [ ] **Step 3: InputPad — erase button**

On the erase `<button>` (the one with `data-testid="erase-btn"`), add `data-sound="erase"`.

- [ ] **Step 4: Verify no double-sound on the pad**

The mode tabs and pad container do NOT get `data-sound="off"`; mode tabs fall through to `tap`, which is correct. Digit/erase carry explicit `data-sound`, so the global listener plays exactly one sound each.

- [ ] **Step 5: Run the full suite (no behavior regressions)**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/ui/board/Cell.tsx src/ui/panels/InputPad.tsx
git commit -m "feat(audio): tag board cells + digit/erase controls with data-sound"
git push origin main
```

---

### Task 7: Keyboard sounds in Play

**Files:**
- Modify: `src/ui/pages/Play.tsx` (the `onKey` handler, ~lines 226-262)

Keyboard input does not generate a pointer tap, so add explicit `playSound` calls in the existing keydown handler. The pointer paths already sound via the global listener; keyboard is a separate code path with no double-fire.

- [ ] **Step 1: Import**

Add near the other imports:

```ts
import { playSound } from '@/audio/sound'
```

- [ ] **Step 2: Add sounds in `onKey`**

- After `if (ev.shiftKey) redo(); else undo()` (undo/redo branch) add `playSound('tap', {})` before `ev.preventDefault()`.
- In the `redo()` (Ctrl+Y) branch add `playSound('tap', {})` before `ev.preventDefault()`.
- In the digit branch, change to play first:

```ts
      const maybeDigit = digitFromGlyph(ev.key)
      if (maybeDigit !== null && maybeDigit <= gridSize) {
        playSound(mode === 'pencil' ? 'pencil' : 'place', { digit: maybeDigit })
        input(maybeDigit)
        ev.preventDefault()
        return
      }
```

- In the erase branch (`Backspace`/`Delete`/`0`) add `playSound('erase', {})` before `erase()`.
- In the arrow branches, after the four `moveSelection(...)` calls but before the final `ev.preventDefault()`, the `else if (ev.key === 'p' …)` chain already returns early for non-arrows; add `playSound('select', {})` right before the final `ev.preventDefault()` so it fires only for arrow moves and pencil-toggle. To keep pencil-toggle as a `tap`, instead add `playSound('select', {})` inside each of the four arrow branches and `playSound('tap', {})` in the `p`/`P` branch.

Concretely replace the arrow/pencil block:

```ts
      if (ev.key === 'ArrowUp') { playSound('select', {}); moveSelection(-1, 0) }
      else if (ev.key === 'ArrowDown') { playSound('select', {}); moveSelection(1, 0) }
      else if (ev.key === 'ArrowLeft') { playSound('select', {}); moveSelection(0, -1) }
      else if (ev.key === 'ArrowRight') { playSound('select', {}); moveSelection(0, 1) }
      else if (ev.key === 'p' || ev.key === 'P') { playSound('tap', {}); setMode(mode === 'pencil' ? 'value' : 'pencil') }
      else return
      ev.preventDefault()
```

- [ ] **Step 3: Update the effect dependency comment**

`mode` is already in the `onKey` dependency array (line 262). No dependency change needed (`playSound` reads the store directly and is module-level, not a dependency).

- [ ] **Step 4: Run the full suite + typecheck**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run` then `… run typecheck`
Expected: all green; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pages/Play.tsx
git commit -m "feat(audio): keyboard input plays matching sounds"
git push origin main
```

---

### Task 8: Settings "Sound" section + i18n

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/ms.ts` (settings block)
- Modify: `src/ui/pages/Settings.tsx`
- Test: `src/ui/pages/Settings.test.tsx` (append cases)

- [ ] **Step 1: Add i18n keys**

In `src/i18n/en.ts`, inside `settings`, after `pencilAutoCleanHint: …`, add:

```ts
    soundSection: 'Sound',
    soundEnabled: 'Sound effects',
    soundEnabledHint: 'Play a gentle sound on every tap.',
    soundTheme: 'Sound theme',
    soundThemeMarimba: 'Marimba',
    soundThemeClick: 'Click',
    soundThemeChime: 'Chime',
    soundVolume: 'Volume',
```

In `src/i18n/ms.ts`, inside `settings`, after `pencilAutoCleanHint: …`, add:

```ts
    soundSection: 'Bunyi',
    soundEnabled: 'Kesan bunyi',
    soundEnabledHint: 'Mainkan bunyi lembut pada setiap ketikan.',
    soundTheme: 'Tema bunyi',
    soundThemeMarimba: 'Marimba',
    soundThemeClick: 'Klik',
    soundThemeChime: 'Loceng',
    soundVolume: 'Kelantangan',
```

- [ ] **Step 2: Wire Settings.tsx**

Add imports:

```ts
import { playSound } from '@/audio/sound'
import type { SoundTheme } from '@/audio/themes'
```

Add subscriptions near the other `useSettingsStore` selectors:

```ts
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const soundTheme = useSettingsStore((s) => s.soundTheme)
  const soundVolume = useSettingsStore((s) => s.soundVolume)
```

Add the theme option list near `THEMES`/`LANGUAGES`:

```ts
  const SOUND_THEMES: ReadonlyArray<{ value: SoundTheme; label: string }> = [
    { value: 'marimba', label: t.settings.soundThemeMarimba },
    { value: 'click', label: t.settings.soundThemeClick },
    { value: 'chime', label: t.settings.soundThemeChime },
  ]
```

Insert a new `<section>` immediately after the existing settings `</section>` (the one that closes after `pencilAutoClean`, line 184) and before the `dataSection` `<section>`:

```tsx
        <section className="mt-10 space-y-4" data-sound="off">
          <Label>{t.settings.soundSection}</Label>
          <ToggleRow
            label={t.settings.soundEnabled}
            hint={t.settings.soundEnabledHint}
            value={soundEnabled}
            onChange={(v) => {
              void setSetting('soundEnabled', v)
              if (v) playSound('tap', {})
            }}
            testId="toggle-soundEnabled"
          />
          {soundEnabled && (
            <>
              <div>
                <Label>{t.settings.soundTheme}</Label>
                <div className="mt-2 grid grid-cols-3 gap-2" role="tablist" aria-label={t.settings.soundTheme}>
                  {SOUND_THEMES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={soundTheme === value}
                      data-testid={`soundTheme-${value}`}
                      onClick={() => {
                        void setSetting('soundTheme', value)
                        playSound('place', { digit: 1 })
                      }}
                      className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                        soundTheme === value
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <label htmlFor="sound-volume" className="text-sm font-medium">
                  {t.settings.soundVolume}
                </label>
                <input
                  id="sound-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={soundVolume}
                  data-testid="sound-volume"
                  onChange={(e) => {
                    void setSetting('soundVolume', Number(e.target.value))
                  }}
                  onPointerUp={() => playSound('tap', {})}
                  className="mt-3 w-full accent-[var(--color-accent)]"
                />
              </div>
            </>
          )}
        </section>
```

The `data-sound="off"` on the section prevents the global listener from double-playing `tap` on these controls (the theme buttons and toggle play their own preview sounds explicitly).

- [ ] **Step 3: Append Settings tests**

```tsx
// add to src/ui/pages/Settings.test.tsx
import { vi } from 'vitest'
vi.mock('@/audio/sound', () => ({ playSound: vi.fn() }))

it('renders the sound section and toggles it', async () => {
  render(<Settings />, { wrapper: Wrapper })  // use the file's existing render+wrapper pattern
  expect(screen.getByTestId('toggle-soundEnabled')).toBeInTheDocument()
  expect(screen.getByTestId('soundTheme-marimba')).toBeInTheDocument()
  expect(screen.getByTestId('sound-volume')).toBeInTheDocument()
})
```

If the existing test file uses a different render helper/wrapper, match it; the assertions (three testids present) are what matter.

- [ ] **Step 4: Run the suite + typecheck**

Run: `"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run` then `… run typecheck`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/en.ts src/i18n/ms.ts src/ui/pages/Settings.tsx src/ui/pages/Settings.test.tsx
git commit -m "feat(settings): Sound section — on/off, theme picker w/ preview, volume"
git push origin main
```

---

### Task 9: Full verification + live smoke test

- [ ] **Step 1: Green gates**

```bash
"C:\Users\JeganGN\.bun\bin\bun.exe" run typecheck
"C:\Users\JeganGN\.bun\bin\bun.exe" run test:run
"C:\Users\JeganGN\.bun\bin\bun.exe" run build
```
Expected: typecheck clean; all tests pass; build succeeds.

- [ ] **Step 2: Live smoke (dev server + browser preview)**

Start `bun run dev`, open the preview, and confirm by ear/inspection:
- First tap on a fresh load unlocks audio (no silence thereafter).
- Tapping a digit places it AND plays `place`; different digits sound at different pitches.
- Pencil mode digit → `pencil`; erase → `erase`; cell tap → `select`; menu/nav buttons → `tap`.
- Dropping a digit on a given/locked cell → `reject` flash + sound; solving a puzzle → `win` arpeggio.
- Settings: toggling Sound off silences everything; switching theme previews live; volume slider changes loudness.

- [ ] **Step 3: Final commit (if any tuning)**

```bash
git add -A
git commit -m "chore(audio): tune sound levels after live smoke"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Synthesized Web Audio, no files/libs → Tasks 1-2. ✅
- 3 themes, default marimba → Task 1 + Task 3 defaults. ✅
- 7 events incl. place pitched by digit → Tasks 1, 4. ✅
- Every tap sounds (incl. menus) → Task 5 global listener + Task 6 annotations + Task 7 keyboard. ✅
- reject/win from existing signals → Task 5. ✅
- iOS unlock on first gesture → Task 5 (`unlockAudio` in listener) + Task 2. ✅
- Settings: on/off + theme (with preview) + volume, persisted → Tasks 3, 8. ✅
- i18n en+ms → Task 8. ✅
- Tests: themes, synth guard, sound bridge, settings store, db round-trip, controller, settings UI → Tasks 1-5, 8. ✅
- Engine purity preserved (audio under `src/audio/`, no `src/engine/` change) → all tasks. ✅

**Type consistency:** `SoundTheme`/`SoundEvent`/`SoundSpec` defined in Task 1 and imported unchanged in Tasks 2-5, 8. `playSound(event, opts)` signature consistent across Tasks 4, 5, 7, 8. `pitchStepsForDigit` defined once (Task 4), referenced in Task 4 tests only. `SavedSettings` fields (Task 3) match store fields (Task 3) and UI bindings (Task 8).

**Deviation from spec §3:** The spec sketched adding `lastInputSound`/`lastInputKey` to `gameStore`. This plan instead uses the existing `data-sound` attribute + global listener for place/pencil/erase/select and the existing `rejectFlashKey`/`lastShakeKey`/`completedAt` signals for reject/win — achieving the same behavior with zero `gameStore` changes (lower risk). This is an implementation refinement of the approved design, not a behavior change.
