import type { Digit } from '@/engine'

const MIN_DIGIT = 1
const MAX_DIGIT = 16
const UPPER_A_OFFSET = 'A'.charCodeAt(0) - 10 // 55: digit 10 maps to 'A'
const LOWER_A_OFFSET = 'a'.charCodeAt(0) - 10 // 87: digit 10 maps to 'a'

export function glyphForDigit(digit: Digit): string {
  if (digit < MIN_DIGIT || digit > MAX_DIGIT) {
    throw new Error(`glyphForDigit: digit ${digit} out of range ${MIN_DIGIT}..${MAX_DIGIT}`)
  }
  if (digit <= 9) return String(digit)
  return String.fromCharCode(UPPER_A_OFFSET + digit)
}

export function digitFromGlyph(ch: string): Digit | null {
  if (ch.length !== 1) return null
  const code = ch.charCodeAt(0)
  if (code >= 49 && code <= 57) return (code - 48) as Digit // '1'..'9'
  if (code >= 65 && code <= 71) return (code - UPPER_A_OFFSET) as Digit // 'A'..'G'
  if (code >= 97 && code <= 103) return (code - LOWER_A_OFFSET) as Digit // 'a'..'g'
  return null
}
