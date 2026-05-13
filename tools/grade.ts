/*
 * Long-running grader bridge.
 *
 * Reads lines from stdin in one of three formats:
 *   1. Bare puzzle string (legacy) — treated as classic 9x9.
 *   2. `<variant>\t<puzzle>` — variant + puzzle, no per-puzzle data.
 *   3. JSON object: `{"variant": "...", "puzzle": "...", "size"?: 6|9|16,
 *                    "regions"?: [...], "parityMask"?: "...", "edges"?: [...]}`
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
  CLASSIC_6,
  CLASSIC_9,
  createAntiKingConstraint,
  createAntiKnightConstraint,
  createClassicConstraint,
  createEvenOddConstraint,
  createGreaterThanConstraint,
  createHyperConstraint,
  createJigsawConstraint,
  createKropkiConstraint,
  createNonConsecutiveConstraint,
  createXDiagonalConstraint,
  createXVConstraint,
  flatToCoords,
  parsePuzzle,
  recomputeCandidates,
  gradePuzzle,
  backtrackingSolve,
  type Constraint,
  type GridShape,
  type GreaterThanEdge,
  type KropkiEdge,
  type XVEdge,
} from '../src/engine/index'

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})

interface EdgeRecord {
  readonly from: { readonly r: number; readonly c: number }
  readonly to: { readonly r: number; readonly c: number }
  readonly kind: string
}

interface GradeRequest {
  readonly variant: string
  readonly puzzle: string
  readonly size?: number
  readonly regions?: ReadonlyArray<ReadonlyArray<number>>
  readonly parityMask?: string
  readonly edges?: ReadonlyArray<EdgeRecord>
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

function shapeForRequest(req: GradeRequest): GridShape {
  if (req.size === 6 || req.variant === 'mini-6') return CLASSIC_6
  return CLASSIC_9
}

function constraintsForRequest(
  req: GradeRequest,
  shape: GridShape,
): ReadonlyArray<Constraint> {
  switch (req.variant) {
    case 'classic':
    case 'mini-6':
      return [createClassicConstraint({ shape })]
    case 'x-diagonal':
      return [createClassicConstraint({ shape }), createXDiagonalConstraint({ shape })]
    case 'hyper':
      return [createClassicConstraint({ shape }), createHyperConstraint({ shape })]
    case 'anti-knight':
      return [createClassicConstraint({ shape }), createAntiKnightConstraint({ shape })]
    case 'anti-king':
      return [createClassicConstraint({ shape }), createAntiKingConstraint({ shape })]
    case 'non-consecutive':
      return [
        createClassicConstraint({ shape }),
        createNonConsecutiveConstraint({ shape }),
      ]
    case 'jigsaw': {
      if (!req.regions) throw new Error('jigsaw requires regions')
      const pieces = req.regions.map((r) => flatToCoords(r, shape.size))
      return [createJigsawConstraint({ shape, pieces })]
    }
    case 'even-odd': {
      if (!req.parityMask) throw new Error('even-odd requires parityMask')
      return [
        createClassicConstraint({ shape }),
        createEvenOddConstraint({ shape, parityMask: req.parityMask }),
      ]
    }
    case 'kropki': {
      const edges = (req.edges ?? []).filter(
        (e) => e.kind === 'white-dot' || e.kind === 'black-dot',
      ) as ReadonlyArray<KropkiEdge>
      return [
        createClassicConstraint({ shape }),
        createKropkiConstraint({ shape, edges, strict: true }),
      ]
    }
    case 'xv': {
      const edges = (req.edges ?? []).filter(
        (e) => e.kind === 'x' || e.kind === 'v',
      ) as ReadonlyArray<XVEdge>
      return [
        createClassicConstraint({ shape }),
        createXVConstraint({ shape, edges, strict: true }),
      ]
    }
    case 'greater-than': {
      const edges = (req.edges ?? []).filter(
        (e) => e.kind === 'gt' || e.kind === 'lt',
      ) as ReadonlyArray<GreaterThanEdge>
      return [
        createClassicConstraint({ shape }),
        createGreaterThanConstraint({ shape, edges }),
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
    const shape = shapeForRequest(req)
    const constraints = constraintsForRequest(req, shape)
    const grid = { ...parsePuzzle(req.puzzle, shape), constraints }
    // Variants whose constraint region topology differs from the classic peer
    // partition need a candidate reset before grading (jigsaw replaces boxes;
    // even-odd / edge variants add eliminations beyond classic peers).
    if (
      req.variant === 'jigsaw' ||
      req.variant === 'even-odd' ||
      req.variant === 'kropki' ||
      req.variant === 'xv' ||
      req.variant === 'greater-than'
    ) {
      recomputeCandidates(grid)
    }
    const grade = gradePuzzle(grid)
    const techniqueOnly = grade.solvable && grade.hardestTier <= 4
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
