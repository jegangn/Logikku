import { create } from 'zustand'
import {
  CLASSIC_9,
  cellAt,
  cloneGrid,
  createClassicConstraint,
  parsePuzzle,
  setValue,
  type Coord,
  type Digit,
  type Grid,
} from '@/engine'

export type InputMode = 'value' | 'pencil' | 'erase'

export interface GameState {
  grid: Grid | null
  puzzleId: string | null
  selected: Coord | null
  mode: InputMode
  loadPuzzle: (id: string, givens: string) => void
  select: (coord: Coord | null) => void
  setMode: (mode: InputMode) => void
  input: (digit: Digit) => void
  erase: () => void
}

function freshGridFromGivens(givens: string): Grid {
  const constraint = createClassicConstraint({ shape: CLASSIC_9 })
  const grid: Grid = { ...parsePuzzle(givens, CLASSIC_9), constraints: [constraint] }
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value === null) cell.candidates = new Set()
    }
  }
  return grid
}

export const useGameStore = create<GameState>((set, get) => ({
  grid: null,
  puzzleId: null,
  selected: null,
  mode: 'value',

  loadPuzzle: (id, givens) => {
    set({
      grid: freshGridFromGivens(givens),
      puzzleId: id,
      selected: null,
      mode: 'value',
    })
  },

  select: (coord) => {
    set({ selected: coord })
  },

  setMode: (mode) => {
    set({ mode })
  },

  input: (digit) => {
    const { grid, selected, mode } = get()
    if (!grid || !selected) return
    const cell = cellAt(grid, selected)
    if (cell.given) return

    const next = cloneGrid(grid)
    const nextCell = cellAt(next, selected)
    if (mode === 'pencil') {
      if (nextCell.value !== null) return
      if (nextCell.candidates.has(digit)) nextCell.candidates.delete(digit)
      else nextCell.candidates.add(digit)
    } else {
      setValue(next, selected, digit)
    }
    set({ grid: next })
  },

  erase: () => {
    const { grid, selected } = get()
    if (!grid || !selected) return
    const cell = cellAt(grid, selected)
    if (cell.given) return

    const next = cloneGrid(grid)
    const nextCell = cellAt(next, selected)
    nextCell.value = null
    nextCell.candidates = new Set()
    set({ grid: next })
  },
}))

