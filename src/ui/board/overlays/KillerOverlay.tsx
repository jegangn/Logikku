export interface CageShape {
  readonly id: string
  readonly cells: ReadonlyArray<{ readonly r: number; readonly c: number }>
  readonly sum: number
}

export interface KillerOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly cages: ReadonlyArray<CageShape>
}

/**
 * Draws dashed borders around each cage (inset slightly so they don't overlap
 * the box grid lines) and writes the cage sum in the top-left of the cage's
 * anchor cell (the leftmost cell in the topmost row of the cage).
 *
 * Cage tinting: each cage gets a low-alpha background colour cycled from a
 * 6-colour palette. The palette index is assigned greedily so that no two
 * orthogonally adjacent cages share the same colour (graph 4-colouring-ish;
 * 6 colours is more than enough headroom).
 */
export function KillerOverlay({
  gridSize,
  cellSize,
  cages,
}: KillerOverlayProps) {
  if (cages.length === 0) {
    return <g data-testid="killer-overlay" pointerEvents="none" />
  }

  // Build cage-id-per-cell map.
  const cageIdByCell = new Map<string, string>()
  const cageById = new Map<string, CageShape>()
  for (const cage of cages) {
    cageById.set(cage.id, cage)
    for (const co of cage.cells) cageIdByCell.set(`${co.r},${co.c}`, cage.id)
  }

  function cageAt(r: number, c: number): string | null {
    if (r < 0 || c < 0 || r >= gridSize || c >= gridSize) return null
    return cageIdByCell.get(`${r},${c}`) ?? null
  }

  // Greedy colouring against orthogonal-cage adjacency.
  const adjacency = new Map<string, Set<string>>()
  for (const cage of cages) adjacency.set(cage.id, new Set())
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const id = cageAt(r, c)
      if (!id) continue
      const right = cageAt(r, c + 1)
      const down = cageAt(r + 1, c)
      if (right && right !== id) {
        adjacency.get(id)!.add(right)
        adjacency.get(right)!.add(id)
      }
      if (down && down !== id) {
        adjacency.get(id)!.add(down)
        adjacency.get(down)!.add(id)
      }
    }
  }
  const colorIndex = new Map<string, number>()
  // Order cages by descending degree, then by id for determinism.
  const ordered = [...cages].sort((a, b) => {
    const da = adjacency.get(a.id)!.size
    const db = adjacency.get(b.id)!.size
    if (db !== da) return db - da
    return a.id.localeCompare(b.id)
  })
  for (const cage of ordered) {
    const used = new Set<number>()
    for (const neighbour of adjacency.get(cage.id)!) {
      const ci = colorIndex.get(neighbour)
      if (ci !== undefined) used.add(ci)
    }
    let pick = 0
    while (used.has(pick)) pick++
    colorIndex.set(cage.id, pick % 6)
  }

  // 6-colour pastel palette (theme-aware tokens; layered below the cell text).
  // Dark/light alphas are tuned per theme in index.css so cages stay legible
  // on the near-black board without overpowering the light board.
  const PALETTE = [
    'var(--cage-1)',
    'var(--cage-2)',
    'var(--cage-3)',
    'var(--cage-4)',
    'var(--cage-5)',
    'var(--cage-6)',
  ]

  // Per-cage anchor cell (topmost row, then leftmost column).
  function anchor(cage: CageShape): { r: number; c: number } {
    let best = cage.cells[0]!
    for (const co of cage.cells) {
      if (co.r < best.r || (co.r === best.r && co.c < best.c)) {
        best = co
      }
    }
    return { r: best.r, c: best.c }
  }

  const inset = 4
  const tintRects: React.ReactElement[] = []
  for (const cage of cages) {
    const idx = colorIndex.get(cage.id) ?? 0
    const fill = PALETTE[idx]!
    for (const co of cage.cells) {
      tintRects.push(
        <rect
          key={`tint-${cage.id}-${co.r}-${co.c}`}
          x={co.c * cellSize}
          y={co.r * cellSize}
          width={cellSize}
          height={cellSize}
          fill={fill}
          pointerEvents="none"
        />,
      )
    }
  }

  const borderSegments: React.ReactElement[] = []
  const stroke = 'var(--color-border-strong)'
  const dash = '4 3'
  const w = 1.2

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const id = cageAt(r, c)
      if (!id) continue
      const x = c * cellSize
      const y = r * cellSize
      // Top
      if (cageAt(r - 1, c) !== id) {
        borderSegments.push(
          <line
            key={`top-${r}-${c}`}
            x1={x + inset}
            y1={y + inset}
            x2={x + cellSize - inset}
            y2={y + inset}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray={dash}
          />,
        )
      }
      // Bottom
      if (cageAt(r + 1, c) !== id) {
        borderSegments.push(
          <line
            key={`bot-${r}-${c}`}
            x1={x + inset}
            y1={y + cellSize - inset}
            x2={x + cellSize - inset}
            y2={y + cellSize - inset}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray={dash}
          />,
        )
      }
      // Left
      if (cageAt(r, c - 1) !== id) {
        borderSegments.push(
          <line
            key={`left-${r}-${c}`}
            x1={x + inset}
            y1={y + inset}
            x2={x + inset}
            y2={y + cellSize - inset}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray={dash}
          />,
        )
      }
      // Right
      if (cageAt(r, c + 1) !== id) {
        borderSegments.push(
          <line
            key={`right-${r}-${c}`}
            x1={x + cellSize - inset}
            y1={y + inset}
            x2={x + cellSize - inset}
            y2={y + cellSize - inset}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray={dash}
          />,
        )
      }
    }
  }

  const sumLabels: React.ReactElement[] = []
  for (const cage of cages) {
    const a = anchor(cage)
    sumLabels.push(
      <text
        key={`sum-${cage.id}`}
        x={a.c * cellSize + inset + 2}
        y={a.r * cellSize + inset + 11}
        fontSize={13}
        fontWeight={700}
        fill="var(--color-text)"
        pointerEvents="none"
      >
        {cage.sum}
      </text>,
    )
  }

  return (
    <g data-testid="killer-overlay" pointerEvents="none">
      {tintRects}
      {borderSegments}
      {sumLabels}
    </g>
  )
}
