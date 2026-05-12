import { HYPER_WINDOW_ORIGINS } from '@/engine'

export interface HyperOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
}

export function HyperOverlay({ cellSize }: HyperOverlayProps) {
  return (
    <g data-testid="hyper-overlay" pointerEvents="none">
      {HYPER_WINDOW_ORIGINS.map(([r0, c0], i) => (
        <rect
          key={`window-${i}`}
          x={c0 * cellSize}
          y={r0 * cellSize}
          width={3 * cellSize}
          height={3 * cellSize}
          fill="var(--color-accent)"
          fillOpacity={0.08}
          stroke="var(--color-accent)"
          strokeOpacity={0.22}
          strokeWidth={1.5}
          rx={2}
        />
      ))}
    </g>
  )
}
