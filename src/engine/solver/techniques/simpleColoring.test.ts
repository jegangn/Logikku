import { describe, it, expect } from 'vitest'
import { simpleColoring } from './simpleColoring'
import { createGrid, cellAt, CLASSIC_9 } from '../../grid'
import { createClassicConstraint } from '../../constraints/classic'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...createGrid(CLASSIC_9), constraints: [c] }
}

function clearDigit(grid: ReturnType<typeof makeGrid>, digit: number) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cellAt(grid, { r, c }).candidates.delete(digit)
    }
  }
}

describe('simpleColoring', () => {
  it('detects a color trap and eliminates the trapped color', () => {
    const grid = makeGrid()
    const D = 4
    clearDigit(grid, D)

    // Build a chain of bilocation links for digit 4 that produces a same-color
    // collision inside a region.
    //
    // Row 0: only at (0,0) and (0,5)  -> link A<->B
    // Col 5: only at (0,5) and (3,5)  -> link B<->C
    // Row 3: only at (3,5) and (3,8)  -> link C<->D
    // Col 8: only at (3,8) and (4,8)  -> link D<->E
    //
    // BFS coloring from A=(0,0) color 0:
    //   B=(0,5) color 1
    //   C=(3,5) color 0
    //   D=(3,8) color 1
    //   E=(4,8) color 0
    //
    // We want a color-trap: place two same-color cells in the same region.
    // A=(0,0) color 0 and C=(3,5) color 0 don't share a region.
    // Add another chain link so two same-color cells share a region:
    //
    // Col 0: only at (0,0) and (4,0)  -> link A<->F, so F=(4,0) color 1
    // Row 4: only at (4,0) and (4,8)  -> link F<->E confirms; F=color 1, E=color 0
    //   So row 4 has F(color 1) and E(color 0) - that's fine, OK link.
    //
    // To force a trap, make two color-0 cells share a region.
    // Add row 8: only at (4,8 wait, r4!=r8). Use col 8: already used.
    //
    // Easier: produce two color-0 cells in the same column.
    // We'll create a separate chain:
    // Row 0 bilocation:   (0,0) <-> (0,5)        A=0, B=1
    // Col 5 bilocation:   (0,5) <-> (3,5)        B=1, C=0
    // Row 3 bilocation:   (3,5) <-> (3,1)        C=0, G=1
    // Col 1 bilocation:   (3,1) <-> (6,1)        G=1, H=0
    // Row 6 bilocation:   (6,1) <-> (6,0)        G=1, I=0
    // Col 0 bilocation:   (6,0) <-> (0,0)?       Need exactly 2 cells.
    //
    // Let's go with a known-good construction directly:
    //
    // Bilocations:
    //   Row 0: (0,0) and (0,5)
    //   Col 0: (0,0) and (5,0)
    //   Row 5: (5,0) and (5,5)
    //   Col 5: (0,5) and (5,5)   <- closes a loop of length 4
    //
    // BFS from (0,0)=0:
    //   (0,5)=1, (5,0)=1
    //   (5,5)=0 (from (5,0))
    //   (5,5)=0 (from (0,5)) -- consistent, even cycle.
    //
    // No trap yet. Add another link that creates an odd cycle:
    //   Row 0 already has 2 cells at (0,0) and (0,5).
    //   Add col 0 also link from (5,0) to (8,0) -- now col 0 has 3 cells, NOT bilocation.
    //
    // Try a different approach - construct a path that forces a same-color
    // collision in a region:
    //
    // We use the bilocation graph and produce two cells colored the same that
    // share a region. Easiest: 3-cycle is impossible in a coloring graph
    // (every edge alternates), but a path where two same-color cells share a
    // region (via a third region not in the chain) works.
    //
    // Final design:
    //   Row 0: (0,0), (0,4)
    //   Col 4: (0,4), (3,4)
    //   Row 3: (3,4), (3,8)
    //   Col 8: (3,8), (6,8)
    //   Row 6: (6,8), (6,0)
    //   Col 0: (6,0), (0,0)   <- closes loop of length 6 (even) - consistent
    //
    // BFS from (0,0)=0:
    //   (0,4)=1, (6,0)=1
    //   (3,4)=0 (via 0,4), (6,8)=0 (via 6,0)
    //   (3,8)=1 (via 3,4), (3,8)=1 (via 6,8 -> 6,8=0) -- consistent.
    //
    // No trap. Need an ODD cycle in the bilocation graph for a trap, OR two
    // same-color cells sharing a region not part of the chain.
    //
    // Simpler: have two same-color cells share a BOX.
    //
    // Chain:
    //   Row 0: (0,0), (0,3)
    //   Col 3: (0,3), (3,3)
    //   Row 3: (3,3), (3,0)
    //   Col 0: (3,0), (0,0)   <- but col 0 needs only 2 cells: (3,0) and (0,0). Cycle of 4.
    //
    // BFS from (0,0)=0:
    //   (0,3)=1 (row 0), (3,0)=1 (col 0)
    //   (3,3)=0 from (0,3), (3,3)=0 from (3,0) -- consistent. No trap.
    //
    // Make an ODD cycle: cycle of length 3 isn't possible because three cells
    // would all need to be pairwise bilocation-linked, requiring 3 regions
    // where each pair is the only two. Actually possible:
    //   - (0,0) and (0,1) share row 0; bilocation -> only 2 in row 0
    //   - (0,1) and (1,1) share col 1; bilocation -> only 2 in col 1
    //   - (0,0) and (1,1) share box 0; bilocation -> only 2 in box 0
    // Then triangle exists. BFS coloring would fail at one of these.
    //
    // Plant this triangle:
    cellAt(grid, { r: 0, c: 0 }).candidates.add(D)
    cellAt(grid, { r: 0, c: 1 }).candidates.add(D)
    cellAt(grid, { r: 1, c: 1 }).candidates.add(D)
    // Row 0: only (0,0) and (0,1) have D - bilocation in row 0
    // Col 1: only (0,1) and (1,1) have D - bilocation in col 1
    // Box 0 (rows 0-2, cols 0-2): only (0,0), (0,1), (1,1) have D... wait
    //   Box 0 has 3 cells with D so it's NOT a bilocation. But (0,0) and (1,1)
    //   are still PEERS (same box) so for color-trap detection we need same-color
    //   cells that "see" each other, not just bilocation-linked.

    const step = simpleColoring.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.technique).toBe('simple-coloring')
    expect(step!.tier).toBe(4)
    const removals = step!.eliminations.removals
    expect(removals.length).toBeGreaterThan(0)
    for (const removal of removals) {
      expect(removal.digit).toBe(D)
    }
  })

  it('returns null when no chain produces eliminations', () => {
    const grid = makeGrid()
    // Default grid: every cell has all 9 candidates. No region has exactly
    // 2 candidates for any digit. No bilocation links - returns null.
    const step = simpleColoring.apply(grid)
    expect(step).toBeNull()
  })

  it('skips digits whose bilocation graph has fewer than 3 links', () => {
    const grid = makeGrid()
    const D = 6
    clearDigit(grid, D)
    // Only one bilocation link: row 0 with (0,0) and (0,5)
    cellAt(grid, { r: 0, c: 0 }).candidates.add(D)
    cellAt(grid, { r: 0, c: 5 }).candidates.add(D)
    // Single edge - can't produce a trap or wrap.
    const step = simpleColoring.apply(grid)
    expect(step).toBeNull()
  })
})
