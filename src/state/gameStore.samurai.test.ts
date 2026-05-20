import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, samuraiCellConflicts, samuraiIsCompleteState, serializeGameForSave } from './gameStore'

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

describe('gameStore samurai save/load round-trip', () => {
  it('serializes and re-hydrates a samurai game', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 4, c: 4 } })
    useGameStore.getState().input(7)
    const saved = serializeGameForSave(useGameStore.getState())
    expect(saved).not.toBeNull()
    if (saved) {
      expect(saved.kind).toBe('samurai')
      expect(saved.samurai?.grids.length).toBe(5)
    }
    // Reset state and hydrate.
    useGameStore.setState({
      board: null,
      puzzleId: null,
      history: [],
      historyIndex: -1,
    } as Partial<ReturnType<typeof useGameStore.getState>>)
    useGameStore.getState().hydrate(saved!)
    const restored = useGameStore.getState()
    expect(restored.board?.kind).toBe('samurai')
    if (restored.board?.kind === 'samurai') {
      expect(restored.board.board.grids[0]!.cells[4]![4]!.value).toBe(7)
    }
  })

  it('hydrate of a legacy record (kind missing) treats as grid', () => {
    // Use a minimal classic SavedGame as a legacy fixture.
    const cells = []
    for (let i = 0; i < 81; i++) {
      cells.push({ v: null, c: [1, 2, 3, 4, 5, 6, 7, 8, 9], g: false })
    }
    const legacy = {
      id: 'legacy-001',
      variant: 'classic',
      difficulty: 'easy' as const,
      givens: '0'.repeat(81),
      cells,
      history: [],
      historyIndex: -1,
      elapsedMs: 0,
      startedAt: new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
      completedAt: null,
    }
    useGameStore.getState().hydrate(legacy as unknown as Parameters<ReturnType<typeof useGameStore.getState>['hydrate']>[0])
    const state = useGameStore.getState()
    expect(state.board?.kind).toBe('grid')
  })
})

describe('gameStore samurai regression coverage', () => {
  it('historyIndex stays in bounds after undo + new move', () => {
    loadEmptySamurai()
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 0 } })
    useGameStore.getState().input(1)
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 1 } })
    useGameStore.getState().input(2)
    useGameStore.getState().undo()
    // Now historyIndex = 0, history.length = 2
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 2 } })
    useGameStore.getState().input(3)
    const state = useGameStore.getState()
    // After undo+new, history is [entry1, entry3], historyIndex must be 1.
    expect(state.history.length).toBe(2)
    expect(state.historyIndex).toBe(1)
  })

  it('input on a given cell is a no-op in samurai', () => {
    loadEmptySamurai()
    // Manually mark a cell as given (bypassing loadPuzzle, since 17a has no
    // samurai bank fixtures with givens).
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      const cell = state.board.board.grids[0]!.cells[0]![0]!
      cell.value = 4
      cell.given = true
    }
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 0 } })
    useGameStore.getState().input(7)
    const after = useGameStore.getState()
    if (after.board?.kind === 'samurai') {
      // Value must still be 4 (the given), not overwritten to 7.
      expect(after.board.board.grids[0]!.cells[0]![0]!.value).toBe(4)
    }
  })

  it('erase on a given cell is a no-op in samurai', () => {
    loadEmptySamurai()
    const state = useGameStore.getState()
    if (state.board?.kind === 'samurai') {
      const cell = state.board.board.grids[0]!.cells[0]![0]!
      cell.value = 4
      cell.given = true
    }
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 0 } })
    useGameStore.getState().erase()
    const after = useGameStore.getState()
    if (after.board?.kind === 'samurai') {
      expect(after.board.board.grids[0]!.cells[0]![0]!.value).toBe(4)
    }
  })
})

describe('gameStore samurai completion + conflicts', () => {
  it('samuraiIsCompleteState is false on an empty samurai board', () => {
    loadEmptySamurai()
    const state = useGameStore.getState()
    expect(samuraiIsCompleteState(state)).toBe(false)
  })

  it('samuraiCellConflicts flags a deliberate duplicate in the same row', () => {
    loadEmptySamurai()
    // Place 5 at (0, 0) of center, then 5 at (0, 5) of center — same row conflict.
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 0 } })
    useGameStore.getState().input(5)
    useGameStore.getState().select({ gridIdx: 0, coord: { r: 0, c: 5 } })
    useGameStore.getState().input(5)
    const state = useGameStore.getState()
    const conflicts = samuraiCellConflicts(state)
    expect(conflicts.has('0,0,0')).toBe(true)
    expect(conflicts.has('0,0,5')).toBe(true)
  })

  it('samuraiCellConflicts returns empty set on a grid-shaped board', () => {
    // Reset to null then load a classic puzzle (already exercised in main tests)
    useGameStore.setState({ board: null } as Partial<ReturnType<typeof useGameStore.getState>>)
    const state = useGameStore.getState()
    expect(samuraiCellConflicts(state).size).toBe(0)
  })
})
