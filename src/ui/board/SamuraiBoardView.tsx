import { BoardCellsLayer } from './BoardCellsLayer'
import { useT } from '@/i18n'
import type { Coord, Digit, SamuraiBoard } from '@/engine'
import {
  peersFromConstraints,
  samuraiCellAt,
  samuraiConflicts,
  samuraiSharedLocations,
} from '@/engine'

export interface SamuraiBoardViewProps {
  readonly board: SamuraiBoard
  readonly selected: { readonly gridIdx: number; readonly coord: Coord } | null
  readonly lockedCells?: ReadonlySet<string>
  readonly shakeKey?: number
  readonly onSelect: (target: {
    readonly gridIdx: number
    readonly coord: Coord
  }) => void
}

const CELL_SIZE = 30

// Position each sub-grid in cell units within the 21×21 cruciform.
// x = column offset, y = row offset (SVG convention).
// idx 0 = center, idx 1 = NW, idx 2 = NE, idx 3 = SW, idx 4 = SE
const SUB_GRID_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 6, y: 6 },
  1: { x: 0, y: 0 },
  2: { x: 12, y: 0 },
  3: { x: 0, y: 12 },
  4: { x: 12, y: 12 },
}

const SIDE_PX = 21 * CELL_SIZE

interface SubGridState {
  readonly selectedCoord: Coord | null
  readonly selectedValue: Digit | null
  readonly peerSet: ReadonlySet<string>
  readonly conflictSet: ReadonlySet<string>
}

function computeSubGridState(
  board: SamuraiBoard,
  gridIdx: number,
  selected: { gridIdx: number; coord: Coord } | null,
  globalConflicts: ReadonlySet<string>,
): SubGridState {
  let selectedCoord: Coord | null = null
  let selectedValue: Digit | null = null
  if (selected !== null) {
    const locs = samuraiSharedLocations(board, selected.gridIdx, selected.coord)
    const match = locs.find((l) => l.grid === gridIdx)
    if (match !== undefined) {
      selectedCoord = match.coord
      selectedValue = samuraiCellAt(board, gridIdx, match.coord).value
    }
  }
  const peerSet = new Set<string>()
  if (selectedCoord !== null) {
    const grid = board.grids[gridIdx]!
    for (const p of peersFromConstraints(selectedCoord, grid)) {
      peerSet.add(`${p.r},${p.c}`)
    }
  }
  const prefix = `${gridIdx},`
  const conflictSet = new Set<string>()
  for (const k of globalConflicts) {
    if (k.startsWith(prefix)) {
      conflictSet.add(k.slice(prefix.length))
    } else {
      // If a shared partner in another grid is conflicted, mark this grid's
      // mirror cell too so the visual state matches the global conflict.
      for (const entries of board.sharedCells.values()) {
        const conflicted = entries.find((e) => `${e.grid},${e.coord.r},${e.coord.c}` === k)
        if (conflicted === undefined) continue
        const mirror = entries.find((e) => e.grid === gridIdx)
        if (mirror !== undefined) {
          conflictSet.add(`${mirror.coord.r},${mirror.coord.c}`)
        }
      }
    }
  }
  return { selectedCoord, selectedValue, peerSet, conflictSet }
}

// Paint corners 1–4 first, center (0) last so the center grid's box
// lines render on top of the overlap regions.
const PAINT_ORDER: ReadonlyArray<number> = [1, 2, 3, 4, 0]

export function SamuraiBoardView({
  board,
  selected,
  lockedCells,
  shakeKey,
  onSelect,
}: SamuraiBoardViewProps) {
  const t = useT()
  // Recompute every render: the samurai input mutates board in place and the
  // outer SamuraiBoard ref is preserved across set(), so useMemo([board]) would
  // serve stale conflicts. Conflict detection is O(5 × 27 × 9) — cheap.
  const globalConflicts = samuraiConflicts(board)

  return (
    <svg
      role="grid"
      aria-label={t.play.samuraiBoardLabel}
      data-testid="samurai-board"
      viewBox={`0 0 ${SIDE_PX} ${SIDE_PX}`}
      className="w-full max-w-[min(92vh,720px)] aspect-square select-none"
    >
      <rect x={0} y={0} width={SIDE_PX} height={SIDE_PX} fill="var(--color-surface)" />
      {PAINT_ORDER.map((gridIdx) => {
        const pos = SUB_GRID_POSITIONS[gridIdx]!
        const state = computeSubGridState(board, gridIdx, selected, globalConflicts)
        return (
          <g
            key={gridIdx}
            data-testid={`samurai-subgrid-${gridIdx}`}
            transform={`translate(${pos.x * CELL_SIZE}, ${pos.y * CELL_SIZE})`}
          >
            <BoardCellsLayer
              grid={board.grids[gridIdx]!}
              cellSize={CELL_SIZE}
              selectedCoord={state.selectedCoord}
              selectedValue={state.selectedValue}
              peerSet={state.peerSet}
              conflictSet={state.conflictSet}
              withIndices={false}
              {...(lockedCells !== undefined ? { lockedCells } : {})}
              {...(shakeKey !== undefined ? { shakeKey } : {})}
              onSelect={(coord) => onSelect({ gridIdx, coord })}
            />
          </g>
        )
      })}
    </svg>
  )
}
