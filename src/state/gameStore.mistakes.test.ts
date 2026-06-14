import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, serializeGameForSave, selectGrid } from './gameStore'
import { cellAt } from '@/engine'

const GIVENS = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
// canonical puzzle; solution row 0 = 5 3 4 6 7 8 9 1 2 → (0,2)=4 (0,3)=6 (0,5)=8 (all ≠ 9)

function load() {
  useGameStore.getState().loadPuzzle({ id: 't', variant: 'classic', difficulty: 'easy', givens: GIVENS })
}

describe('mistakes', () => {
  beforeEach(load)

  it('counts a wrong number as a strike and marks the cell', () => {
    useGameStore.getState().select({ r: 0, c: 2 })
    useGameStore.getState().input(9)
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(1)
    expect(s.mistakeCells.size).toBe(1)
  })

  it('does not strike a correct number', () => {
    useGameStore.getState().select({ r: 0, c: 2 })
    useGameStore.getState().input(4)
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(0)
    expect(s.mistakeCells.size).toBe(0)
  })

  it('correcting a wrong cell clears the mark but keeps the count', () => {
    useGameStore.getState().select({ r: 0, c: 2 })
    useGameStore.getState().input(9)
    useGameStore.getState().input(4)
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(1)
    expect(s.mistakeCells.size).toBe(0)
  })

  it('three strikes sets outOfTries', () => {
    for (const cell of [{ r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 5 }]) {
      useGameStore.getState().select(cell)
      useGameStore.getState().input(9)
    }
    expect(useGameStore.getState().outOfTries).toBe(true)
  })

  it('blocks further input once out of tries', () => {
    for (const cell of [{ r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 5 }]) {
      useGameStore.getState().select(cell)
      useGameStore.getState().input(9) // each wrong → strike
    }
    expect(useGameStore.getState().outOfTries).toBe(true)
    // a further placement must not change the board
    useGameStore.getState().select({ r: 0, c: 6 })
    useGameStore.getState().input(9)
    const s = useGameStore.getState()
    expect(s.mistakes).toBe(3) // unchanged — input was blocked
  })

  it('restart replays the same puzzle from givens and clears wrong entries', () => {
    for (const cell of [{ r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 5 }]) {
      useGameStore.getState().select(cell)
      useGameStore.getState().input(9) // each wrong → strike
    }
    expect(useGameStore.getState().outOfTries).toBe(true)

    useGameStore.getState().restart()

    const s = useGameStore.getState()
    expect(s.mistakes).toBe(0)
    expect(s.outOfTries).toBe(false)
    expect(s.mistakeCells.size).toBe(0)
    expect(s.historyIndex).toBe(-1)
    expect(s.history.length).toBe(0)
    // a previously-wrong, non-given cell is now empty (back to givens)
    const grid = selectGrid(s)!
    expect(cellAt(grid, { r: 0, c: 2 }).value).toBeNull()
  })
})

describe('completedDigits', () => {
  it('marks a digit done when its last correct copy is placed', () => {
    const solved = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
    const givens = solved.slice(0, 80) + '0' // last cell (8,8)=9 missing
    useGameStore.getState().loadPuzzle({ id: 't2', variant: 'classic', difficulty: 'easy', givens })
    expect(useGameStore.getState().completedDigits.has(9 as never)).toBe(false)
    useGameStore.getState().select({ r: 8, c: 8 })
    useGameStore.getState().input(9)
    expect(useGameStore.getState().completedDigits.has(9 as never)).toBe(true)
  })

  it('does not mark a digit done if the last copy is wrong', () => {
    const solved = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
    const givens = solved.slice(0, 80) + '0' // (8,8) solution = 9
    useGameStore.getState().loadPuzzle({ id: 't3', variant: 'classic', difficulty: 'easy', givens })
    useGameStore.getState().select({ r: 8, c: 8 })
    useGameStore.getState().input(8) // wrong (also a strike)
    expect(useGameStore.getState().completedDigits.has(9 as never)).toBe(false)
  })
})

describe('hydrate', () => {
  it('restores mistakes count, recomputes mistakeCells, and has a valid solution', () => {
    // Load puzzle and make one wrong placement.
    useGameStore.getState().loadPuzzle({ id: 'h1', variant: 'classic', difficulty: 'easy', givens: GIVENS })
    useGameStore.getState().select({ r: 0, c: 2 })
    useGameStore.getState().input(9) // wrong — (0,2) solution is 4
    expect(useGameStore.getState().mistakes).toBe(1)

    // Serialize to SavedGame.
    const saved = serializeGameForSave(useGameStore.getState())
    expect(saved).not.toBeNull()
    expect(saved!.mistakes).toBe(1)

    // Reset state, then hydrate.
    useGameStore.setState({
      board: null,
      puzzleId: null,
      history: [],
      historyIndex: -1,
    } as Partial<ReturnType<typeof useGameStore.getState>>)
    useGameStore.getState().hydrate(saved!)

    const restored = useGameStore.getState()
    expect(restored.mistakes).toBe(1)
    expect(restored.mistakeCells.size).toBeGreaterThan(0) // wrong cell recomputed
    expect(restored.solution).not.toBeNull()             // solution reconstructed
    expect(restored.outOfTries).toBe(false)              // 1 < 3
  })
})
