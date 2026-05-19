import { create } from 'zustand'
import {
  CLASSIC_6,
  CLASSIC_9,
  cellAt,
  cloneGrid,
  createAntiKingConstraint,
  createAntiKnightConstraint,
  createArrowConstraint,
  createClassicConstraint,
  createEvenOddConstraint,
  createGermanWhispersConstraint,
  createGreaterThanConstraint,
  createHyperConstraint,
  createJigsawConstraint,
  createKillerConstraint,
  createKropkiConstraint,
  createLittleKillerConstraint,
  createNonConsecutiveConstraint,
  createPalindromeConstraint,
  createRenbanConstraint,
  createSandwichConstraint,
  createSkyscraperConstraint,
  createThermometerConstraint,
  createXDiagonalConstraint,
  createXVConstraint,
  flatToCoords,
  parsePuzzle,
  peersFromConstraints,
  recomputeCandidates,
  type Constraint,
  type Coord,
  type Difficulty,
  type Digit,
  type Arrow,
  type Cage,
  type GermanWhispersPath,
  type Grid,
  type GreaterThanEdge,
  type GridShape,
  type KropkiEdge,
  type LittleKillerClue,
  type PalindromePath,
  type RenbanPath,
  type SandwichClue,
  type SkyscraperClue,
  type Thermometer,
  type XVEdge,
} from '@/engine'
import type { SavedCell, SavedGame, SavedHistoryEntry } from '@/storage/db'
import { useSettingsStore } from './settingsStore'

export type InputMode = 'value' | 'pencil' | 'erase'

const HISTORY_CAP = 500

export interface CellSnapshot {
  readonly value: Digit | null
  readonly candidates: ReadonlyArray<Digit>
}

export interface HistoryEntry {
  readonly kind: 'value' | 'pencil' | 'erase'
  readonly coord: Coord
  readonly targetBefore: CellSnapshot
  readonly targetAfter: CellSnapshot
  readonly peerRemovals: ReadonlyArray<{ coord: Coord; digit: Digit }>
}

export type EdgeMarkKind =
  | 'white-dot'
  | 'black-dot'
  | 'x'
  | 'v'
  | 'gt'
  | 'lt'

export interface EdgeMarkRecord {
  readonly from: { readonly r: number; readonly c: number }
  readonly to: { readonly r: number; readonly c: number }
  readonly kind: EdgeMarkKind
}

export interface GameState {
  grid: Grid | null
  puzzleId: string | null
  variant: string
  difficulty: Difficulty
  givens: string
  selected: Coord | null
  mode: InputMode
  history: ReadonlyArray<HistoryEntry>
  historyIndex: number
  startedAt: string
  elapsedMs: number
  resumeAt: number | null
  paused: boolean
  completedAt: string | null
  lockedCells: ReadonlySet<string>
  lastShakeKey: number
  /** Jigsaw: per-cell piece id, length size*size. Populated when variant=jigsaw. */
  jigsawPieceMap: ReadonlyArray<number> | null
  /** Even-Odd: parity mask string, length size*size. Populated when variant=even-odd. */
  parityMask: string | null
  /** Kropki / XV / Greater-Than: edge marks. */
  edges: ReadonlyArray<EdgeMarkRecord> | null
  /** Thermometer: bulb-to-tip paths. */
  thermometers: ReadonlyArray<Thermometer> | null
  /** Arrow: head + tail. */
  arrows: ReadonlyArray<Arrow> | null
  /** Killer: cages. */
  cages: ReadonlyArray<Cage> | null
  /** Little-killer: diagonal clues. */
  littleKillerClues: ReadonlyArray<LittleKillerClue> | null
  /** Sandwich: row/column clues. */
  sandwichClues: ReadonlyArray<SandwichClue> | null
  /** Skyscraper: row/column visibility clues. */
  skyscraperClues: ReadonlyArray<SkyscraperClue> | null
  /** Palindrome / Renban / German Whispers: marked paths through cells. */
  paths: ReadonlyArray<{
    readonly id: string
    readonly kind: 'palindrome' | 'renban' | 'german-whispers'
    readonly cells: ReadonlyArray<Coord>
  }> | null

