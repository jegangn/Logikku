export * from './types'
export {
  CLASSIC_6,
  CLASSIC_9,
  CLASSIC_16,
  createGrid,
  parsePuzzle,
  serializePuzzle,
  cellAt,
  peersOf,
  peersFromConstraints,
  classicRegions,
  cloneGrid,
  setValue,
  applyEliminations,
  coordKey,
  recomputeCandidates,
} from './grid'
export { ConstraintRegistry, ALL_CONSTRAINT_KINDS } from './registry'
export { createClassicConstraint } from './constraints/classic'
export {
  createXDiagonalConstraint,
  diagonalRegions,
  DIAGONAL_NW_SE_ID,
  DIAGONAL_NE_SW_ID,
} from './constraints/x-diagonal'
export {
  createHyperConstraint,
  hyperRegions,
  HYPER_WINDOW_ORIGINS,
} from './constraints/hyper'
export { createAntiKnightConstraint, KNIGHT_OFFSETS } from './constraints/anti-knight'
export { createAntiKingConstraint, KING_OFFSETS } from './constraints/anti-king'
export {
  createNonConsecutiveConstraint,
  ORTHOGONAL_OFFSETS,
} from './constraints/non-consecutive'
export {
  createJigsawConstraint,
  defaultClassicJigsawPieces,
  flatToCoords,
} from './constraints/jigsaw'
export type { JigsawParams } from './constraints/jigsaw'
export {
  createEvenOddConstraint,
  parityGridOf,
} from './constraints/even-odd'
export type { EvenOddParams, Parity } from './constraints/even-odd'
export { createKropkiConstraint } from './constraints/kropki'
export type { KropkiEdge, KropkiKind, KropkiParams } from './constraints/kropki'
export { createXVConstraint } from './constraints/xv'
export type { XVEdge, XVKind, XVParams } from './constraints/xv'
export { createGreaterThanConstraint } from './constraints/greater-than'
export type {
  GreaterThanEdge,
  GreaterThanKind,
  GreaterThanParams,
} from './constraints/greater-than'
export type { Edge } from './constraints/_base/edgeConstraint'
export { createThermometerConstraint } from './constraints/thermometer'
export type { Thermometer, ThermometerParams } from './constraints/thermometer'
export { createArrowConstraint } from './constraints/arrow'
export type { Arrow, ArrowParams } from './constraints/arrow'
export { createKillerConstraint, cagesOf } from './constraints/killer'
export type { Cage, KillerParams } from './constraints/killer'
export { backtrackingSolve } from './solver/backtrack'
export { techniqueSolve, ALL_TECHNIQUES } from './solver/techniqueSolver'
export { gradePuzzle, difficultyFromSE } from './grader/se'
export type { Difficulty, GradeResult } from './grader/se'
