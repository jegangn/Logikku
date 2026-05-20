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