  loadPuzzle: (args: {
    id: string
    variant: string
    difficulty: Difficulty
    givens: string
    regions?: ReadonlyArray<ReadonlyArray<number>>
    parityMask?: string
    edges?: ReadonlyArray<EdgeMarkRecord>
    thermometers?: ReadonlyArray<Thermometer>
    arrows?: ReadonlyArray<Arrow>
    cages?: ReadonlyArray<Cage>
    littleKillerClues?: ReadonlyArray<LittleKillerClue>
    sandwichClues?: ReadonlyArray<SandwichClue>
    skyscraperClues?: ReadonlyArray<SkyscraperClue>
    paths?: ReadonlyArray<{
      readonly id: string
      readonly kind: 'palindrome' | 'renban' | 'german-whispers'
      readonly cells: ReadonlyArray<Coord>
    }>
  }) => void
  hydrate: (saved: SavedGame) => void
  select: (coord: Coord | null) => void
  setMode: (mode: InputMode) => void
  input: (digit: Digit) => void
  erase: () => void
  undo: () => void
  redo: () => void
  pause: () => void
  resume: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

function snapshot(cell: { value: Digit | null; candidates: Set<Digit> }): CellSnapshot {
  return {
    value: cell.value,
    candidates: [...cell.candidates].sort((a, b) => a - b),
  }
}

function restore(cell: { value: Digit | null; candidates: Set<Digit> }, snap: CellSnapshot): void {
  cell.value = snap.value
  cell.candidates = new Set(snap.candidates)
}

function isComplete(grid: Grid): boolean {
  const size = grid.shape.size
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cellAt(grid, { r, c }).value === null) return false
    }
  }
  for (const constraint of grid.constraints) {
    if (!constraint.validate(grid)) return false
  }
  return true
}

export function shapeForVariant(variant: string): GridShape {
  if (variant === 'mini-6') return CLASSIC_6
  return CLASSIC_9
}

