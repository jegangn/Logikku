import { memo } from 'react'
import type { Coord, Digit } from '@/engine'
import { glyphForDigit } from '@/ui/glyph'

export interface CellProps {
  readonly coord: Coord
  readonly cellSize: number
  readonly gridSize: number
  readonly value: Digit | null
  readonly candidates: ReadonlySet<Digit>
  readonly given: boolean
  readonly selected: boolean
  readonly peerHighlight: boolean
  readonly sameValueHighlight: boolean
  readonly conflict: boolean
  readonly locked: boolean
  readonly shakeKey: number
  readonly withIndices?: boolean
  readonly onSelect: (coord: Coord) => void
}

function CellImpl(props: CellProps) {
  const {
    coord,
    cellSize,
    gridSize,
    value,
    candidates,
    given,
    selected,
    peerHighlight,
    sameValueHighlight,
    conflict,
    locked,
    shakeKey,
    withIndices = true,
    onSelect,
  } = props

  const x = coord.c * cellSize
  const y = coord.r * cellSize
  const fillColor = selected
    ? 'var(--color-accent-soft)'
    : sameValueHighlight
      ? 'rgba(139, 108, 243, 0.10)'
      : peerHighlight
        ? 'rgba(255, 255, 255, 0.03)'
        : 'transparent'

  return (
    <g
      key={`${coord.r}-${coord.c}-${locked ? shakeKey : 'free'}`}
      data-testid={`cell-${coord.r}-${coord.c}`}
      data-cell-r={coord.r}
      data-cell-c={coord.c}
      data-sound="select"
      data-selected={selected ? 'true' : 'false'}
      data-conflict={conflict ? 'true' : 'false'}
      data-given={given ? 'true' : 'false'}
      data-locked={locked ? 'true' : 'false'}
      onPointerDown={() => onSelect(coord)}
      role="gridcell"
      aria-label={ariaLabel(coord, value, given)}
      {...(withIndices ? { 'aria-colindex': coord.c + 1 } : {})}
      tabIndex={-1}
      style={{ cursor: 'pointer' }}
    >
      <rect x={x} y={y} width={cellSize} height={cellSize} fill={fillColor} />
      {value !== null ? (
        <text
          x={x + cellSize / 2}
          y={y + cellSize / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={cellSize * 0.56}
          fontWeight={given ? 600 : 500}
          fill={
            conflict
              ? 'var(--color-conflict)'
              : given
                ? 'var(--color-given)'
                : 'var(--color-entered)'
          }
        >
          {glyphForDigit(value)}
        </text>
      ) : (
        <PencilMarks
          x={x}
          y={y}
          cellSize={cellSize}
          gridSize={gridSize}
          candidates={candidates}
        />
      )}
      {conflict && value !== null && (
        <rect
          x={x + 2}
          y={y + 2}
          width={cellSize - 4}
          height={cellSize - 4}
          fill="none"
          stroke="var(--color-conflict)"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}
    </g>
  )
}

function PencilMarks({
  x,
  y,
  cellSize,
  gridSize,
  candidates,
}: {
  x: number
  y: number
  cellSize: number
  gridSize: number
  candidates: ReadonlySet<Digit>
}) {
  if (candidates.size === 0) return null
  const cols = gridSize > 9 ? 4 : 3
  const cellSlot = cellSize / cols
  const fontSize = cellSize * (gridSize > 9 ? 0.14 : 0.18)
  const nodes: React.ReactElement[] = []
  for (let d = 1; d <= gridSize; d++) {
    if (!candidates.has(d as Digit)) continue
    const slotR = Math.floor((d - 1) / cols)
    const slotC = (d - 1) % cols
    nodes.push(
      <text
        key={d}
        x={x + cellSlot * (slotC + 0.5)}
        y={y + cellSlot * (slotR + 0.5)}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fill="var(--color-text-muted)"
      >
        {glyphForDigit(d as Digit)}
      </text>,
    )
  }
  return <>{nodes}</>
}

function ariaLabel(coord: Coord, value: Digit | null, given: boolean): string {
  const cellName = `Row ${coord.r + 1} Column ${coord.c + 1}`
  if (value === null) return `${cellName}, empty`
  return `${cellName}, ${given ? 'given' : 'entered'} ${glyphForDigit(value)}`
}

export const Cell = memo(CellImpl)
