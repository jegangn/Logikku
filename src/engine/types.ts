export type Digit = number

export interface Coord {
  readonly r: number
  readonly c: number
}

export type Region = ReadonlyArray<Coord>

export type RegionKind =
  | 'row'
  | 'column'
  | 'box'
  | 'diagonal'
  | 'window'
  | 'jigsaw'
  | 'cage'
  | 'thermometer'
  | 'arrow'
  | 'path'
  | 'edge'
  | 'outside'
  | 'cell-set'

export interface NamedRegion {
  readonly kind: RegionKind
  readonly cells: Region
  readonly id?: string
}

export interface Cell {
  readonly coord: Coord
  value: Digit | null
  candidates: Set<Digit>
  given: boolean
}

export interface GridShape {
  readonly size: number
  readonly boxRows: number
  readonly boxCols: number
}

export interface Grid {
  readonly shape: GridShape
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>>
  readonly constraints: ReadonlyArray<Constraint>
}

export type ConstraintKind =
  | 'classic'
  | 'x-diagonal'
  | 'hyper'
  | 'anti-knight'
  | 'anti-king'
  | 'non-consecutive'
  | 'jigsaw'
  | 'even-odd'
  | 'kropki'
  | 'xv'
  | 'greater-than'
  | 'thermometer'
  | 'arrow'
  | 'killer'
  | 'little-killer'
  | 'sandwich'
  | 'skyscraper'
  | 'palindrome'
  | 'renban'
  | 'german-whispers'

export interface CandidateRemoval {
  readonly coord: Coord
  readonly digit: Digit
}

export interface Placement {
  readonly coord: Coord
  readonly digit: Digit
}

export interface Eliminations {
  readonly removals: ReadonlyArray<CandidateRemoval>
  readonly placements: ReadonlyArray<Placement>
}

export const EMPTY_ELIMINATIONS: Eliminations = Object.freeze({
  removals: Object.freeze([]) as ReadonlyArray<CandidateRemoval>,
  placements: Object.freeze([]) as ReadonlyArray<Placement>,
})

export interface Constraint {
  readonly id: string
  readonly kind: ConstraintKind
  readonly regions: ReadonlyArray<NamedRegion>
  propagate(grid: Grid): Eliminations
  validate(grid: Grid): boolean
  techniques?(): ReadonlyArray<Technique>
  findConflicts?(grid: Grid): ReadonlyArray<Coord>
}

export interface Technique {
  readonly id: string
  readonly tier: number
  readonly name: string
  apply(grid: Grid): Step | null
}

export interface Step {
  readonly technique: string
  readonly tier: number
  readonly eliminations: Eliminations
  readonly explanation: string
}

export interface SamuraiBoard {
  readonly grids: readonly [Grid, Grid, Grid, Grid, Grid]
  readonly sharedCells: ReadonlyMap<
    string,
    ReadonlyArray<{ readonly grid: number; readonly coord: Coord }>
  >
}

export class NotImplementedError extends Error {
  constructor(kind: ConstraintKind) {
    super(`Constraint kind "${kind}" is a stub (registered in Phase 0, implemented in a later phase)`)
    this.name = 'NotImplementedError'
  }
}
