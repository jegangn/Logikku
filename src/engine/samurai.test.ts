import { describe, it, expect } from 'vitest'
import {
  SAMURAI_LAYOUT,
  globalCoordKey,
  computeSharedCells,
} from './samurai'

describe('SAMURAI_LAYOUT', () => {
  it('has center at index 0 and 4 corners in NW/NE/SW/SE order', () => {
    expect(SAMURAI_LAYOUT.centerIdx).toBe(0)
    expect(SAMURAI_LAYOUT.corners.length).toBe(4)
    expect(SAMURAI_LAYOUT.corners.map((c) => c.role)).toEqual(['NW', 'NE', 'SW', 'SE'])
    expect(SAMURAI_LAYOUT.corners.map((c) => c.idx)).toEqual([1, 2, 3, 4])
  })

  it('places the NW corner so its bottom-right 3×3 box overlaps the centers top-left', () => {
    const nw = SAMURAI_LAYOUT.corners[0]!
    expect(nw.cornerBox).toEqual({ r: 2, c: 2 })
    expect(nw.centerBox).toEqual({ r: 0, c: 0 })
  })

  it('places the SE corner so its top-left 3×3 box overlaps the centers bottom-right', () => {
    const se = SAMURAI_LAYOUT.corners[3]!
    expect(se.cornerBox).toEqual({ r: 0, c: 0 })
    expect(se.centerBox).toEqual({ r: 2, c: 2 })
  })
})

describe('globalCoordKey', () => {
  it('formats gridIdx, r, c into a comma-separated string', () => {
    expect(globalCoordKey(0, { r: 1, c: 2 })).toBe('0,1,2')
    expect(globalCoordKey(3, { r: 8, c: 8 })).toBe('3,8,8')
  })
})

describe('computeSharedCells', () => {
  it('returns a map with 36 entries (4 corners × 9 cells per overlap)', () => {
    const map = computeSharedCells()
    expect(map.size).toBe(36)
  })

  it('maps the NW corner cell (7,7) to the same global key as the center cell (1,1)', () => {
    const map = computeSharedCells()
    const canonical = '0,1,1'
    const entries = map.get(canonical)!
    expect(entries.length).toBe(2)
    const sorted = [...entries].sort((a, b) => a.grid - b.grid)
    expect(sorted[0]).toEqual({ grid: 0, coord: { r: 1, c: 1 } })
    expect(sorted[1]).toEqual({ grid: 1, coord: { r: 7, c: 7 } })
  })

  it('maps each corners overlap correctly for all 4 corners', () => {
    const map = computeSharedCells()
    const seKey = '0,6,6'
    const seEntries = map.get(seKey)!
    const seSorted = [...seEntries].sort((a, b) => a.grid - b.grid)
    expect(seSorted[0]).toEqual({ grid: 0, coord: { r: 6, c: 6 } })
    expect(seSorted[1]).toEqual({ grid: 4, coord: { r: 0, c: 0 } })
  })
})
