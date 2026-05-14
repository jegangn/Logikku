import { describe, it, expect } from 'vitest'
import { cage45Innie } from './cage45'
import { createClassicConstraint } from '../../../constraints/classic'
import { createKillerConstraint } from '../../../constraints/killer'
import { CLASSIC_9, createGrid, recomputeCandidates } from '../../../grid'

describe('cage45Innie', () => {
  it('returns null when there is no killer constraint', () => {
    const grid = createGrid(CLASSIC_9, [createClassicConstraint({})])
    expect(cage45Innie.apply(grid)).toBeNull()
  })

  it('derives single innie of a row when one cell is outside all cages', () => {
    // Row 0: cages c1+c2+c3 cover columns 0..7 and stay within row 0;
    // column 8 of row 0 is the single innie. Cage sums = 17+19+8 = 44, so the
    // innie cell value = 45 - 44 = 1.
    const cages = [
      {
        id: 'c1',
        sum: 17,
        cells: [
          { r: 0, c: 0 },
          { r: 0, c: 1 },
          { r: 0, c: 2 },
        ],
      },
      {
        id: 'c2',
        sum: 19,
        cells: [
          { r: 0, c: 3 },
          { r: 0, c: 4 },
          { r: 0, c: 5 },
        ],
      },
      {
        id: 'c3',
        sum: 8,
        cells: [
          { r: 0, c: 6 },
          { r: 0, c: 7 },
        ],
      },
    ]
    const grid = createGrid(CLASSIC_9, [
      createClassicConstraint({}),
      createKillerConstraint({ cages }),
    ])
    recomputeCandidates(grid)
    const step = cage45Innie.apply(grid)
    expect(step).not.toBeNull()
    expect(step!.eliminations.placements.length).toBe(1)
    const p = step!.eliminations.placements[0]!
    expect(p.coord.r).toBe(0)
    expect(p.coord.c).toBe(8)
    expect(p.digit).toBe(1)
  })

  it('derives single outie when cages spill exactly one cell out of a row', () => {
    // Row 0: cages cover all 9 cells of row 0 plus ONE cell from row 1.
    // Total cage sum = 45 + outie value. We pick total=50 → outie = 5.
    const cages = [
      {
        id: 'c1',
        sum: 6,
        cells: [
          { r: 0, c: 0 },
          { r: 0, c: 1 },
        ],
      },
      {
        id: 'c2',
        sum: 6,
        cells: [
          { r: 0, c: 2 },
          { r: 0, c: 3 },
        ],
      },
      {
        id: 'c3',
        sum: 6,
        cells: [
          { r: 0, c: 4 },
          { r: 0, c: 5 },
        ],
      },
      {
        id: 'c4',
        sum: 6,
        cells: [
          { r: 0, c: 6 },
          { r: 0, c: 7 },
        ],
      },
      {
        id: 'c5',
        sum: 26, // sum of (r:0,c:8) + (r:1,c:8) outie
        cells: [
          { r: 0, c: 8 },
          { r: 1, c: 8 },
        ],
      },
    ]
    // cageSum = 6*4 + 26 = 50; outie value = 50 - 45 = 5.
    const grid = createGrid(CLASSIC_9, [
      createClassicConstraint({}),
      createKillerConstraint({ cages }),
    ])
    recomputeCandidates(grid)
    const step = cage45Innie.apply(grid)
    expect(step).not.toBeNull()
    const p = step!.eliminations.placements[0]!
    expect(p.coord.r).toBe(1)
    expect(p.coord.c).toBe(8)
    expect(p.digit).toBe(5)
  })
})
