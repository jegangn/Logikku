import process from 'node:process'
import {
  createClassicConstraint,
  parsePuzzle,
  serializePuzzle,
  CLASSIC_9,
  gradePuzzle,
  backtrackingSolve,
} from '../index'

const SAMPLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

const input = process.argv[2] ?? SAMPLE

if (input.length !== 81 || !/^[0-9.]+$/.test(input)) {
  process.stderr.write(`Invalid puzzle string. Expected 81 chars of [0-9.].\n`)
  process.exit(2)
}

const constraint = createClassicConstraint({ shape: CLASSIC_9 })
const grid = { ...parsePuzzle(input, CLASSIC_9), constraints: [constraint] }
const grade = gradePuzzle(grid)

process.stdout.write(`Puzzle:      ${input}\n`)
process.stdout.write(`Solvable:    ${grade.solvable}\n`)
process.stdout.write(`SE:          ${grade.se}\n`)
process.stdout.write(`Difficulty:  ${grade.difficulty}\n`)
process.stdout.write(`HardestTier: ${grade.hardestTier}\n`)
process.stdout.write(`Steps:       ${grade.steps.length}\n\n`)

const bt = backtrackingSolve(grid, { maxSolutions: 1 })
if (bt.hasSolution) {
  process.stdout.write(`Solution:    ${serializePuzzle(bt.solutions[0]!)}\n\n`)
}

const TIER_PREVIEW = 12
if (grade.steps.length > 0) {
  process.stdout.write(`Trace (first ${TIER_PREVIEW} steps):\n`)
  for (const step of grade.steps.slice(0, TIER_PREVIEW)) {
    process.stdout.write(`  [T${step.tier}] ${step.explanation}\n`)
  }
  if (grade.steps.length > TIER_PREVIEW) {
    process.stdout.write(`  ... ${grade.steps.length - TIER_PREVIEW} more\n`)
  }
} else {
  process.stdout.write(
    `No technique trace — puzzle requires Tier 5+ techniques or pure backtracking.\n`,
  )
}
