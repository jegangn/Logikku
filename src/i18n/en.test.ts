import { describe, it, expect } from 'vitest'
import { en } from './en'

const VARIANT_KINDS = [
  'classic','x-diagonal','hyper','anti-knight','anti-king','non-consecutive',
  'even-odd','jigsaw','kropki','xv','greater-than','thermometer','arrow',
  'killer','little-killer','sandwich','skyscraper','palindrome','renban',
  'german-whispers','mini-6','mega-16','samurai',
] as const

describe('i18n catalog', () => {
  it('has an entry for every variant kind', () => {
    for (const k of VARIANT_KINDS) {
      expect(en.catalog[k], `missing catalog.${k}`).toBeDefined()
      expect(en.catalog[k].name, `missing catalog.${k}.name`).toMatch(/.+/)
      expect(en.catalog[k].description, `missing catalog.${k}.description`).toMatch(/.+/)
    }
  })

  it('has variantDetail / onboarding / filter strings', () => {
    expect(en.variant.rules).toBe('Rules')
    expect(en.variant.pickDifficulty).toBe('Pick difficulty')
    expect(en.variant.notFound).toMatch(/not found/i)
    expect(en.onboarding.skip).toBe('Skip')
    expect(en.onboarding.next).toBe('Next')
    expect(en.onboarding.done).toBe('Done')
    expect(en.home.filters.sizeLabel).toBe('Grid size')
    expect(en.home.filters.featuresLabel).toBe('Features')
    expect(en.home.empty).toMatch(/no variants/i)
    expect(en.settings.resetOnboarding).toBe('Reset onboarding')
  })

  it('startedAgo formats minutes and hours', () => {
    expect(en.home.startedAgo(0)).toMatch(/just now|0 min/i)
    expect(en.home.startedAgo(5)).toMatch(/5 min/)
    expect(en.home.startedAgo(120)).toMatch(/2 h/)
  })
})
