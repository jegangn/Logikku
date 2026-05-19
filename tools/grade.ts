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
  CLASSIC_16,
  createAntiKingConstraint,
  createAntiKnightConstraint,
  createClassicConstraint,
  createEvenOddConstraint,
  createGermanWhispersConstraint,
  createGreaterThanConstraint,
  createHyperConstraint,
  createJigsawConstraint,
  createKropkiConstraint,
  createArrowConstraint,
  createKillerConstraint,
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
  recomputeCandidates,
  gradePuzzle,
  backtrackingSolve,
  type Constraint,
  type GridShape,
  type Arrow,
  type Cage,
  type GermanWhispersPath,
  type GreaterThanEdge,
  type KropkiEdge,
  type LittleKillerClue,
  type PalindromePath,
  type RenbanPath,
  type SandwichClue,
  type SkyscraperClue,
  type Thermometer,
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

interface PathRecord {
  readonly id: string
  readonly kind: 'palindrome' | 'renban' | 'german-whispers'
  readonly cells: ReadonlyArray<{ readonly r: number; readonly c: number }>
}

interface GradeRequest {
  readonly variant: string
  readonly puzzle: string
  readonly size?: number
  readonly regions?: ReadonlyArray<ReadonlyArray<number>>
  readonly parityMask?: string
  readonly edges?: ReadonlyArray<EdgeRecord>
  readonly thermometers?: ReadonlyArray<Thermometer>
  readonly arrows?: ReadonlyArray<Arrow>
  readonly cages?: ReadonlyArray<Cage>
  readonly littleKillerClues?: ReadonlyArray<LittleKillerClue>
  readonly sandwichClues?: ReadonlyArray<SandwichClue>
  readonly skyscraperClues?: ReadonlyArray<SkyscraperClue>
  readonly paths?: ReadonlyArray<PathRecord>
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
  if (req.size === 16 || req.variant === 'mega-16') return CLASSIC_16
  return CLASSIC_9
}

function constraintsForRequest(
  req: GradeRequest,
  shape: GridShape,
): ReadonlyArray<Constraint> {
  switch (req.variant) {
    case 'classic':
    case 'mini-6':
    case 'mega-16':
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
    case 'thermometer': {
      const thermometers = req.thermometers ?? []
      return [
        createClassicConstraint({ shape }),
        createThermometerConstraint({ shape, thermometers }),
      ]
    }
    case 'arrow': {
      const arrows = req.arrows ?? []
      return [
        createClassicConstraint({ shape }),
        createArrowConstraint({ shape, arrows }),
      ]
    }
    case 'killer': {
      const cages = req.cages ?? []
      return [
        createClassicConstraint({ shape }),
        createKillerConstraint({ shape, cages }),
      ]
    }
    case 'little-killer': {
      const clues = req.littleKillerClues ?? []
      return [
        createClassicConstraint({ shape }),
        createLittleKillerConstraint({ shape, clues }),
      ]
    }
    case 'sandwich': {
      const clues = req.sandwichClues ?? []
      return [
        createClassicConstraint({ shape }),
        createSandwichConstraint({ shape, clues }),
      ]
    }
    case 'skyscraper': {
      const clues = req.skyscraperClues ?? []
      return [
        createClassicConstraint({ shape }),
        createSkyscraperConstraint({ shape, clues }),
      ]
    }
    case 'palindrome': {
      const paths: PalindromePath[] = (req.paths ?? [])
        .filter((p) => p.kind === 'palindrome')
        .map((p) => ({ id: p.id, cells: p.cells }))
      return [
        createClassicConstraint({ shape }),
        createPalindromeConstraint({ shape, paths }),
      ]
    }
    case 'renban': {
      const paths: RenbanPath[] = (req.paths ?? [])
        .filter((p) => p.kind === 'renban')
        .map((p) => ({ id: p.id, cells: p.cells }))
      return [
        createClassicConstraint({ shape }),
        createRenbanConstraint({ shape, paths }),
      ]
    }
    case 'german-whispers': {
      const paths: GermanWhispersPath[] = (req.paths ?? [])
        .filter((p) => p.kind === 'german-whispers')
        .map((p) => ({ id: p.id, cells: p.cells }))
      return [
        createClassicConstraint({ shape }),
        createGermanWhispersConstraint({ shape, paths }),
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
      req.variant === 'greater-than' ||
      req.variant === 'thermometer' ||
      req.variant === 'arrow' ||
      req.variant === 'killer' ||
      req.variant === 'little-killer' ||
      req.variant === 'sandwich' ||
      req.variant === 'skyscraper' ||
      req.variant === 'palindrome' ||
      req.variant === 'renban' ||
      req.variant === 'german-whispers'
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
