export interface XDiagonalOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
}

export function XDiagonalOverlay({ gridSize, cellSize }: XDiagonalOverlayProps) {
  const totalPx = gridSize * cellSize
  return (
    <g data-testid="x-diagonal-overlay" pointerEvents="none">
      <line
        x1={0}
        y1={0}
        x2={totalPx}
        y2={totalPx}
        stroke="var(--color-accent)"
        strokeOpacity={0.18}
        strokeWidth={Math.max(2, cellSize * 0.08)}
        strokeLinecap="round"
      />
      <line
        x1={totalPx}
        y1={0}
        x2={0}
        y2={totalPx}
        stroke="var(--color-accent)"
        strokeOpacity={0.18}
        strokeWidth={Math.max(2, cellSize * 0.08)}
        strokeLinecap="round"
      />
    </g>
  )
}