function constraintsForVariant(
  variant: string,
  options: {
    regions?: ReadonlyArray<ReadonlyArray<number>>
    parityMask?: string
    edges?: ReadonlyArray<EdgeMarkRecord>
    thermometers?: ReadonlyArray<Thermometer>
    arrows?: ReadonlyArray<Arrow>
    cages?: ReadonlyArray<Cage>
    littleKillerClues?: ReadonlyArray<LittleKillerClue>
    sandwichClues?: ReadonlyArray<SandwichClue>
    skyscraperClues?: ReadonlyArray<SkyscraperClue>
    paths?: ReadonlyArray<{
      readonly id: string
      readonly kind: 'palindrome' | 'renban' | 'german-whispers'
      readonly cells: ReadonlyArray<Coord>
    }>
  } = {},
): ReadonlyArray<Constraint> {
  const shape = shapeForVariant(variant)
  // Jigsaw REPLACES the classic box partition with its own pieces.
  if (variant === 'jigsaw') {
    const pieces = (options.regions ?? []).map((r) =>
      flatToCoords(r, shape.size),
    )
    if (pieces.length === 0) {
      // Fall back to classic boxes if no per-puzzle pieces supplied.
      return [createClassicConstraint({ shape })]
    }
    return [createJigsawConstraint({ shape, pieces })]
  }
  const classic = createClassicConstraint({ shape })
  if (variant === 'x-diagonal') {
    return [classic, createXDiagonalConstraint({ shape })]
  }
  if (variant === 'hyper') {
    return [classic, createHyperConstraint({ shape })]
  }
  if (variant === 'anti-knight') {
    return [classic, createAntiKnightConstraint({ shape })]
  }
  if (variant === 'anti-king') {
    return [classic, createAntiKingConstraint({ shape })]
  }
  if (variant === 'non-consecutive') {
    return [classic, createNonConsecutiveConstraint({ shape })]
  }
  if (variant === 'even-odd') {
    const parityMask = options.parityMask ?? '.'.repeat(shape.size * shape.size)
    return [classic, createEvenOddConstraint({ shape, parityMask })]
  }
  if (variant === 'kropki') {
    const edges = (options.edges ?? []).filter(
      (e) => e.kind === 'white-dot' || e.kind === 'black-dot',
    ) as ReadonlyArray<KropkiEdge>
    return [classic, createKropkiConstraint({ shape, edges, strict: true })]
  }
  if (variant === 'xv') {
    const edges = (options.edges ?? []).filter(
      (e) => e.kind === 'x' || e.kind === 'v',
    ) as ReadonlyArray<XVEdge>
    return [classic, createXVConstraint({ shape, edges, strict: true })]
  }
  if (variant === 'greater-than') {
    const edges = (options.edges ?? []).filter(
      (e) => e.kind === 'gt' || e.kind === 'lt',
    ) as ReadonlyArray<GreaterThanEdge>
    return [classic, createGreaterThanConstraint({ shape, edges })]
  }
  if (variant === 'thermometer') {
    return [
      classic,
      createThermometerConstraint({ shape, thermometers: options.thermometers ?? [] }),
    ]
  }
  if (variant === 'arrow') {
    return [classic, createArrowConstraint({ shape, arrows: options.arrows ?? [] })]
  }
  if (variant === 'killer') {
    return [classic, createKillerConstraint({ shape, cages: options.cages ?? [] })]
  }
  if (variant === 'little-killer') {
    return [
      classic,
      createLittleKillerConstraint({
        shape,
        clues: options.littleKillerClues ?? [],
      }),
    ]
  }
  if (variant === 'sandwich') {
    return [
      classic,
      createSandwichConstraint({ shape, clues: options.sandwichClues ?? [] }),
    ]
  }
  if (variant === 'skyscraper') {
    return [
      classic,
      createSkyscraperConstraint({ shape, clues: options.skyscraperClues ?? [] }),
    ]
  }
  if (variant === 'palindrome') {
    const paths: PalindromePath[] = (options.paths ?? [])
      .filter((p) => p.kind === 'palindrome')
      .map((p) => ({ id: p.id, cells: p.cells }))
    return [classic, createPalindromeConstraint({ shape, paths })]
  }
  if (variant === 'renban') {
    const paths: RenbanPath[] = (options.paths ?? [])
      .filter((p) => p.kind === 'renban')
      .map((p) => ({ id: p.id, cells: p.cells }))
    return [classic, createRenbanConstraint({ shape, paths })]
  }
  if (variant === 'german-whispers') {
    const paths: GermanWhispersPath[] = (options.paths ?? [])
      .filter((p) => p.kind === 'german-whispers')
      .map((p) => ({ id: p.id, cells: p.cells }))
    return [classic, createGermanWhispersConstraint({ shape, paths })]
  }
  return [classic]
}

function pieceMapFromRegions(
  regions: ReadonlyArray<ReadonlyArray<number>> | undefined,
  size: number,
): ReadonlyArray<number> | null {
  if (!regions || regions.length === 0) return null
  const out = new Array<number>(size * size).fill(-1)
  for (let i = 0; i < regions.length; i++) {
    for (const flat of regions[i]!) out[flat] = i
  }
  return out
}

