/*
 * Long-running grader bridge.
 *
 * Reads lines from stdin: either a bare puzzle string (treated as classic), or
 * `<variant>\t<puzzle>` (e.g. `x-diagonal\t005...`). Grades each via the TS
 * engine, writes one JSON object per line to stdout. Designed to be spawned
 * once by `gen/src/generator/grader_bridge.py` to amortize Node startup cost.
 *
 * Run: bun tools/grade.ts
 */

import process from 'node:process'
import readline from 'node:readline'
import {
  CLASSIC_9,
  createClassicConstraint,
  createXDiagonalConstraint,
  parsePuzzle,
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

function constraintsForVariant(variant: string): ReadonlyArray<Constraint> {
  switch (variant) {
    case 'classic':
      return [classicConstraint]
    case 'x-diagonal':
      return [classicConstraint, xDiagonalConstraint]
    default:
      throw new Error(`unknown variant: ${variant}`)
  }
}

rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let variant = 'classic'
  let puzzle = trimmed
  const tab = trimmed.indexOf('\t')
  if (tab >= 0) {
    variant = trimmed.slice(0, tab)
    puzzle = trimmed.slice(tab + 1)
  }
  try {
    const constraints = constraintsForVariant(variant)
    const grid = { ...parsePuzzle(puzzle, CLASSIC_9), constraints }
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
        variant,
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
