/*
 * Long-running grader bridge.
 *
 * Reads puzzle strings from stdin (one per line), grades each via the TS engine,
 * writes one JSON object per line to stdout. Designed to be spawned once by
 * `gen/src/generator/grader_bridge.py` to amortize Node startup cost.
 *
 * Run: bun tools/grade.ts
 */

import process from 'node:process'
import readline from 'node:readline'
import {
  CLASSIC_9,
  createClassicConstraint,
  parsePuzzle,
  gradePuzzle,
  backtrackingSolve,
} from '../src/engine/index'

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})

const constraint = createClassicConstraint({ shape: CLASSIC_9 })

rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    const grid = { ...parsePuzzle(trimmed, CLASSIC_9), constraints: [constraint] }
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
