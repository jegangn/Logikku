export type PathKind = 'palindrome' | 'renban' | 'german-whispers'

export interface VariantPath {
  readonly id: string
  readonly kind: PathKind
  readonly cells: ReadonlyArray<{ readonly r: number; readonly c: number }>
}

export interface PathOverlayProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly paths: ReadonlyArray<VariantPath>
}

const STROKE: Record<PathKind, string> = {
  palindrome: 'rgba(120, 120, 130, 0.55)',
  renban: 'rgba(155, 89, 182, 0.55)',
  'german-whispers': 'rgba(86, 156, 105, 0.6)',
}

/**
 * Renders each path as a single SVG <path> drawn through cell centers with
 * rounded line caps and joins so corners look smooth without per-bend logic.
 * Path color is keyed off `kind`.
 */
export function PathOverlay({ cellSize, paths }: PathOverlayProps) {
  const elems: React.ReactElement[] = []
  for (const p of paths) {
    if (p.cells.length === 0) continue
    const d = p.cells
      .map((co, i) => {
        const x = (co.c + 0.5) * cellSize
        const y = (co.r + 0.5) * cellSize
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
    elems.push(
      <path
        key={`${p.kind}-${p.id}`}
        data-testid={`path-${p.kind}-${p.id}`}
        d={d}
        fill="none"
        stroke={STROKE[p.kind]}
        strokeWidth={cellSize * 0.34}
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    )
  }
  return (
    <g data-testid="path-overlay" pointerEvents="none">
      {elems}
    </g>
  )
}
