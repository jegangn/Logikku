export interface ThermometerPath {
  readonly id: string
  readonly path: ReadonlyArray<{ readonly r: number; readonly c: number }>
}

export interface ThermometerOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly thermometers: ReadonlyArray<ThermometerPath>
}

/**
 * Render each thermometer as a filled circle at the bulb plus a thick line
 * through the cell centers from bulb to tip. The line uses a rounded cap so
 * bends look smooth without per-bend logic.
 */
export function ThermometerOverlay({
  cellSize,
  thermometers,
}: ThermometerOverlayProps) {
  const elems: React.ReactElement[] = []
  for (let i = 0; i < thermometers.length; i++) {
    const t = thermometers[i]!
    if (t.path.length === 0) continue
    const bulb = t.path[0]!
    const bx = (bulb.c + 0.5) * cellSize
    const by = (bulb.r + 0.5) * cellSize
    const points = t.path
      .map((co) => `${(co.c + 0.5) * cellSize},${(co.r + 0.5) * cellSize}`)
      .join(' ')
    elems.push(
      <g key={t.id} data-testid={`thermometer-${t.id}`}>
        {t.path.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={cellSize * 0.32}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <circle
          cx={bx}
          cy={by}
          r={cellSize * 0.22}
          fill="var(--color-surface-2)"
          stroke="var(--color-border-strong)"
          strokeWidth={1.5}
        />
      </g>,
    )
  }
  return (
    <g data-testid="thermometer-overlay" pointerEvents="none">
      {elems}
    </g>
  )
}