function freshGridFromGivens(
  givens: string,
  variant: string,
  options: {
    regions?: ReadonlyArray<ReadonlyArray<number>>
    parityMask?: string
    edges?: ReadonlyArray<EdgeMarkRecord>
    thermometers?: ReadonlyArray<Thermometer>
    arrows?: ReadonlyArray<Arrow>
    cages?: ReadonlyArray<Cage>
    littleKillerClues?: ReadonlyArray<LittleKillerClue>
    sandwichClues?: ReadonlyArray<SandwichClue>
    skyscraperClues?: ReadonlyArray<SkyscraperClue>
    paths?: ReadonlyArray<{
      readonly id: string
      readonly kind: 'palindrome' | 'renban' | 'german-whispers'
      readonly cells: ReadonlyArray<Coord>
    }>
  } = {},
): Grid {
  const shape = shapeForVariant(variant)
  const constraints = constraintsForVariant(variant, options)
  const grid: Grid = { ...parsePuzzle(givens, shape), constraints }
  // Jigsaw needs a candidate reset because parsePuzzle eliminated classic box
  // peers that aren't the real peer set for this puzzle. Thermometer and
  // Arrow need it too so their bounds propagation runs against full
  // candidate sets.
  if (
    variant === 'jigsaw' ||
    variant === 'thermometer' ||
    variant === 'arrow' ||
    variant === 'killer' ||
    variant === 'little-killer' ||
    variant === 'sandwich' ||
    variant === 'skyscraper' ||
    variant === 'palindrome' ||
    variant === 'renban' ||
    variant === 'german-whispers'
  ) {
    recomputeCandidates(grid)
  }
  for (let r = 0; r < grid.shape.size; r++) {
    for (let c = 0; c < grid.shape.size; c++) {
      const cell = cellAt(grid, { r, c })
      if (cell.value === null) cell.candidates = new Set()
    }
  }
  return grid
}

function gridFromSnapshot(
  givens: string,
  variant: string,
  cells: ReadonlyArray<SavedCell>,
  options: {
    regions?: ReadonlyArray<ReadonlyArray<number>>
    parityMask?: string
    edges?: ReadonlyArray<EdgeMarkRecord>
    thermometers?: ReadonlyArray<Thermometer>
    arrows?: ReadonlyArray<Arrow>
    cages?: ReadonlyArray<Cage>
    littleKillerClues?: ReadonlyArray<LittleKillerClue>
    sandwichClues?: ReadonlyArray<SandwichClue>
    skyscraperClues?: ReadonlyArray<SkyscraperClue>
    paths?: ReadonlyArray<{
      readonly id: string
      readonly kind: 'palindrome' | 'renban' | 'german-whispers'
      readonly cells: ReadonlyArray<Coord>
    }>
  } = {},
): Grid {
  const grid = freshGridFromGivens(givens, variant, options)
  for (let i = 0; i < cells.length; i++) {
    const saved = cells[i]!
    const r = Math.floor(i / grid.shape.size)
    const c = i % grid.shape.size
    const cell = cellAt(grid, { r, c })
    cell.value = saved.v as Digit | null
    cell.candidates = new Set(saved.c as Digit[])
    if (saved.g) cell.given = true
  }
  return grid
}

function pushEntry(
  history: ReadonlyArray<HistoryEntry>,
  historyIndex: number,
  entry: HistoryEntry,
): { history: HistoryEntry[]; historyIndex: number } {
  const trimmed = history.slice(0, historyIndex + 1)
  trimmed.push(entry)
  while (trimmed.length > HISTORY_CAP) trimmed.shift()
  return { history: trimmed, historyIndex: trimmed.length - 1 }
}

function applyEntry(grid: Grid, entry: HistoryEntry): void {
  const target = cellAt(grid, entry.coord)
  restore(target, entry.targetAfter)
  for (const pr of entry.peerRemovals) {
    cellAt(grid, pr.coord).candidates.delete(pr.digit)
  }
}

