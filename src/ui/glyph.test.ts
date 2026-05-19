import { describe, it, expect } from 'vitest'
import { glyphForDigit, digitFromGlyph } from './glyph'

describe('glyphForDigit', () => {
  it('maps 1..9 to "1".."9"', () => {
    for (let d = 1; d <= 9; d++) {
      expect(glyphForDigit(d)).toBe(String(d))
    }
  })

  it('maps 10..16 to "A".."G"', () => {
    expect(glyphForDigit(10)).toBe('A')
    expect(glyphForDigit(11)).toBe('B')
    expect(glyphForDigit(12)).toBe('C')
    expect(glyphForDigit(13)).toBe('D')
    expect(glyphForDigit(14)).toBe('E')
    expect(glyphForDigit(15)).toBe('F')
    expect(glyphForDigit(16)).toBe('G')
  })

  it('throws on out-of-range digits', () => {
    expect(() => glyphForDigit(0)).toThrow()
    expect(() => glyphForDigit(17)).toThrow()
    expect(() => glyphForDigit(-1)).toThrow()
  })
})

describe('digitFromGlyph', () => {
  it('parses "1".."9" to 1..9', () => {
    for (let d = 1; d <= 9; d++) {
      expect(digitFromGlyph(String(d))).toBe(d)
    }
  })

  it('parses "A".."G" to 10..16', () => {
    expect(digitFromGlyph('A')).toBe(10)
    expect(digitFromGlyph('B')).toBe(11)
    expect(digitFromGlyph('C')).toBe(12)
    expect(digitFromGlyph('D')).toBe(13)
    expect(digitFromGlyph('E')).toBe(14)
    expect(digitFromGlyph('F')).toBe(15)
    expect(digitFromGlyph('G')).toBe(16)
  })

  it('parses lowercase "a".."g" to 10..16', () => {
    expect(digitFromGlyph('a')).toBe(10)
    expect(digitFromGlyph('b')).toBe(11)
    expect(digitFromGlyph('c')).toBe(12)
    expect(digitFromGlyph('d')).toBe(13)
    expect(digitFromGlyph('e')).toBe(14)
    expect(digitFromGlyph('f')).toBe(15)
    expect(digitFromGlyph('g')).toBe(16)
  })

  it('returns null for unknown chars, empty string, multi-char input', () => {
    expect(digitFromGlyph('H')).toBeNull()
    expect(digitFromGlyph('h')).toBeNull()
    expect(digitFromGlyph('0')).toBeNull()
    expect(digitFromGlyph('')).toBeNull()
    expect(digitFromGlyph('AA')).toBeNull()
    expect(digitFromGlyph('!')).toBeNull()
  })
})
