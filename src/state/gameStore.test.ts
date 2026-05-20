import { beforeEach, describe, expect, it } from 'vitest'
import { entryToSaved, selectGrid, serializeGameForSave, useGameStore, type HistoryEntry } from './gameStore'
import { cellAt } from '@/engine'

const EASY =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

function load(givens: string, id = 'p-1') {
  useGameStore.getState().loadPuzzle({
    id,
    variant: 'classic',
    difficulty: 'easy',
    givens,
  })
}

beforeEach(() => {
  useGameStore.setState({
    board: null,
    puzzleId: null,
    selected: null,
    mode: 'value',
    history: [],
    historyIndex: -1,
    completedAt: null,
    paused: false,
    elapsedMs: 0,
    resumeAt: null,
  })
})

describe('gameStore', () => {
  it('loads a puzzle and stores its id', () => {
    load(EASY)
    const s = useGameStore.getState()
    expect(s.puzzleId).toBe('p-1')
    expect(selectGrid(s)!.shape.size).toBe(9)
  })

  it('places a value via input', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.input(5)
    expect(cellAt(selectGrid(useGameStore.getState())!, { r: 0, c: 0 }).value).toBe(5)
  })

  it('placing a value on a given is a no-op', () => {
    load(EASY)
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.input(9)
    expect(cellAt(selectGrid(useGameStore.getState())!, { r: 0, c: 0 }).value).toBe(5)
  })

  it('pencil mode toggles candidates', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.setMode('pencil')
    s.input(3)
    const cell = cellAt(selectGrid(useGameStore.getState())!, { r: 0, c: 0 })
    expect(cell.value).toBeNull()
    expect(cell.candidates.has(3)).toBe(true)
  })

  it('erase clears a placed value', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.input(5)
    s.erase()
    expect(cellAt(selectGrid(useGameStore.getState())!, { r: 0, c: 0 }).value).toBeNull()
  })

  it('records a history entry per action', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.input(5)
    expect(useGameStore.getState().history).toHaveLength(1)
    expect(useGameStore.getState().historyIndex).toBe(0)
  })

  it('undo restores the prior cell state and peer candidates', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 1 })
    s.setMode('pencil')
    s.input(5)
    s.setMode('value')
    s.select({ r: 0, c: 0 })
    s.input(5)
    expect(cellAt(selectGrid(useGameStore.getState())!, { r: 0, c: 1 }).candidates.has(5)).toBe(false)

    s.undo()
    const state = useGameStore.getState()
    expect(cellAt(selectGrid(state)!, { r: 0, c: 0 }).value).toBeNull()
    expect(cellAt(selectGrid(state)!, { r: 0, c: 1 }).candidates.has(5)).toBe(true)
  })

  it('redo re-applies a previously-undone action', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.input(5)
    s.undo()
    s.redo()
    expect(cellAt(selectGrid(useGameStore.getState())!, { r: 0, c: 0 }).value).toBe(5)
  })

  it('canUndo / canRedo reflect history position', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    expect(s.canUndo()).toBe(false)
    expect(s.canRedo()).toBe(false)
    s.select({ r: 0, c: 0 })
    s.input(5)
    expect(useGameStore.getState().canUndo()).toBe(true)
    expect(useGameStore.getState().canRedo()).toBe(false)
    useGameStore.getState().undo()
    expect(useGameStore.getState().canRedo()).toBe(true)
  })

  it('new action truncates forward history', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    s.input(5)
    s.input(6)
    s.undo()
    s.input(7)
    const state = useGameStore.getState()
    expect(state.history).toHaveLength(2)
    expect(state.canRedo()).toBe(false)
    expect(cellAt(selectGrid(state)!, { r: 0, c: 0 }).value).toBe(7)
  })

  it('history caps at 500 entries', () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    s.select({ r: 0, c: 0 })
    for (let i = 0; i < 510; i++) {
      s.setMode('pencil')
      s.input(1)
    }
    expect(useGameStore.getState().history.length).toBe(500)
  })

  it('detects completion when last cell is filled', () => {
    const solved =
      '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
    const onePerCellAway = solved.slice(0, 80) + '0'
    load(onePerCellAway)
    const s = useGameStore.getState()
    s.select({ r: 8, c: 8 })
    s.input(9)
    expect(useGameStore.getState().completedAt).not.toBeNull()
  })

  it('pause/resume accumulates elapsedMs correctly', async () => {
    load('0'.repeat(81))
    const s = useGameStore.getState()
    await new Promise((r) => setTimeout(r, 30))
    s.pause()
    const after = useGameStore.getState().elapsedMs
    expect(after).toBeGreaterThanOrEqual(20)
    await new Promise((r) => setTimeout(r, 30))
    expect(useGameStore.getState().elapsedMs).toBe(after)
    s.resume()
    await new Promise((r) => setTimeout(r, 30))
    s.pause()
    expect(useGameStore.getState().elapsedMs).toBeGreaterThan(after)
  })

  it('serializeGameForSave produces a SavedGame-shaped object', () => {
    load('0'.repeat(81))
    useGameStore.getState().select({ r: 0, c: 0 })
    useGameStore.getState().input(5)
    const saved = serializeGameForSave(useGameStore.getState())
    expect(saved).not.toBeNull()
    expect(saved!.id).toBe('p-1')
    expect(saved!.cells).toHaveLength(81)
    expect(saved!.history).toHaveLength(1)
  })

  it('entryToSaved encodes peer removals when present', () => {
    load('0'.repeat(81))
    useGameStore.getState().select({ r: 0, c: 1 })
    useGameStore.getState().setMode('pencil')
    useGameStore.getState().input(5)
    useGameStore.getState().setMode('value')
    useGameStore.getState().select({ r: 0, c: 0 })
    useGameStore.getState().input(5)
    const entry = useGameStore.getState().history[useGameStore.getState().historyIndex]! as HistoryEntry
    const saved = entryToSaved(entry)
    expect(saved.pr).toBeDefined()
    expect(saved.pr!.length).toBeGreaterThan(0)
  })

  it('hydrate restores history and grid from a SavedGame', () => {
    load('0'.repeat(81))
    useGameStore.getState().select({ r: 0, c: 0 })
    useGameStore.getState().input(5)
    const saved = serializeGameForSave(useGameStore.getState())!
    useGameStore.setState({
      board: null,
      puzzleId: null,
      history: [],
      historyIndex: -1,
    })
    useGameStore.getState().hydrate(saved)
    const restored = useGameStore.getState()
    expect(cellAt(selectGrid(restored)!, { r: 0, c: 0 }).value).toBe(5)
    expect(restored.historyIndex).toBe(0)
  })

  it('loading an x-diagonal puzzle attaches the diagonal constraint', () => {
    useGameStore.getState().loadPuzzle({
      id: 'x-1',
      variant: 'x-diagonal',
      difficulty: 'easy',
      givens: '0'.repeat(81),
    })
    const grid = selectGrid(useGameStore.getState())!
    const kinds = grid.constraints.map((c) => c.kind).sort()
    expect(kinds).toEqual(['classic', 'x-diagonal'])
  })

  it('loading a hyper puzzle attaches the four-window constraint', () => {
    useGameStore.getState().loadPuzzle({
      id: 'h-1',
      variant: 'hyper',
      difficulty: 'easy',
      givens: '0'.repeat(81),
    })
    const grid = selectGrid(useGameStore.getState())!
    const kinds = grid.constraints.map((c) => c.kind).sort()
    expect(kinds).toEqual(['classic', 'hyper'])
    const hyper = grid.constraints.find((c) => c.kind === 'hyper')!
    expect(hyper.regions).toHaveLength(4)
  })
})