function revertEntry(grid: Grid, entry: HistoryEntry): void {
  const target = cellAt(grid, entry.coord)
  restore(target, entry.targetBefore)
  for (const pr of entry.peerRemovals) {
    cellAt(grid, pr.coord).candidates.add(pr.digit)
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  grid: null,
  puzzleId: null,
  variant: 'classic',
  difficulty: 'easy',
  givens: '',
  selected: null,
  mode: 'value',
  history: [],
  historyIndex: -1,
  startedAt: '',
  elapsedMs: 0,
  resumeAt: null,
  paused: false,
  completedAt: null,
  lockedCells: new Set(),
  lastShakeKey: 0,
  jigsawPieceMap: null,
  parityMask: null,
  edges: null,
  thermometers: null,
  arrows: null,
  cages: null,
  littleKillerClues: null,
  sandwichClues: null,
  skyscraperClues: null,
  paths: null,

  loadPuzzle: ({
    id,
    variant,
    difficulty,
    givens,
    regions,
    parityMask,
    edges,
    thermometers,
    arrows,
    cages,
    littleKillerClues,
    sandwichClues,
    skyscraperClues,
    paths,
  }) => {
    const now = new Date().toISOString()
    const opts: {
      regions?: ReadonlyArray<ReadonlyArray<number>>
      parityMask?: string
      edges?: ReadonlyArray<EdgeMarkRecord>
      thermometers?: ReadonlyArray<Thermometer>
      arrows?: ReadonlyArray<Arrow>
      cages?: ReadonlyArray<Cage>
      littleKillerClues?: ReadonlyArray<LittleKillerClue>
      sandwichClues?: ReadonlyArray<SandwichClue>
      skyscraperClues?: ReadonlyArray<SkyscraperClue>
      paths?: ReadonlyArray<{
        readonly id: string
        readonly kind: 'palindrome' | 'renban' | 'german-whispers'
        readonly cells: ReadonlyArray<Coord>
      }>
    } = {}
    if (regions !== undefined) opts.regions = regions
    if (parityMask !== undefined) opts.parityMask = parityMask
    if (edges !== undefined) opts.edges = edges
    if (thermometers !== undefined) opts.thermometers = thermometers
    if (arrows !== undefined) opts.arrows = arrows
    if (cages !== undefined) opts.cages = cages
    if (littleKillerClues !== undefined) opts.littleKillerClues = littleKillerClues
    if (sandwichClues !== undefined) opts.sandwichClues = sandwichClues
    if (skyscraperClues !== undefined) opts.skyscraperClues = skyscraperClues
    if (paths !== undefined) opts.paths = paths
    const shape = shapeForVariant(variant)
    set({
      grid: freshGridFromGivens(givens, variant, opts),
      puzzleId: id,
      variant,
      difficulty,
      givens,
      selected: null,
      mode: 'value',
      history: [],
      historyIndex: -1,
      startedAt: now,
      elapsedMs: 0,
      resumeAt: Date.now(),
      paused: false,
      completedAt: null,
      lockedCells: new Set(),
      lastShakeKey: 0,
      jigsawPieceMap: pieceMapFromRegions(regions, shape.size),
      parityMask: parityMask ?? null,
      edges: edges ?? null,
      thermometers: thermometers ?? null,
      arrows: arrows ?? null,
      cages: cages ?? null,
      littleKillerClues: littleKillerClues ?? null,
      sandwichClues: sandwichClues ?? null,
      skyscraperClues: skyscraperClues ?? null,
      paths: paths ?? null,
    })
  },

  hydrate: (saved) => {
    const regions = saved.regions
    const parityMask = saved.parityMask
    const edges = saved.edges as ReadonlyArray<EdgeMarkRecord> | undefined
    const thermometers = saved.thermometers as
      | ReadonlyArray<Thermometer>
      | undefined
    const arrows = saved.arrows as ReadonlyArray<Arrow> | undefined
    const cages = saved.cages as ReadonlyArray<Cage> | undefined
    const littleKillerClues = saved.littleKillerClues as
      | ReadonlyArray<LittleKillerClue>
      | undefined
    const sandwichClues = saved.sandwichClues as
      | ReadonlyArray<SandwichClue>
      | undefined
    const skyscraperClues = saved.skyscraperClues as
      | ReadonlyArray<SkyscraperClue>
      | undefined
    const paths = saved.paths as
      | ReadonlyArray<{
          readonly id: string
          readonly kind: 'palindrome' | 'renban' | 'german-whispers'
          readonly cells: ReadonlyArray<Coord>
        }>
      | undefined
    const opts: {
      regions?: ReadonlyArray<ReadonlyArray<number>>
      parityMask?: string
      edges?: ReadonlyArray<EdgeMarkRecord>
      thermometers?: ReadonlyArray<Thermometer>
      arrows?: ReadonlyArray<Arrow>
      cages?: ReadonlyArray<Cage>
      littleKillerClues?: ReadonlyArray<LittleKillerClue>
      sandwichClues?: ReadonlyArray<SandwichClue>
      skyscraperClues?: ReadonlyArray<SkyscraperClue>
      paths?: ReadonlyArray<{
        readonly id: string
        readonly kind: 'palindrome' | 'renban' | 'german-whispers'
        readonly cells: ReadonlyArray<Coord>
      }>
    } = {}
    if (regions !== undefined) opts.regions = regions
    if (parityMask !== undefined) opts.parityMask = parityMask
    if (edges !== undefined) opts.edges = edges
    if (thermometers !== undefined) opts.thermometers = thermometers
    if (arrows !== undefined) opts.arrows = arrows
    if (cages !== undefined) opts.cages = cages
    if (littleKillerClues !== undefined) opts.littleKillerClues = littleKillerClues
    if (sandwichClues !== undefined) opts.sandwichClues = sandwichClues
    if (skyscraperClues !== undefined) opts.skyscraperClues = skyscraperClues
    if (paths !== undefined) opts.paths = paths
    const grid = gridFromSnapshot(saved.givens, saved.variant, saved.cells, opts)
    const history: HistoryEntry[] = saved.history.map(savedHistoryToEntry)
    const shape = shapeForVariant(saved.variant)
    set({
      grid,
      puzzleId: saved.id,
      variant: saved.variant,
      difficulty: saved.difficulty,
      givens: saved.givens,
      selected: null,
      mode: 'value',
      history,
      historyIndex: saved.historyIndex,
      startedAt: saved.startedAt,
      elapsedMs: saved.elapsedMs,
      resumeAt: Date.now(),
      paused: false,
      completedAt: saved.completedAt,
      lockedCells: new Set(),
      lastShakeKey: 0,
      jigsawPieceMap: pieceMapFromRegions(regions, shape.size),
      parityMask: parityMask ?? null,
      edges: edges ?? null,
      thermometers: thermometers ?? null,
      arrows: arrows ?? null,
      cages: cages ?? null,
      littleKillerClues: littleKillerClues ?? null,
      sandwichClues: sandwichClues ?? null,
      skyscraperClues: skyscraperClues ?? null,
      paths: paths ?? null,
    })
  },

  select: (coord) => {
    set({ selected: coord })
  },

  setMode: (mode) => {
    set({ mode })
  },

  input: (digit) => {
    const state = get()
    const { grid, selected, mode } = state
    if (!grid || !selected || state.completedAt) return
    const cell = cellAt(grid, selected)
    if (cell.given) return

    if (mode === 'pencil') {
      if (cell.value !== null) return
      const next = cloneGrid(grid)
      const nextCell = cellAt(next, selected)
      const before = snapshot(cell)
      if (nextCell.candidates.has(digit)) nextCell.candidates.delete(digit)
      else nextCell.candidates.add(digit)
      const after = snapshot(nextCell)
      pushAndApply(state, next, {
        kind: 'pencil',
        coord: selected,
        targetBefore: before,
        targetAfter: after,
        peerRemovals: [],
      }, set)
      return
    }

    const next = cloneGrid(grid)
    const nextCell = cellAt(next, selected)
    const before = snapshot(cell)
    nextCell.value = digit
    nextCell.candidates = new Set()
    const peerRemovals: Array<{ coord: Coord; digit: Digit }> = []
    for (const p of peersFromConstraints(selected, next)) {
      const peer = cellAt(next, p)
      if (peer.candidates.has(digit)) {
        peer.candidates.delete(digit)
        peerRemovals.push({ coord: p, digit })
      }
    }
    const after = snapshot(nextCell)
    pushAndApply(state, next, {
      kind: 'value',
      coord: selected,
      targetBefore: before,
      targetAfter: after,
      peerRemovals,
    }, set)

    const strict = useSettingsStore.getState().strictMode
    if (strict && cellConflicts(next, selected)) {
      lockCell(selected, get, set)
    }
  },

  erase: () => {
    const state = get()
    const { grid, selected } = state
    if (!grid || !selected || state.completedAt) return
    const cell = cellAt(grid, selected)
    if (cell.given) return
    if (cell.value === null && cell.candidates.size === 0) return
    if (state.lockedCells.has(`${selected.r},${selected.c}`)) return

    const next = cloneGrid(grid)
    const nextCell = cellAt(next, selected)
    const before = snapshot(cell)
    nextCell.value = null
    nextCell.candidates = new Set()
    const after = snapshot(nextCell)
    pushAndApply(state, next, {
      kind: 'erase',
      coord: selected,
      targetBefore: before,
      targetAfter: after,
      peerRemovals: [],
    }, set)
  },

  undo: () => {
    const state = get()
    if (!state.grid || state.historyIndex < 0) return
    const entry = state.history[state.historyIndex]!
    if (state.lockedCells.has(`${entry.coord.r},${entry.coord.c}`)) return
    const next = cloneGrid(state.grid)
    revertEntry(next, entry)
    set({ grid: next, historyIndex: state.historyIndex - 1, completedAt: null })
  },

  redo: () => {
    const { grid, history, historyIndex } = get()
    if (!grid || historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]!
    const next = cloneGrid(grid)
    applyEntry(next, entry)
    const completed = isComplete(next) ? new Date().toISOString() : null
    set({
      grid: next,
      historyIndex: historyIndex + 1,
      completedAt: completed,
    })
  },

  pause: () => {
    const state = get()
    if (state.paused || !state.resumeAt) return
    const additional = Date.now() - state.resumeAt
    set({ paused: true, elapsedMs: state.elapsedMs + additional, resumeAt: null })
  },

  resume: () => {
    const state = get()
    if (!state.paused) return
    set({ paused: false, resumeAt: Date.now() })
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => {
    const { history, historyIndex } = get()
    return historyIndex < history.length - 1
  },
}))

