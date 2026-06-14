import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

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
})
