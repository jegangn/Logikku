import { describe, it, expect } from 'vitest'
import { xyWing } from './xyWing'
import { createGrid, cellAt, CLASSIC_9 } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

function setCandidates(
  grid: ReturnType<typeof makeGrid>,
  coord: { r: number; c: number },
  digits: number[],
) {
  cellAt(grid, coord).candidates = new Set(digits)
}

describe('xyWing', () => {
  it('finds a basic XY-Wing and emits eliminations on common peers of the wings', () => {
    const grid = makeGrid()
    // Pivot at (0,0) = {1,2}
    // Wing B at (0,5) = {2,3} - peer of pivot (same row)
    // Wing C at (5,0) = {1,3} - peer of pivot (same column)
    // The Z digit is 3. Common peers of B(0,5) and C(5,0) should have 3 eliminated.
    setCandidates(grid, { r: 0, c: 0 }, [1, 2])
    setCandidates(grid, { r: 0, c: 5 }, [2, 3])
    setCandidates(grid, { r: 5, c: 0 }, [1, 3])

    // Common peers of (0,5) and (5,0) are: (0,0) and (5,5).
    // (0,0) is the pivot - we shouldn't eliminate its candidates (it has no 3 anyway).
    // (5,5) is a real common peer (same row as 5,0 and same column as 0,5)... wait
    // (5,5) shares row 5 with (5,0) and column 5 with (0,5) - yes that's a peer of both.
    setCandidates(grid, { r: 5, c: 5 }, [3, 4, 5])

    const step = xyWing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('xy-wing')
    expect(step!.tier).toBe(4)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    // All removals must be digit 3
    for (const removal of removals) {
      expect(removal.digit).toBe(3)
    }
    // (5,5) should be in the eliminations
    const removed = removals.find((r) => r.coord.r === 5 && r.coord.c === 5)
    expect(removed).toBeDefined()
  })

  it('eliminations cover only common peers of the two wings (not the pivot)', () => {
    const grid = makeGrid()
    setCandidates(grid, { r: 0, c: 0 }, [1, 2])
    setCandidates(grid, { r: 0, c: 5 }, [2, 3])
    setCandidates(grid, { r: 5, c: 0 }, [1, 3])
    setCandidates(grid, { r: 5, c: 5 }, [3, 4])
    // (3,3) is NOT a peer of (0,5) or (5,0) (different box, different row/col).
    setCandidates(grid, { r: 3, c: 3 }, [3, 4])

    const step = xyWing.apply(grid)
    expect(step).not.toBeNull()
    // No elimination should target (3,3)
    const wrongRemoval = step!.eliminations.removals.find(
      (rem) => rem.coord.r === 3 && rem.coord.c === 3,
    )
    expect(wrongRemoval).toBeUndefined()
    // No elimination should target the pivot or wings themselves
    for (const rem of step!.eliminations.removals) {
      const isPivot = rem.coord.r === 0 && rem.coord.c === 0
      const isWingB = rem.coord.r === 0 && rem.coord.c === 5
      const isWingC = rem.coord.r === 5 && rem.coord.c === 0
      expect(isPivot).toBe(false)
      expect(isWingB).toBe(false)
      expect(isWingC).toBe(false)
    }
  })

  it('returns null when no XY-Wing pattern exists', () => {
    const grid = makeGrid()
    // Default grid: every cell has 9 candidates, no bivalue cells.
    const step = xyWing.apply(grid)
    expect(step).toBeNull()
  })

  it('skips cells with not exactly 2 candidates', () => {
    const grid = makeGrid()
    // Pivot has 3 candidates - shouldn't form a wing
    setCandidates(grid, { r: 0, c: 0 }, [1, 2, 4])
    setCandidates(grid, { r: 0, c: 5 }, [2, 3])
    setCandidates(grid, { r: 5, c: 0 }, [1, 3])
    setCandidates(grid, { r: 5, c: 5 }, [3, 4])

    const step = xyWing.apply(grid)
    // No valid XY-Wing because the pivot is trivalue.
    // There might be other bivalue cells with full 9-candidate grid elsewhere, but
    // every other cell has 9 candidates. So no triple of bivalues.
    expect(step).toBeNull()
  })

  it('explanation references the digit Z and involved cells', () => {
    const grid = makeGrid()
    setCandidates(grid, { r: 0, c: 0 }, [1, 2])
    setCandidates(grid, { r: 0, c: 5 }, [2, 3])
    setCandidates(grid, { r: 5, c: 0 }, [1, 3])
    setCandidates(grid, { r: 5, c: 5 }, [3, 4])

    const step = xyWing.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.explanation.toLowerCase()).toContain('xy-wing')
    expect(step!.explanation).toContain('3')
    expect(step!.explanation).toContain('r1c1')
  })
})