type SetFn = (partial: Partial<GameState>) => void

const LOCK_DURATION_MS = 5000

function lockCell(coord: Coord, get: () => GameState, set: SetFn): void {
  const key = `${coord.r},${coord.c}`
  const cur = get().lockedCells
  if (cur.has(key)) return
  const next = new Set(cur)
  next.add(key)
  set({ lockedCells: next, lastShakeKey: get().lastShakeKey + 1 })
  setTimeout(() => {
    const after = get().lockedCells
    if (!after.has(key)) return
    const updated = new Set(after)
    updated.delete(key)
    set({ lockedCells: updated })
  }, LOCK_DURATION_MS)
}

function cellConflicts(grid: Grid, coord: Coord): boolean {
  const cell = cellAt(grid, coord)
  if (cell.value === null) return false
  for (const constraint of grid.constraints) {
    for (const region of constraint.regions) {
      if (!region.cells.some((c) => c.r === coord.r && c.c === coord.c)) continue
      for (const peer of region.cells) {
        if (peer.r === coord.r && peer.c === coord.c) continue
        if (cellAt(grid, peer).value === cell.value) return true
      }
    }
    if (constraint.findConflicts) {
      for (const co of constraint.findConflicts(grid)) {
        if (co.r === coord.r && co.c === coord.c) return true
      }
    }
  }
  return false
}

