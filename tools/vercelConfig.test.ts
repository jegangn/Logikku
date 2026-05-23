// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; headers: HeaderEntry[] }
type VercelConfig = {
  rewrites: { source: string; destination: string }[]
  headers: HeaderRule[]
}

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as VercelConfig

function headerValue(sourceMatch: (s: string) => boolean, key: string): string | undefined {
  return config.headers.find((h) => sourceMatch(h.source))?.headers.find((e) => e.key === key)?.value
}

describe('vercel.json', () => {
  it('has an SPA fallback rewrite to index.html', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })

  it('serves a self-only CSP with no eval and no remote origins', () => {
    const csp = headerValue((s) => s === '/(.*)', 'Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('http://')
    expect(csp).not.toContain('https://')
  })

  it('sends HSTS and nosniff on every response', () => {
    const hsts = headerValue((s) => s === '/(.*)', 'Strict-Transport-Security')
    expect(hsts).toContain('max-age=63072000')
    expect(hsts).toContain('includeSubDomains')
    expect(headerValue((s) => s === '/(.*)', 'X-Content-Type-Options')).toBe('nosniff')
  })

  it('caches hashed assets immutably and never caches index.html', () => {
    expect(headerValue((s) => s === '/assets/(.*)', 'Cache-Control')).toContain('immutable')
    expect(headerValue((s) => s.includes('index.html'), 'Cache-Control')).toBe('no-cache')
  })
})
