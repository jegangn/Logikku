export type EdgeMarkKind = 'white-dot' | 'black-dot' | 'x' | 'v' | 'gt' | 'lt'

export interface EdgeMark {
  readonly from: { readonly r: number; readonly c: number }
  readonly to: { readonly r: number; readonly c: number }
  readonly kind: EdgeMarkKind
}

export interface EdgeMarkOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly edges: ReadonlyArray<EdgeMark>
}

/**
 * Renders Kropki dots, XV glyphs, and Greater-Than arrows on shared cell
 * borders. `kind` discriminator picks the visual: dots/text/arrow.
 */
export function EdgeMarkOverlay({
  cellSize,
  edges,
}: EdgeMarkOverlayProps) {
  const elems: React.ReactElement[] = []
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!
    const ax = (e.from.c + 0.5) * cellSize
    const ay = (e.from.r + 0.5) * cellSize
    const bx = (e.to.c + 0.5) * cellSize
    const by = (e.to.r + 0.5) * cellSize
    const mx = (ax + bx) / 2
    const my = (ay + by) / 2
    const key = `${i}-${e.from.r}-${e.from.c}-${e.to.r}-${e.to.c}`
    if (e.kind === 'white-dot') {
      elems.push(
        <circle
          key={`wd-${key}`}
          data-testid={`edge-mark-${e.from.r}-${e.from.c}-${e.to.r}-${e.to.c}`}
          data-kind="white-dot"
          cx={mx}
          cy={my}
          r={cellSize * 0.1}
          fill="var(--color-surface)"
          stroke="var(--color-border-strong)"
          strokeWidth={1.5}
        />,
      )
    } else if (e.kind === 'black-dot') {
      elems.push(
        <circle
          key={`bd-${key}`}
          data-testid={`edge-mark-${e.from.r}-${e.from.c}-${e.to.r}-${e.to.c}`}
          data-kind="black-dot"
          cx={mx}
          cy={my}
          r={cellSize * 0.1}
          fill="var(--color-text)"
        />,
      )
    } else if (e.kind === 'x' || e.kind === 'v') {
      const glyph = e.kind === 'x' ? 'X' : 'V'
      elems.push(
        <g
          key={`xv-${key}`}
          data-testid={`edge-mark-${e.from.r}-${e.from.c}-${e.to.r}-${e.to.c}`}
          data-kind={e.kind}
        >
          <rect
            x={mx - cellSize * 0.12}
            y={my - cellSize * 0.12}
            width={cellSize * 0.24}
            height={cellSize * 0.24}
            fill="var(--color-surface)"
            stroke="var(--color-border-strong)"
            strokeWidth={1}
            rx={cellSize * 0.04}
          />
          <text
            x={mx}
            y={my}
            fontSize={cellSize * 0.22}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--color-text)"
            fontFamily="ui-sans-serif, system-ui"
          >
            {glyph}
          </text>
        </g>,
      )
    } else if (e.kind === 'gt' || e.kind === 'lt') {
      // Arrow points from larger to smaller (gt: from > to → arrow from→to).
      // For 'lt' (from < to): reverse.
      const big = e.kind === 'gt' ? e.from : e.to
      const small = e.kind === 'gt' ? e.to : e.from
      const horizontal = big.r === small.r
      const path = arrowPath(big, small, cellSize, horizontal)
      elems.push(
        <path
          key={`gt-${key}`}
          data-testid={`edge-mark-${e.from.r}-${e.from.c}-${e.to.r}-${e.to.c}`}
          data-kind={e.kind}
          d={path}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      )
    }
  }
  return (
    <g data-testid="edge-mark-overlay" pointerEvents="none">
      {elems}
    </g>
  )
}

function arrowPath(
  big: { r: number; c: number },
  small: { r: number; c: number },
  cellSize: number,
  horizontal: boolean,
): string {
  // Arrow chevron `>` pointing toward `small`, drawn at the midpoint of the
  // edge. Size scales with cellSize.
  const mid = {
    x: ((big.c + small.c + 1) / 2) * cellSize,
    y: ((big.r + small.r + 1) / 2) * cellSize,
  }
  const s = cellSize * 0.16
  if (horizontal) {
    // Pointing left or right.
    const pointRight = small.c > big.c
    const sign = pointRight ? 1 : -1
    return [
      `M ${mid.x - sign * s} ${mid.y - s}`,
      `L ${mid.x + sign * s} ${mid.y}`,
      `L ${mid.x - sign * s} ${mid.y + s}`,
    ].join(' ')
  }
  const pointDown = small.r > big.r
  const sign = pointDown ? 1 : -1
  return [
    `M ${mid.x - s} ${mid.y - sign * s}`,
    `L ${mid.x} ${mid.y + sign * s}`,
    `L ${mid.x + s} ${mid.y - sign * s}`,
  ].join(' ')
}
