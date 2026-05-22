import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyLang, resolveLang } from './lang'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveLang', () => {
  it('returns the explicit language unchanged', () => {
    expect(resolveLang('en')).toBe('en')
    expect(resolveLang('ms')).toBe('ms')
  })

  it("maps 'system' to ms when the browser language starts with ms", () => {
    vi.stubGlobal('navigator', { language: 'ms-MY' })
    expect(resolveLang('system')).toBe('ms')
  })

  it("maps 'system' to ms for a bare 'ms' tag", () => {
    vi.stubGlobal('navigator', { language: 'ms' })
    expect(resolveLang('system')).toBe('ms')
  })

  it("maps 'system' to en for any non-ms browser language", () => {
    vi.stubGlobal('navigator', { language: 'en-GB' })
    expect(resolveLang('system')).toBe('en')
  })

  it("falls back to en when navigator is unavailable", () => {
    vi.stubGlobal('navigator', undefined)
    expect(resolveLang('system')).toBe('en')
  })
})

describe('applyLang', () => {
  it('writes the resolved language onto the document element', () => {
    applyLang('ms')
    expect(document.documentElement.lang).toBe('ms')
    applyLang('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
