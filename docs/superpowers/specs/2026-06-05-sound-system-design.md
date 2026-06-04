# Logikku Sound System — Design Spec

**Date:** 2026-06-05
**Status:** Approved (design), pending plan

**Goal:** Give Logikku a calm, satisfying sound layer. Every tap makes a sound, including placing numbers on the board. Three selectable sound themes in Settings; the default is the best-sounding one. Sound respects the project's hard constraints: fully offline, no audio files, no third-party libraries, no network, no data collection.

---

## 1. Approach: synthesized, not sampled

All sounds are **synthesized live in the browser via the Web Audio API** (oscillators + a short noise burst + an amplitude envelope). No `.mp3`/`.wav`/`.ogg` files, no `howler`-style library.

Why this and not audio files:
- **Offline / PWA:** nothing to fetch; works on first load and forever after.
- **Non-negotiables:** "no third-party scripts at runtime", "self-host", "privacy" — synthesis adds no assets and no code we didn't write.
- **Bundle size:** a few KB of TypeScript vs. potentially MBs of audio. Recent work cut the entry chunk hard; files would undo that.
- **Tunable:** every sound is data we can adjust by ear.

iPad-Safari reality: an `AudioContext` starts **suspended** until the first user gesture. The global tap listener (below) resumes it on the first touch, so the very first tap is silent-safe and every tap after plays.

---

## 2. Module layout (`src/audio/`, kept out of pure `src/engine/`)

```
src/audio/
  synth.ts     # Web Audio engine: one shared AudioContext + master gain.
               #   unlockAudio(), setMasterVolume(v), playSpec(spec, opts).
               #   Feature-detects AudioContext; no-ops cleanly if absent (SSR/tests).
  themes.ts    # Pure data. SoundTheme, SoundEvent, SoundSpec types.
               #   THEMES table (theme × event → spec). resolveSound(theme, event).
  sound.ts     # Bridge to settings. playSound(event, opts?) reads the settings
               #   store (enabled/theme/volume) and calls synth. digit→pitch map.
               #   initSoundFromSettings() wires volume changes to setMasterVolume.
```

Nothing here imports React except via the store's `getState()`. The engine layer (`src/engine/`) is untouched and stays pure.

### Types

```ts
// themes.ts
export type SoundTheme = 'marimba' | 'click' | 'chime'
export type SoundEvent =
  | 'place' | 'pencil' | 'erase' | 'select' | 'tap' | 'reject' | 'win'

interface Tone {
  wave: OscillatorType        // 'sine' | 'triangle' | 'square' | 'sawtooth'
  freq: number                // Hz
  dur: number                 // seconds
  offset?: number             // seconds from spec start (for arpeggios)
  attack?: number             // seconds (default ~0.005)
  gain?: number               // 0..1 relative (default 1)
  detune?: number             // cents
}
interface NoiseBurst {
  dur: number                 // seconds
  gain?: number               // 0..1 relative
  filterHz?: number           // bandpass centre, for click texture
}
export interface SoundSpec {
  tones?: ReadonlyArray<Tone>
  noise?: NoiseBurst
}
```

### The 7 events ("sound types")

| Event | When it fires |
|---|---|
| `place` | A value is placed in a cell. Pitched slightly by digit (musical). |
| `pencil` | A pencil candidate is toggled. |
| `erase` | A cell is cleared. |
| `select` | A board cell is tapped/selected (incl. arrow-key move). |
| `tap` | Any other button/menu/nav control. The "every tap" fallback. |
| `reject` | Invalid input: tapping a given/locked cell, or a strict-mode lock. Soft "no". |
| `win` | Puzzle solved. A short, pleasant 3–4 note arpeggio. |

### The 3 themes (starting character; final values tuned by ear after build)

- **Marimba (default):** warm triangle/sine mallet tones, soft attack, ~0.18s decay. Calm, rounded, satisfying — the best fit for a relaxing puzzle and an older user.
- **Click:** very short (~0.04s) noise burst + tiny high sine ping. Crisp, tactile, mechanical-keyboard feel.
- **Chime:** sine tones with a second harmonic and longer (~0.3s) decay. Soft glassy bell.

`place` is pitched across digits using a pentatonic step map so filling the grid feels musical and never dissonant. All three themes share the same digit→pitch logic, applied to their base `place` frequency.

---

## 3. How sounds get triggered

Two mechanisms, chosen so gameplay sounds never double up with the generic tap:

