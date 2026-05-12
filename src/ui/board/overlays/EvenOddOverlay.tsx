export interface EvenOddOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  /** `size*size` mask of 'E' / 'O' / '.'. */
  readonly parityMask: string
}

/**
 * Background marker drawn behind cell contents for parity-flagged cells.
 * Even cells: light-grey rounded square. Odd cells: light-grey circle.
 */
export function EvenOddOverlay({
  gridSize,
  cellSize,
  parityMask,
}: EvenOddOverlayProps) {
  const shapes: React.ReactElement[] = []
  const fill = 'rgba(140, 140, 160, 0.18)'

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const ch = parityMask[r * gridSize + c]
      if (ch !== 'E' && ch !== 'O') continue
      const x = c * cellSize
      const y = r * cellSize
      const inset = cellSize * 0.18
      const size = cellSize - inset * 2
      if (ch === 'E') {
        shapes.push(
          <rect
            key={`E-${r}-${c}`}
            x={x + inset}
            y={y + inset}
            width={size}
            height={size}
            rx={cellSize * 0.1}
            fill={fill}
          />,
        )
      } else {
        shapes.push(
          <circle
            key={`O-${r}-${c}`}
            cx={x + cellSize / 2}
            cy={y + cellSize / 2}
            r={size / 2}
            fill={fill}
          />,
        )
      }
    }
  }

  return (
    <g data-testid="even-odd-overlay" pointerEvents="none">
      {shapes}
    </g>
  )
}
