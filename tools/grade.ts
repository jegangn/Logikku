/*
 * Long-running grader bridge.
 *
 * Reads lines from stdin in one of three formats:
 *   1. Bare puzzle string (legacy) — treated as classic.
 *   2. `<variant>\t<puzzle>` — variant + puzzle, no per-puzzle data.
 *   3. JSON object: `{"variant": "...", "puzzle": "...", "regions"?: [...], "parityMask"?: "..."}`
 *
 * Grades each via the TS engine, writes one JSON object per line to stdout.
 * Designed to be spawned once by `gen/src/generator/grader_bridge.py` to
 * amortize Node startup cost.
 *
 * Run: bun tools/grade.ts
 */

import process from 'node:process'
import readline from 'node:readline'
import {
  CLASSIC_9,
  createAntiKingConstraint,
  createAntiKnightConstraint,
  createClassicConstraint,
  createEvenOddConstraint,
  createHyperConstraint,
  createJigsawConstraint,
  createNonConsecutiveConstraint,
  createXDiagonalConstraint,
  flatToCoords,
  parsePuzzle,
  recomputeCandidates,
  gradePuzzle,
  backtrackingSolve,
  type Constraint,
} from '../src/engine/index'

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})

const classicConstraint = createClassicConstraint({ shape: CLASSIC_9 })
const xDiagonalConstraint = createXDiagonalConstraint({ shape: CLASSIC_9 })
const hyperConstraint = createHyperConstraint({ shape: CLASSIC_9 })
const antiKnightConstraint = createAntiKnightConstraint({ shape: CLASSIC_9 })
const antiKingConstraint = createAntiKingConstraint({ shape: CLASSIC_9 })
const nonConsecutiveConstraint = createNonConsecutiveConstraint({ shape: CLASSIC_9 })

interface GradeRequest {
  readonly variant: string
  readonly puzzle: string
  readonly regions?: ReadonlyArray<ReadonlyArray<number>>
  readonly parityMask?: string
}

function parseLine(line: string): GradeRequest {
  if (line.startsWith('{')) {
    return JSON.parse(line) as GradeRequest
  }
  const tab = line.indexOf('\t')
  if (tab >= 0) {
    return { variant: line.slice(0, tab), puzzle: line.slice(tab + 1) }
  }
  return { variant: 'classic', puzzle: line }
}

function constraintsForRequest(req: GradeRequest): ReadonlyArray<Constraint> {
  switch (req.variant) {
    case 'classic':
      return [classicConstraint]
    case 'x-diagonal':
      return [classicConstraint, xDiagonalConstraint]
    case 'hyper':
      return [classicConstraint, hyperConstraint]
    case 'anti-knight':
      return [classicConstraint, antiKnightConstraint]
    case 'anti-king':
      return [classicConstraint, antiKingConstraint]
    case 'non-consecutive':
      return [classicConstraint, nonConsecutiveConstraint]
    case 'jigsaw': {
      if (!req.regions) throw new Error('jigsaw requires regions')
      const pieces = req.regions.map((r) => flatToCoords(r, CLASSIC_9.size))
      return [createJigsawConstraint({ shape: CLASSIC_9, pieces })]
    }
    case 'even-odd': {
      if (!req.parityMask) throw new Error('even-odd requires parityMask')
      return [
        classicConstraint,
        createEvenOddConstraint({ shape: CLASSIC_9, parityMask: req.parityMask }),
      ]
    }
    default:
      throw new Error(`unknown variant: ${req.variant}`)
  }
}

rl.on('line', (raw) => {
  const trimmed = raw.trim()
  if (!trimmed) return
  try {
    const req = parseLine(trimmed)
    const constraints = constraintsForRequest(req)
    const grid = { ...parsePuzzle(req.puzzle, CLASSIC_9), constraints }
    // Jigsaw replaces classic boxes; parsePuzzle's classic peer-elim is wrong
    // for it. Recompute candidates from the actual constraint regions.
    if (req.variant === 'jigsaw' || req.variant === 'even-odd') {
      recomputeCandidates(grid)
    }
    const grade = gradePuzzle(grid)
    let techniqueOnly = grade.solvable && grade.hardestTier <= 4
    let backtrackUnique = false
    if (!techniqueOnly) {
      const bt = backtrackingSolve(grid, { maxSolutions: 2 })
      backtrackUnique = bt.isUnique
    } else {
      backtrackUnique = true
    }
    process.stdout.write(
      JSON.stringify({
        ok: true,
        variant: req.variant,
        se: grade.se,
        difficulty: grade.difficulty,
        hardestTier: grade.hardestTier,
        steps: grade.steps.length,
        techniqueOnly,
        unique: backtrackUnique,
      }) + '\n',
    )
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ ok: false, error: String(err) }) + '\n',
    )
  }
})

rl.on('close', () => {
  process.exit(0)
})
