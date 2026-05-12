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
  classicRegions,
  cloneGrid,
  setValue,
  applyEliminations,
  coordKey,
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
export { backtrackingSolve } from './solver/backtrack'
export { techniqueSolve, ALL_TECHNIQUES } from './solver/techniqueSolver'
export { gradePuzzle, difficultyFromSE } from './grader/se'
export type { Difficulty, GradeResult } from './grader/se'
