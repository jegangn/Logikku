export interface ArrowShape {
  readonly id: string
  readonly head: ReadonlyArray<{ readonly r: number; readonly c: number }>
  readonly tail: ReadonlyArray<{ readonly r: number; readonly c: number }>
}

export interface ArrowOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly arrows: ReadonlyArray<ArrowShape>
}

/**
 * Render each arrow as:
 *  - A hollow circle around each head cell (or a "pill" wrapping a 2-cell head)
 *  - A polyline along the tail starting at the last head cell and ending at
 *    the tip (last tail cell) with a small arrowhead chevron.
 */
export function ArrowOverlay({ cellSize, arrows }: ArrowOverlayProps) {
  const elems: React.ReactElement[] = []
  for (let i = 0; i < arrows.length; i++) {
    const a = arrows[i]!
    if (a.head.length === 0 || a.tail.length === 0) continue

    // Head circles / pill.
    if (a.head.length === 1) {
      const h = a.head[0]!
      elems.push(
        <circle
          key={`head-${a.id}`}
          cx={(h.c + 0.5) * cellSize}
          cy={(h.r + 0.5) * cellSize}
          r={cellSize * 0.4}
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth={1.8}
        />,
      )
    } else {
      // 2-cell head: render two adjacent circles (or a pill — easier with two
      // overlapping circles for any orientation).
      for (let hi = 0; hi < a.head.length; hi++) {
        const h = a.head[hi]!
        elems.push(
          <circle
            key={`head-${a.id}-${hi}`}
            cx={(h.c + 0.5) * cellSize}
            cy={(h.r + 0.5) * cellSize}
            r={cellSize * 0.4}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth={1.8}
          />,
        )
      }
    }

    // Tail polyline: starts at the last head cell, walks through tail cells.
    const lastHead = a.head[a.head.length - 1]!
    const points = [
      { r: lastHead.r, c: lastHead.c },
      ...a.tail,
    ]
      .map((co) => `${(co.c + 0.5) * cellSize},${(co.r + 0.5) * cellSize}`)
      .join(' ')
    elems.push(
      <polyline
        key={`tail-${a.id}`}
        points={points}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    )

    // Arrowhead at the tip.
    const tip = a.tail[a.tail.length - 1]!
    const prev =
      a.tail.length >= 2
        ? a.tail[a.tail.length - 2]!
        : { r: lastHead.r, c: lastHead.c }
    const tipX = (tip.c + 0.5) * cellSize
    const tipY = (tip.r + 0.5) * cellSize
    const prevX = (prev.c + 0.5) * cellSize
    const prevY = (prev.r + 0.5) * cellSize
    const dx = tipX - prevX
    const dy = tipY - prevY
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const s = cellSize * 0.18
    // Two side points of the chevron, offset perpendicular to direction.
    const baseX = tipX - ux * s
    const baseY = tipY - uy * s
    const px = -uy
    const py = ux
    const leftX = baseX + px * s
    const leftY = baseY + py * s
    const rightX = baseX - px * s
    const rightY = baseY - py * s
    elems.push(
      <path
        key={`tip-${a.id}`}
        d={`M ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY}`}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    )
  }
  return (
    <g data-testid="arrow-overlay" pointerEvents="none">
      {elems}
    </g>
  )
}
