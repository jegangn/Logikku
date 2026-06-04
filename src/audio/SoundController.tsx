import { useEffect, useRef } from 'react'
import type { Digit } from '@/engine'
import { useGameStore } from '@/state/gameStore'
import { playSound, unlockAudio, type SoundEvent } from './sound'

const INTERACTIVE = 'button, a, [role="tab"], [role="switch"], [data-sound]'
const SOUND_EVENTS: ReadonlySet<string> = new Set<SoundEvent>([
  'place',
  'pencil',
  'erase',
  'select',
  'tap',
  'reject',
  'win',
])

export function SoundController() {
  useEffect(() => {
    function onPointerDown(ev: PointerEvent) {
      unlockAudio()
      const target = ev.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-sound="off"]')) return
      const el = target.closest(INTERACTIVE)
      if (!el) return
      const named = el.closest('[data-sound]')
      const attr = named?.getAttribute('data-sound')
      const event: SoundEvent = attr && SOUND_EVENTS.has(attr) ? (attr as SoundEvent) : 'tap'
      const digitAttr = named?.getAttribute('data-digit')
      if (event === 'place' && digitAttr) {
        playSound('place', { digit: Number(digitAttr) as Digit })
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
