export type OutsideSide = 'top' | 'bottom' | 'left' | 'right'
export type DiagonalDir = 'NE' | 'NW' | 'SE' | 'SW'

export interface OutsideClueDisplay {
  readonly id: string
  readonly side: OutsideSide
  readonly index: number
  readonly label: string
  /** Optional diagonal arrow direction (Little Killer only). */
  readonly direction?: DiagonalDir
}

export interface OutsideClueOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly clues: ReadonlyArray<OutsideClueDisplay>
}

/**
 * Renders clue glyphs in the margins around the board. The board's viewBox
 * is `0..gridSize*cellSize`; this overlay draws into the margin region by
 * positioning glyphs at coordinates outside that interior box. Callers must
 * ensure the parent SVG has enough room (the Board component reserves a
 * margin via its own viewBox when this overlay is in play).
 */
export function OutsideClueOverlay({
  gridSize,
  cellSize,
  clues,
}: OutsideClueOverlayProps) {
  const elems: React.ReactElement[] = []
  const half = cellSize / 2
  const fontSize = Math.max(11, Math.round(cellSize * 0.32))

  for (const clue of clues) {
    let cx: number
    let cy: number
    if (clue.side === 'top') {
      cx = clue.index * cellSize + half
      cy = -half + 6
    } else if (clue.side === 'bottom') {
      cx = clue.index * cellSize + half
      cy = gridSize * cellSize + half - 6
    } else if (clue.side === 'left') {
      cx = -half + 6
      cy = clue.index * cellSize + half
    } else {
      cx = gridSize * cellSize + half - 6
      cy = clue.index * cellSize + half
    }
    elems.push(
      <text
        key={`label-${clue.id}`}
        x={cx}
        y={cy}
        fontSize={fontSize}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-text-muted)"
        fontWeight={600}
      >
        {clue.label}
      </text>,
    )
    if (clue.direction) {
      // Draw a small diagonal arrow next to the label pointing into the grid.
      const len = cellSize * 0.28
      let dx: number
      let dy: number
      if (clue.direction === 'SE') {
        dx = len
        dy = len
      } else if (clue.direction === 'SW') {
        dx = -len
        dy = len
      } else if (clue.direction === 'NE') {
        dx = len
        dy = -len
      } else {
        dx = -len
        dy = -len
      }
      // Origin offset from the label so the arrow doesn't overlap the digit.
      let ox = 0
      let oy = 0
      if (clue.side === 'top') oy = fontSize * 0.4
      else if (clue.side === 'bottom') oy = -fontSize * 0.4
      else if (clue.side === 'left') ox = fontSize * 0.5
      else ox = -fontSize * 0.5

      const sx = cx + ox
      const sy = cy + oy
      const ex = sx + dx
      const ey = sy + dy
      // Tip + chevron
      const ux = dx / len
      const uy = dy / len
      const px = -uy
      const py = ux
      const tipBase = cellSize * 0.12
      const lx = ex - ux * tipBase + px * tipBase * 0.7
      const ly = ey - uy * tipBase + py * tipBase * 0.7
      const rx = ex - ux * tipBase - px * tipBase * 0.7
      const ry = ey - uy * tipBase - py * tipBase * 0.7
      elems.push(
        <g key={`arrow-${clue.id}`}>
          <line
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke="var(--color-text-muted)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <path
            d={`M ${lx} ${ly} L ${ex} ${ey} L ${rx} ${ry}`}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>,
      )
    }
  }

  return (
    <g data-testid="outside-clue-overlay" pointerEvents="none">
      {elems}
    </g>
  )
}
