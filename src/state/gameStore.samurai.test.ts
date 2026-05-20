import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

// A trivial 5-grid givens set: each sub-grid is empty (all '0').
const EMPTY_GIVENS_9 = '0'.repeat(81)

describe('gameStore.loadPuzzle (samurai)', () => {
  beforeEach(() => {
    useGameStore.setState({
      board: null,
      puzzleId: null,
      selected: null,
      history: [],
      historyIndex: -1,
    } as Partial<ReturnType<typeof useGameStore.getState>>)
  })

  it('loads a samurai puzzle with state.board.kind === "samurai"', () => {
    useGameStore.getState().loadPuzzle({
      id: 'samurai-test-001',
      variant: 'samurai',
      difficulty: 'easy',
      givens: '',
      samuraiGivens: [
        EMPTY_GIVENS_9,
        EMPTY_GIVENS_9,
        EMPTY_GIVENS_9,
        EMPTY_GIVENS_9,
        EMPTY_GIVENS_9,
      ],
    })
    const state = useGameStore.getState()
    expect(state.board).not.toBeNull()
    expect(state.board?.kind).toBe('samurai')
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids.length).toBe(5)
    }
  })

  it('rejects samurai load when samuraiGivens has the wrong number of strings', () => {
    expect(() => {
      useGameStore.getState().loadPuzzle({
        id: 'samurai-bad',
        variant: 'samurai',
        difficulty: 'easy',
        givens: '',
        samuraiGivens: [EMPTY_GIVENS_9],
      })
    }).toThrow(/expected 5 sub-grid givens/i)
  })
})

const EMPTY_GIVENS = '0'.repeat(81)

function loadEmptySamurai(): void {
  useGameStore.getState().loadPuzzle({
    id: 'samurai-test',
    variant: 'samurai',
    difficulty: 'easy',
    givens: '',
    samuraiGivens: [EMPTY_GIVENS, EMPTY_GIVENS, EMPTY_GIVENS, EMPTY_GIVENS, EMPTY_GIVENS],
  })
}

describe('gameStore.input (samurai)', () => {
  it('places a digit on the selected (gridIdx, coord) cell', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 4, c: 4 } })
    useGameStore.getState().input(7)
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[4]![4]!.value).toBe(7)
    }
  })

  it('propagates a shared-cell placement to all overlapping sub-grids', () => {
    loadEmptySamurai()
    // NW corner cell (7,7) is shared with center (1,1).
    useGameStore.getState().select({ gridIdx: 1, coord: { r: 7, c: 7 } })
    useGameStore.getState().input(3)
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[1]!.cells[7]![7]!.value).toBe(3)
      expect(state.board.board.grids[0]!.cells[1]![1]!.value).toBe(3)
    }
  })
})

describe('gameStore.erase (samurai)', () => {
  it('clears a placement and reverses via undo', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 4, c: 4 } })
    useGameStore.getState().input(5)
    useGameStore.getState().erase()
    let state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[4]![4]!.value).toBeNull()
    }
    useGameStore.getState().undo()
    state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[4]![4]!.value).toBe(5)
    }
  })
})

describe('gameStore.undo/redo (samurai)', () => {
  it('reverses a shared-cell placement on both sub-grids', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 1, c: 1 } })
    useGameStore.getState().input(9)
    useGameStore.getState().undo()
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      expect(state.board.board.grids[0]!.cells[1]![1]!.value).toBeNull()
      expect(state.board.board.grids[1]!.cells[7]![7]!.value).toBeNull()
    }
  })
})
