import { describe, it, expect } from 'vitest'
import {
  VARIANT_CATALOG,
  getVariant,
  parseOnboardingSections,
  isVariantKind,
  type VariantKind,
} from './variantCatalog'

const ALL_KINDS: ReadonlyArray<VariantKind> = [
  'classic','x-diagonal','hyper','anti-knight','anti-king','non-consecutive',
  'even-odd','jigsaw','kropki','xv','greater-than','thermometer','arrow',
  'killer','little-killer','sandwich','skyscraper','palindrome','renban',
  'german-whispers','mini-6','mega-16','samurai',
]

describe('variantCatalog', () => {
  it('exposes one entry per kind', () => {
    expect(VARIANT_CATALOG).toHaveLength(23)
    const kinds = VARIANT_CATALOG.map((v) => v.kind)
    for (const k of ALL_KINDS) expect(kinds).toContain(k)
  })

  it('orders classic first and samurai last', () => {
    expect(VARIANT_CATALOG[0]?.kind).toBe('classic')
    expect(VARIANT_CATALOG[22]?.kind).toBe('samurai')
  })

  it('getVariant returns the matching entry', () => {
    expect(getVariant('killer').kind).toBe('killer')
    expect(getVariant('killer').size).toBe('9x9')
    expect(getVariant('killer').features).toContain('cage')
  })

  it('every entry has a Thumbnail component and onboarding string', () => {
    for (const v of VARIANT_CATALOG) {
      expect(typeof v.Thumbnail).toBe('function')
      expect(v.onboarding.en.length).toBeGreaterThan(50)
      expect(v.onboarding.ms.length).toBeGreaterThan(50)
    }
  })

  it('parseOnboardingSections returns exactly 2 sections', () => {
    const md = '---\ntitle: A\n---\nbody one\n\n---\ntitle: B\n---\nbody two'
    const sections = parseOnboardingSections(md)
    expect(sections).toHaveLength(2)
    expect(sections[0]?.title).toBe('A')
    expect(sections[0]?.body.trim()).toBe('body one')
    expect(sections[1]?.title).toBe('B')
    expect(sections[1]?.body.trim()).toBe('body two')
  })

  it('parseOnboardingSections throws when fewer than 2 sections', () => {
    expect(() => parseOnboardingSections('no fences here')).toThrow()
  })

  it('isVariantKind narrows known kinds', () => {
    expect(isVariantKind('killer')).toBe(true)
    expect(isVariantKind('nonsense')).toBe(false)
  })
})
