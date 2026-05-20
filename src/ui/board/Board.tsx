import { useMemo } from 'react'
import { BoardCellsLayer } from './BoardCellsLayer'
import { OverlayLayer } from './OverlayLayer'
import type { Coord, Digit, Grid } from '@/engine'
import { cellAt, peersFromConstraints } from '@/engine'
import type { EdgeMark } from './overlays/EdgeMarkOverlay'
import type { ThermometerPath } from './overlays/ThermometerOverlay'
import type { ArrowShape } from './overlays/ArrowOverlay'
import type { CageShape } from './overlays/KillerOverlay'
import type { OutsideClueDisplay } from './overlays/OutsideClueOverlay'
import type { VariantPath } from './overlays/PathOverlay'

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
  /** Killer: cages. */
  readonly cages?: ReadonlyArray<CageShape>
  /** Little-killer / Sandwich / Skyscraper: outside-the-grid clues. */
  readonly outsideClues?: ReadonlyArray<OutsideClueDisplay>
  /** Palindrome / Renban / German Whispers: paths through cells. */
  readonly paths?: ReadonlyArray<VariantPath>
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
  cages,
  outsideClues,
  paths,
  onSelect,
}: BoardProps) {
  const size = grid.shape.size
  const boardPx = size * CELL_SIZE
  const margin = outsideClues && outsideClues.length > 0 ? CELL_SIZE * 0.6 : 0

  const peerSet = useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(peersFromConstraints(selected, grid).map((p) => `${p.r},${p.c}`))
  }, [selected, grid])

  const selectedValue = selected ? cellAt(grid, selected).value : null

  const conflictSet = useMemo(() => computeConflicts(grid), [grid])

  return (
    <svg
      role="grid"
      aria-label="Sudoku board"
      data-testid="board"
      viewBox={`${-margin} ${-margin} ${boardPx + margin * 2} ${boardPx + margin * 2}`}
      className="w-full max-w-[min(92vw,640px)] aspect-square select-none"
    >
      <rect x={0} y={0} width={boardPx} height={boardPx} fill="var(--color-surface)" />
      <BoardCellsLayer
        grid={grid}
        cellSize={CELL_SIZE}
        selectedCoord={selected}
        selectedValue={selectedValue}
        peerSet={peerSet}
        conflictSet={conflictSet}
        {...(lockedCells !== undefined ? { lockedCells } : {})}
        shakeKey={shakeKey}
        suppressBoxLines={variant === 'jigsaw'}
        onSelect={onSelect}
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
        {...(cages !== undefined ? { cages } : {})}
        {...(outsideClues !== undefined ? { outsideClues } : {})}
        {...(paths !== undefined ? { paths } : {})}
      />
    </svg>
  )
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
