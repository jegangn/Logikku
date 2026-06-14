import { useEffect, useState } from 'react'
import { useGameStore } from '@/state/gameStore'

export function useElapsedTime(): number {
  const elapsedMs = useGameStore((s) => s.elapsedMs)
  const resumeAt = useGameStore((s) => s.resumeAt)
  const paused = useGameStore((s) => s.paused)
  const [, tick] = useState(0)
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [paused])
  return paused || resumeAt === null ? elapsedMs : elapsedMs + (Date.now() - resumeAt)
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
