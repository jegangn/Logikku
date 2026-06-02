import { useMemo } from 'react'
import { Cell } from './Cell'
import type { Coord, Digit, Grid } from '@/engine'
import { cellAt } from '@/engine'

export interface BoardCellsLayerProps {
  readonly grid: Grid
  readonly cellSize: number
  readonly selectedCoord: Coord | null
  readonly selectedValue: Digit | null
  readonly peerSet: ReadonlySet<string>
  readonly conflictSet: ReadonlySet<string>
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly suppressBoxLines?: boolean
  readonly withIndices?: boolean
  /** "r,c" of cell that should one-shot flash red (drag-drop rejected). */
  readonly rejectFlashCell?: string | null
  /** Monotonic counter so the same target can flash again on consecutive rejects. */
  readonly rejectFlashKey?: number
  /** "r,c" of the cell currently under a drag pointer (highlight as drop target). */
  readonly dragHoverCell?: string | null
  readonly onSelect: (coord: Coord) => void
}

export function BoardCellsLayer({
  grid,
  cellSize,
  selectedCoord,
  selectedValue,
  peerSet,
  conflictSet,
  lockedCells,
  shakeKey = 0,
  suppressBoxLines = false,
  withIndices = true,
  rejectFlashCell,
  rejectFlashKey = 0,
  dragHoverCell,
  onSelect,
}: BoardCellsLayerProps) {
  const size = grid.shape.size
  const rows = useMemo(() => {
    const s = grid.shape.size
    const out: React.ReactElement[] = []
    for (let r = 0; r < s; r++) {
      const rowCells: React.ReactElement[] = []
      for (let c = 0; c < s; c++) {
        const cell = cellAt(grid, { r, c })
        const key = `${r},${c}`
        const isSelected =
          selectedCoord !== null && selectedCoord.r === r && selectedCoord.c === c
        const peerHighlight = peerSet.has(key) && !isSelected
        const sameValue =
          selectedValue !== null && cell.value === selectedValue && !isSelected
        rowCells.push(
          <Cell
            key={key}
            coord={{ r, c }}
            cellSize={cellSize}
            gridSize={s}
            value={cell.value}
            candidates={cell.candidates}
            given={cell.given}
            selected={isSelected}
            peerHighlight={peerHighlight}
            sameValueHighlight={sameValue}
            conflict={conflictSet.has(key)}
            locked={lockedCells?.has(key) ?? false}
            shakeKey={shakeKey}
            withIndices={withIndices}
            onSelect={onSelect}
          />,
        )
      }
      out.push(
        <g
          key={`row-${r}`}
          role="row"
          {...(withIndices ? { 'aria-rowindex': r + 1 } : {})}
        >
          {rowCells}
        </g>,
      )
    }
    return out
  }, [grid, cellSize, selectedCoord, selectedValue, peerSet, conflictSet, lockedCells, shakeKey, withIndices, onSelect])

  const hoverRect = dragHoverCell ? parseKey(dragHoverCell) : null
  const flashRect = rejectFlashCell ? parseKey(rejectFlashCell) : null

  return (
    <g>
      {rows}
      <GridLines
        size={size}
        cellSize={cellSize}
        shape={grid.shape}
        suppressBoxLines={suppressBoxLines}
      />
      {hoverRect && (
        <rect
          data-testid="drag-hover"
          x={hoverRect.c * cellSize}
          y={hoverRect.r * cellSize}
          width={cellSize}
          height={cellSize}
          fill="var(--color-accent-soft)"
          stroke="var(--color-accent)"
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
      {flashRect && (
        <rect
          key={`reject-${rejectFlashKey}`}
          data-testid="reject-flash"
          data-reject="true"
          x={flashRect.c * cellSize}
          y={flashRect.r * cellSize}
          width={cellSize}
          height={cellSize}
          fill="var(--color-conflict-soft)"
          stroke="var(--color-conflict)"
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
    </g>
  )
}

function parseKey(key: string): { r: number; c: number } | null {
  const m = /^(\d+),(\d+)$/.exec(key)
  if (!m) return null
  const rs = m[1]
  const cs = m[2]
  if (rs === undefined || cs === undefined) return null
  return { r: Number(rs), c: Number(cs) }
}

function GridLines({
  size,
  cellSize,
  shape,
  suppressBoxLines,
}: {
  size: number
  cellSize: number
  shape: Grid['shape']
  suppressBoxLines: boolean
}) {
  const lines: React.ReactElement[] = []
  const total = size * cellSize
  for (let i = 0; i <= size; i++) {
    const heavy = !suppressBoxLines && i % shape.boxCols === 0
    const isEdge = i === 0 || i === size
    const stroke = heavy || isEdge ? 'var(--color-border-strong)' : 'var(--color-border)'
    const w = heavy || isEdge ? 2.5 : 1
    lines.push(
      <line
        key={`v-${i}`}
        x1={i * cellSize}
        y1={0}
        x2={i * cellSize}
        y2={total}
        stroke={stroke}
        strokeWidth={w}
      />,
    )
  }
  for (let i = 0; i <= size; i++) {
    const heavy = !suppressBoxLines && i % shape.boxRows === 0
    const isEdge = i === 0 || i === size
    const stroke = heavy || isEdge ? 'var(--color-border-strong)' : 'var(--color-border)'
    const w = heavy || isEdge ? 2.5 : 1
    lines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={i * cellSize}
        x2={total}
        y2={i * cellSize}
        stroke={stroke}
        strokeWidth={w}
      />,
    )
  }
  return <g pointerEvents="none">{lines}</g>
}
