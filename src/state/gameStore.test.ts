import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { CLASSIC_9, cellAt } from '@/engine'

const EASY =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

beforeEach(() => {
  useGameStore.setState({
    grid: null,
    puzzleId: null,
    selected: null,
    mode: 'value',
  })
})

describe('gameStore', () => {
  it('loads a puzzle and stores its id', () => {
    useGameStore.getState().loadPuzzle('p-1', EASY)
    const s = useGameStore.getState()
    expect(s.puzzleId).toBe('p-1')
    expect(s.grid).not.toBeNull()
    expect(s.grid!.shape.size).toBe(9)
  })

  it('placing a value via input updates the grid', () => {
    const s = useGameStore.getState()
    s.loadPuzzle('p-1', '0'.repeat(81))
    s.select({ r: 0, c: 0 })
    s.input(5)
    expect(cellAt(useGameStore.getState().grid!, { r: 0, c: 0 }).value).toBe(5)
  })

  it('placing a value on a given is a no-op', () => {
    const s = useGameStore.getState()
    s.loadPuzzle('p-1', EASY)
    s.select({ r: 0, c: 0 })
    s.input(9)
    expect(cellAt(useGameStore.getState().grid!, { r: 0, c: 0 }).value).toBe(5)
  })

  it('pencil mode toggles candidates instead of placing values', () => {
    const s = useGameStore.getState()
    s.loadPuzzle('p-1', '0'.repeat(81))
    s.select({ r: 0, c: 0 })
    s.setMode('pencil')
    s.input(3)
    const cell = cellAt(useGameStore.getState().grid!, { r: 0, c: 0 })
    expect(cell.value).toBeNull()
    expect(cell.candidates.has(3)).toBe(true)
  })

  it('toggles a pencil mark off on second input', () => {
    const s = useGameStore.getState()
    s.loadPuzzle('p-1', '0'.repeat(81))
    s.select({ r: 0, c: 0 })
    s.setMode('pencil')
    s.input(3)
    s.input(3)
    const cell = cellAt(useGameStore.getState().grid!, { r: 0, c: 0 })
    expect(cell.candidates.has(3)).toBe(false)
  })

  it('erase clears a placed value', () => {
    const s = useGameStore.getState()
    s.loadPuzzle('p-1', '0'.repeat(81))
    s.select({ r: 0, c: 0 })
    s.input(5)
    s.erase()
    expect(cellAt(useGameStore.getState().grid!, { r: 0, c: 0 }).value).toBeNull()
  })

  it('input without selection is a no-op', () => {
    const s = useGameStore.getState()
    s.loadPuzzle('p-1', '0'.repeat(81))
    s.input(5)
    expect(useGameStore.getState().grid!.shape.size).toBe(CLASSIC_9.size)
  })
})
