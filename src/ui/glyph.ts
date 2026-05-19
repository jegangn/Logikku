import type { Digit } from '@/engine'

const MIN_DIGIT = 1
const MAX_DIGIT = 16

export function glyphForDigit(digit: Digit): string {
  if (digit < MIN_DIGIT || digit > MAX_DIGIT) {
    throw new Error(`glyphForDigit: digit ${digit} out of range ${MIN_DIGIT}..${MAX_DIGIT}`)
  }
  if (digit <= 9) return String(digit)
  return String.fromCharCode(55 + digit)
}

export function digitFromGlyph(ch: string): Digit | null {
  if (ch.length !== 1) return null
  const code = ch.charCodeAt(0)
  if (code >= 49 && code <= 57) return (code - 48) as Digit // '1'..'9'
  if (code >= 65 && code <= 71) return (code - 55) as Digit // 'A'..'G'
  if (code >= 97 && code <= 103) return (code - 87) as Digit // 'a'..'g'
  return null
}