function pushAndApply(
  state: GameState,
  next: Grid,
  entry: HistoryEntry,
  set: SetFn,
): void {
  const pushed = pushEntry(state.history, state.historyIndex, entry)
  const complete = isComplete(next)
  set({
    grid: next,
    history: pushed.history,
    historyIndex: pushed.historyIndex,
    completedAt: complete ? new Date().toISOString() : null,
  })
}

function savedHistoryToEntry(s: SavedHistoryEntry): HistoryEntry {
  const kindMap: Record<SavedHistoryEntry['k'], HistoryEntry['kind']> = {
    v: 'value',
    p: 'pencil',
    e: 'erase',
  }
  return {
    kind: kindMap[s.k],
    coord: { r: s.r, c: s.c },
    targetBefore: { value: s.tb.v as Digit | null, candidates: s.tb.c as Digit[] },
    targetAfter: { value: s.ta.v as Digit | null, candidates: s.ta.c as Digit[] },
    peerRemovals:
      s.pr?.map((p) => ({ coord: { r: p.r, c: p.c }, digit: p.d as Digit })) ??
      [],
  }
}

export function entryToSaved(e: HistoryEntry): SavedHistoryEntry {
  const reverseKind: Record<HistoryEntry['kind'], SavedHistoryEntry['k']> = {
    value: 'v',
    pencil: 'p',
    erase: 'e',
  }
  const out: SavedHistoryEntry = {
    k: reverseKind[e.kind],
    r: e.coord.r,
    c: e.coord.c,
    tb: { v: e.targetBefore.value, c: [...e.targetBefore.candidates], g: false },
    ta: { v: e.targetAfter.value, c: [...e.targetAfter.candidates], g: false },
    ...(e.peerRemovals.length > 0
      ? { pr: e.peerRemovals.map((p) => ({ r: p.coord.r, c: p.coord.c, d: p.digit })) }
      : {}),
  }
  return out
}

