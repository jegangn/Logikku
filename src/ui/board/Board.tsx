import { useMemo } from 'react'
import { Cell } from './Cell'
import { OverlayLayer } from './OverlayLayer'
import type { Coord, Digit, Grid } from '@/engine'
import { cellAt, peersFromConstraints } from '@/engine'
import type { EdgeMark } from './overlays/EdgeMarkOverlay'
import type { ThermometerPath } from './overlays/ThermometerOverlay'
import type { ArrowShape } from './overlays/ArrowOverlay'

export interface BoardProps {
  readonly grid: Grid
  readonly selected: Coord | null
  readonly variant?: string
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  /** Jigsaw: per-cell piece id, length size*size. */
  readonly jigsawPieceMap?: ReadonlyArray<number>
  /** Even-Odd: parity mask string, length size*size. */
  readonly parityMask?: string
  /** Kropki / XV / Greater-Than: edge marks. */
  readonly edges?: ReadonlyArray<EdgeMark>
  /** Thermometer: paths from bulb to tip. */
  readonly thermometers?: ReadonlyArray<ThermometerPath>
  /** Arrow: head + tail. */
  readonly arrows?: ReadonlyArray<ArrowShape>
  readonly onSelect: (coord: Coord) => void
}

const CELL_SIZE = 64

export function Board({
  grid,
  selected,
  variant,
  lockedCells,
  shakeKey = 0,
  jigsawPieceMap,
  parityMask,
  edges,
  thermometers,
  arrows,
  onSelect,
}: BoardProps) {
  const size = grid.shape.size
  const boardPx = size * CELL_SIZE

  const peerSet = useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(peersFromConstraints(selected, grid).map((p) => `${p.r},${p.c}`))
  }, [selected, grid])

  const selectedValue = selected ? cellAt(grid, selected).value : null

  const conflictSet = useMemo(() => computeConflicts(grid), [grid])

  const rows: React.ReactElement[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cellAt(grid, { r, c })
      const key = `${r},${c}`
      const isSelected = selected !== null && selected.r === r && selected.c === c
      const peerHighlight = peerSet.has(key) && !isSelected
      const sameValue =
        selectedValue !== null &&
        cell.value === selectedValue &&
        !isSelected
      rows.push(
        <Cell
          key={key}
          coord={{ r, c }}
          cellSize={CELL_SIZE}
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

  return (
    <svg
      role="grid"
      aria-label="Sudoku board"
      data-testid="board"
      viewBox={`0 0 ${boardPx} ${boardPx}`}
      className="w-full max-w-[min(92vw,640px)] aspect-square select-none"
    >
      <rect
        x={0}
        y={0}
        width={boardPx}
        height={boardPx}
        fill="var(--color-surface)"
      />
      {rows}
      <GridLines
        size={size}
        cellSize={CELL_SIZE}
        shape={grid.shape}
        suppressBoxLines={variant === 'jigsaw'}
      />
      <OverlayLayer
        gridSize={size}
        cellSize={CELL_SIZE}
        {...(variant !== undefined ? { variant } : {})}
        {...(jigsawPieceMap !== undefined ? { jigsawPieceMap } : {})}
        {...(parityMask !== undefined ? { parityMask } : {})}
        {...(edges !== undefined ? { edges } : {})}
        {...(thermometers !== undefined ? { thermometers } : {})}
        {...(arrows !== undefined ? { arrows } : {})}
      />
    </svg>
  )
}

function GridLines({
  size,
  cellSize,
  shape,
  suppressBoxLines = false,
}: {
  size: number
  cellSize: number
  shape: Grid['shape']
  suppressBoxLines?: boolean
}) {
  const lines: React.ReactElement[] = []
  const total = size * cellSize
  for (let i = 0; i <= size; i++) {
    const heavy = !suppressBoxLines && i % shape.boxCols === 0
    const isEdge = i === 0 || i === size
    const stroke =
      heavy || isEdge ? 'var(--color-border-strong)' : 'var(--color-border)'
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
    const stroke =
      heavy || isEdge ? 'var(--color-border-strong)' : 'var(--color-border)'
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

function computeConflicts(grid: Grid): ReadonlySet<string> {
  const out = new Set<string>()
  for (const constraint of grid.constraints) {
    for (const region of constraint.regions) {
      const byDigit = new Map<Digit, Coord[]>()
      for (const coord of region.cells) {
        const cell = cellAt(grid, coord)
        if (cell.value === null) continue
        const list = byDigit.get(cell.value) ?? []
        list.push(coord)
        byDigit.set(cell.value, list)
      }
      for (const list of byDigit.values()) {
        if (list.length > 1) {
          for (const co of list) out.add(`${co.r},${co.c}`)
        }
      }
    }
    if (constraint.findConflicts) {
      for (const co of constraint.findConflicts(grid)) {
        out.add(`${co.r},${co.c}`)
      }
    }
  }
  return out
}
