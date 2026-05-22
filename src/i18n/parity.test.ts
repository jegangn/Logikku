import { describe, expect, it } from 'vitest'
import { en } from './en'
import { ms } from './ms'
import { VARIANT_CATALOG, parseOnboardingSections } from '@/ui/variantCatalog'

function shape(value: unknown): unknown {
  if (typeof value === 'function') return 'fn'
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = shape((value as Record<string, unknown>)[key])
    }
    return out
  }
  return 'leaf'
}

describe('i18n parity', () => {
  it('ms mirrors en key shape (same keys, same value kinds)', () => {
    expect(shape(ms)).toEqual(shape(en))
  })

  it('no ms value is an empty string', () => {
    const empties: string[] = []
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string') {
        if (value.trim() === '') empties.push(path)
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`)
      }
    }
    walk(ms, 'ms')
    expect(empties).toEqual([])
  })
})

describe('onboarding translation parity', () => {
  for (const meta of VARIANT_CATALOG) {
    it(`${meta.kind}: ms onboarding has the same section count as en`, () => {
      const enSections = parseOnboardingSections(meta.onboarding.en)
      const msSections = parseOnboardingSections(meta.onboarding.ms)
      expect(msSections.length).toBe(enSections.length)
      for (const s of msSections) {
        expect(s.title.trim().length).toBeGreaterThan(0)
        expect(s.body.trim().length).toBeGreaterThan(0)
      }
    })
  }
})