export function serializeGameForSave(state: GameState): SavedGame | null {
  if (!state.grid || !state.puzzleId) return null
  const cells: SavedCell[] = []
  const size = state.grid.shape.size
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cellAt(state.grid, { r, c })
      cells.push({
        v: cell.value,
        c: [...cell.candidates].sort((a, b) => a - b),
        g: cell.given,
      })
    }
  }
  const currentElapsed =
    state.paused || !state.resumeAt
      ? state.elapsedMs
      : state.elapsedMs + (Date.now() - state.resumeAt)
  const pieceMap = state.jigsawPieceMap
  const regions: number[][] | undefined = pieceMap
    ? pieceMapToRegions(pieceMap)
    : undefined
  return {
    id: state.puzzleId,
    variant: state.variant,
    difficulty: state.difficulty,
    givens: state.givens,
    cells,
    history: state.history.map(entryToSaved),
    historyIndex: state.historyIndex,
    elapsedMs: currentElapsed,
    startedAt: state.startedAt,
    lastPlayedAt: new Date().toISOString(),
    completedAt: state.completedAt,
    ...(regions ? { regions } : {}),
    ...(state.parityMask ? { parityMask: state.parityMask } : {}),
    ...(state.edges ? { edges: state.edges } : {}),
    ...(state.thermometers ? { thermometers: state.thermometers } : {}),
    ...(state.arrows ? { arrows: state.arrows } : {}),
    ...(state.cages ? { cages: state.cages } : {}),
    ...(state.littleKillerClues
      ? { littleKillerClues: state.littleKillerClues }
      : {}),
    ...(state.sandwichClues ? { sandwichClues: state.sandwichClues } : {}),
    ...(state.skyscraperClues ? { skyscraperClues: state.skyscraperClues } : {}),
    ...(state.paths ? { paths: state.paths } : {}),
  }
}

function pieceMapToRegions(
  pieceMap: ReadonlyArray<number>,
): number[][] {
  const out: number[][] = []
  for (let i = 0; i < pieceMap.length; i++) {
    const piece = pieceMap[i]!
    if (piece < 0) continue
    while (out.length <= piece) out.push([])
    out[piece]!.push(i)
  }
  return out
}
