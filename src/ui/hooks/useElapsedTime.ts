import { useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'

export function useElapsedTime(): number {
  const elapsedMs = useGameStore((s) => s.elapsedMs)
  const resumeAt = useGameStore((s) => s.resumeAt)
  const paused = useGameStore((s) => s.paused)
  const [now, setNow] = useState(elapsedMs)
  useEffect(() => {
    function update() {
      setNow(paused || resumeAt === null ? elapsedMs : elapsedMs + (Date.now() - resumeAt))
    }
    update()
    if (paused) return
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [paused, elapsedMs, resumeAt])
  return now
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