**A. Gameplay sounds — driven by game state, mirroring the existing `lastShakeKey` / `rejectFlashKey` feedback signals already in `gameStore`.**

- `gameStore` gains `lastInputSound: 'place' | 'pencil' | 'erase' | null` and a monotonic `lastInputKey: number`, set at the exact success branches inside `input()` and `erase()`. One Play-screen effect subscribes to `lastInputKey` and plays the mapped sound. **This single subscription covers the digit pad, keyboard digits, AND drag-to-board placement**, because all three flow through `input()`.
- `reject` ← Play subscribes to the existing `rejectFlashKey` and `lastShakeKey`. Covers tap, drag, and strict-mode locks.
- `win` ← Play subscribes to `completedAt` transitioning `null → set`.
- `select` ← Play wraps the board `onSelect` and the keyboard arrow-move handler.

Adding `lastInputSound`/`lastInputKey` to the store is consistent with the project — these are abstract UI-feedback signals exactly like `lastShakeKey`; the store names *what happened*, and the UI maps it to a sound. The `AudioContext` itself stays entirely in `src/audio/`.

**B. The "every tap" fallback — one capture-phase `pointerdown` listener mounted at the App root.**

Plays `tap` for any interactive element (`button, a, [role="tab"], [role="switch"]`) UNLESS it sits inside an element marked `data-sound="off"`. The Play `<Board>` SVG and the `<InputPad>` root carry `data-sound="off"`, so their taps are handled exclusively by the gameplay sounds in (A) and never double-fire. Mode-tab switches (inside InputPad) and any other in-pad chrome get a `tap` via an explicit wrapper. Everything else — Home, Settings rows, Toolbar (New/Undo/Redo), back buttons, nav links — clicks via this one listener.

This listener also calls `unlockAudio()` first, satisfying the iOS gesture requirement on the user's very first interaction.

---

## 4. Settings: persistence + UI

**Store (`settingsStore.ts`) — three new fields:**

| Field | Type | Default |
|---|---|---|
| `soundEnabled` | `boolean` | `true` |
| `soundTheme` | `SoundTheme` | `'marimba'` |
| `soundVolume` | `number` (0–100) | `70` |

Added to `DEFAULTS`, `loadFromDb()`, the `set()` persistence payload, and the `SavedSettings` interface in `storage/db.ts`. No IndexedDB version bump needed — `settings` is a single `v1` record with optional fields (older records simply fall back to defaults).

**Settings UI — a new "Sound" section** above "Your data", using the existing `ToggleRow` + segmented-control patterns:
- **Sound** — `ToggleRow` for `soundEnabled`.
- **Theme** — 3-button segmented control (Marimba · Click · Chime), styled like the Theme/Language controls. Selecting a theme **plays a live preview** (`place` sound) so the user chooses by ear.
- **Volume** — a range slider bound to `soundVolume`; plays a short `tap` on release so the level is audible. Hidden/disabled when sound is off.

All new labels added to `i18n/en.ts` and `i18n/ms.ts` under `settings`.

---

## 5. Testing

Pure/unit (Vitest + happy-dom):
- **themes:** `resolveSound(theme, event)` returns a non-empty spec for **every** theme × event combination; `win` has ≥3 tones; `place` is defined for all themes.
- **synth guard:** `playSpec` and `unlockAudio` no-op without throwing when `AudioContext` is unavailable (happy-dom).
- **sound bridge:** with a mocked synth — `playSound` calls `playSpec` when enabled, does nothing when `soundEnabled` is false; volume maps/clamps to 0–1; theme selection routes to the right spec.
- **settingsStore:** new defaults; `set('soundTheme', …)` etc. persist; `loadFromDb` restores all three.
- **db:** `SavedSettings` round-trips the three fields.
- **Settings UI:** renders the Sound toggle, theme control, and volume slider; interacting persists (synth mocked).

Live smoke test on the dev server (browser-only audio): each theme audibly plays for place / pencil / erase / select / tap / reject / win, volume and on-off work, and the first tap on a fresh load unlocks audio on the iPad profile.

---

## 6. Non-goals / constraints honored

- No audio files, no audio libraries, no network, no analytics — synthesis only.
- `src/engine/` stays pure (audio lives in `src/audio/`, a browser-only module).
- Tailwind primitives only; no new UI dependencies.
- Calm by design: sounds are short (<~0.3s), quiet by default, and fully mutable.
