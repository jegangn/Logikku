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
  onSelect,
}: BoardCellsLayerProps) {
  const size = grid.shape.size
  const cells = useMemo(() => {
    const out: React.ReactElement[] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = cellAt(grid, { r, c })
        const key = `${r},${c}`
        const isSelected =
          selectedCoord !== null && selectedCoord.r === r && selectedCoord.c === c
        const peerHighlight = peerSet.has(key) && !isSelected
        const sameValue =
          selectedValue !== null &&
          cell.value === selectedValue &&
          !isSelected
        out.push(
          <Cell
            key={key}
            coord={{ r, c }}
            cellSize={cellSize}
            gridSize={size}
            value={cell.value}
            candidates={cell.candidates}
            given={cell.given}
            selected={isSelected}
            peerHighlight={peerHighlight}
            sameValueHighlight={sameValue}
            conflict={conflictSet.has(key)}
            locked={lockedCells?.has(key) ?? false}
            shakeKey={shakeKey}
            onSelect={onSelect}
          />,
        )
      }
    }
    return out
  }, [grid, cellSize, selectedCoord, selectedValue, peerSet, conflictSet, lockedCells, shakeKey, onSelect])

  return (
    <g>
      {cells}
      <GridLines
        size={size}
        cellSize={cellSize}
        shape={grid.shape}
        suppressBoxLines={suppressBoxLines}
      />
    </g>
  )
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
