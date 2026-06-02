import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Coord, Digit } from '@/engine'

const DRAG_THRESHOLD_PX = 6

export interface DragDropTarget {
  readonly coord: Coord
  readonly locked: boolean
  readonly given: boolean
}

export interface UseDigitDragOptions {
  /** Fired on pointerup AFTER a drag actually started (> threshold). target is null if the pointer ended off any cell. */
  readonly onDrop: (digit: Digit, target: DragDropTarget | null) => void
  /** Optional callback whenever the cell under the pointer changes during drag. */
  readonly onHoverCellChange?: (cellKey: string | null) => void
}

interface DragSession {
  digit: Digit
  startX: number
  startY: number
  pointerId: number
  source: Element
  started: boolean
  hoverCellKey: string | null
}

export interface DigitDragBinding {
  readonly onPointerDown: (ev: ReactPointerEvent<HTMLButtonElement>) => void
  readonly onPointerMove: (ev: ReactPointerEvent<HTMLButtonElement>) => void
  readonly onPointerUp: (ev: ReactPointerEvent<HTMLButtonElement>) => void
  readonly onPointerCancel: (ev: ReactPointerEvent<HTMLButtonElement>) => void
  readonly onLostPointerCapture: (ev: ReactPointerEvent<HTMLButtonElement>) => void
  readonly onClickCapture: (ev: ReactPointerEvent<HTMLButtonElement>) => void
  readonly 'data-drag-source': true
}

export interface UseDigitDragResult {
  /** Returns pointer handlers to spread onto a digit button. */
  readonly bind: (digit: Digit) => DigitDragBinding
  /** Ref to attach to the floating ghost element. Position is driven via direct transform writes. */
  readonly ghostRef: (node: HTMLDivElement | null) => void
  /** The digit currently being dragged (after threshold), null otherwise. Use to conditionally render the ghost. */
  readonly activeDigit: Digit | null
}

export function useDigitDrag({ onDrop, onHoverCellChange }: UseDigitDragOptions): UseDigitDragResult {
  const sessionRef = useRef<DragSession | null>(null)
  const ghostElRef = useRef<HTMLDivElement | null>(null)
  /** Timestamp (performance.now) of the most recent drag-ending pointerup.
   * iOS/Safari fires a synthetic click ~300ms after pointerup; suppress within that window only. */
  const lastDragEndAtRef = useRef(0)
  const [activeDigit, setActiveDigit] = useState<Digit | null>(null)

  const ghostRef = useCallback((node: HTMLDivElement | null) => {
    ghostElRef.current = node
  }, [])

  const positionGhost = (x: number, y: number) => {
    const el = ghostElRef.current
    if (!el) return
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  }

  const endSession = useCallback(() => {
    sessionRef.current = null
    setActiveDigit(null)
    onHoverCellChange?.(null)
  }, [onHoverCellChange])

  useEffect(() => {
    return () => {
      sessionRef.current = null
    }
  }, [])

  const bind = useCallback(
    (digit: Digit): DigitDragBinding => ({
      'data-drag-source': true,
      onPointerDown: (ev) => {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return
        sessionRef.current = {
          digit,
          startX: ev.clientX,
          startY: ev.clientY,
          pointerId: ev.pointerId,
          source: ev.currentTarget,
          started: false,
          hoverCellKey: null,
        }
      },
      onPointerMove: (ev) => {
        const s = sessionRef.current
        if (!s || s.digit !== digit) return
        const dx = ev.clientX - s.startX
        const dy = ev.clientY - s.startY
        if (!s.started) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
          s.started = true
          try {
            s.source.setPointerCapture(s.pointerId)
          } catch {
            // setPointerCapture can throw if the pointer is no longer active (e.g. cancelled by browser).
          }
          setActiveDigit(s.digit)
          positionGhost(ev.clientX, ev.clientY)
        } else {
          positionGhost(ev.clientX, ev.clientY)
        }
        const target = findCellUnderPoint(ev.clientX, ev.clientY)
        const newKey = target ? `${target.coord.r},${target.coord.c}` : null
        if (newKey !== s.hoverCellKey) {
          s.hoverCellKey = newKey
          onHoverCellChange?.(newKey)
        }
      },
      onPointerUp: (ev) => {
        const s = sessionRef.current
        if (!s || s.digit !== digit) return
        if (s.started) {
          const target = findCellUnderPoint(ev.clientX, ev.clientY)
          onDrop(s.digit, target)
          lastDragEndAtRef.current = performance.now()
          ev.preventDefault()
        }
        endSession()
      },
      onPointerCancel: () => {
        endSession()
      },
      onLostPointerCapture: () => {
        endSession()
      },
      onClickCapture: (ev) => {
        // Only suppress the synthetic click that follows a real drag (within ~350ms).
        // Leaves genuine taps untouched, even if a drag happened earlier in the session.
        if (performance.now() - lastDragEndAtRef.current < 350) {
          ev.preventDefault()
          ev.stopPropagation()
        }
      },
    }),
    [onDrop, onHoverCellChange, endSession],
  )

  return { bind, ghostRef, activeDigit }
}

function findCellUnderPoint(x: number, y: number): DragDropTarget | null {
  const top = typeof document !== 'undefined' ? document.elementFromPoint(x, y) : null
  if (!(top instanceof Element)) return null
  const cell = top.closest('[data-cell-r]')
  if (!cell) return null
  const r = cell.getAttribute('data-cell-r')
  const c = cell.getAttribute('data-cell-c')
  if (r === null || c === null) return null
  return {
    coord: { r: Number(r), c: Number(c) },
    locked: cell.getAttribute('data-locked') === 'true',
    given: cell.getAttribute('data-given') === 'true',
  }
}
