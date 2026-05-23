import { describe, it, expect } from 'vitest'

describe('app version', () => {
  it('injects the package.json version into the bundle', () => {
    expect(__APP_VERSION__).toBe('1.0.0')
  })
})
