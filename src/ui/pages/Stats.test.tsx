import { describe, it, expect } from 'vitest'
import { formatBand } from './statsFormat'
import { en } from '@/i18n/en'
import { ms } from '@/i18n/ms'

describe('formatBand', () => {
  it('renders a known variant via its localized catalog name (English)', () => {
    expect(formatBand('x-diagonal:easy', en)).toBe('X / Diagonal · Easy')
  })

  it('localizes both variant name and difficulty (Bahasa Malaysia)', () => {
    expect(formatBand('mini-6:hard', ms)).toBe('Mini 6×6 · Sukar')
  })

  it('falls back to a title-cased slug for an unknown variant', () => {
    expect(formatBand('mystery:easy', en)).toBe('Mystery · Easy')
  })
})
