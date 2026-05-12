export interface JigsawOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  /** Per-cell piece id (0..size-1). Length `size*size`, row-major. */
  readonly pieceMap: ReadonlyArray<number>
}

/**
 * Draws thick borders along edges where two adjacent cells belong to
 * different jigsaw pieces. Renders as overlay SVG segments at cell
 * boundaries — independent of the base grid lines.
 */
export function JigsawOverlay({ gridSize, cellSize, pieceMap }: JigsawOverlayProps) {
  const segments: React.ReactElement[] = []
  const stroke = 'var(--color-border-strong)'
  const w = 3

  function pieceAt(r: number, c: number): number {
    if (r < 0 || c < 0 || r >= gridSize || c >= gridSize) return -1
    return pieceMap[r * gridSize + c]!
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const p = pieceAt(r, c)
      // Right edge between (r,c) and (r,c+1)
      if (c < gridSize - 1 && pieceAt(r, c + 1) !== p) {
        const x = (c + 1) * cellSize
        segments.push(
          <line
            key={`v-${r}-${c}`}
            x1={x}
            y1={r * cellSize}
            x2={x}
            y2={(r + 1) * cellSize}
            stroke={stroke}
            strokeWidth={w}
          />,
        )
      }
      // Bottom edge between (r,c) and (r+1,c)
      if (r < gridSize - 1 && pieceAt(r + 1, c) !== p) {
        const y = (r + 1) * cellSize
        segments.push(
          <line
            key={`h-${r}-${c}`}
            x1={c * cellSize}
            y1={y}
            x2={(c + 1) * cellSize}
            y2={y}
            stroke={stroke}
            strokeWidth={w}
          />,
        )
      }
    }
  }

  return (
    <g data-testid="jigsaw-overlay" pointerEvents="none">
      {segments}
    </g>
  )
}
