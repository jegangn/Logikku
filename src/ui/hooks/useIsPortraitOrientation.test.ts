import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsPortraitOrientation } from './useIsPortraitOrientation'

interface FakeMQL {
  matches: boolean
  listeners: Array<(ev: MediaQueryListEvent) => void>
  addEventListener: (type: 'change', cb: (ev: MediaQueryListEvent) => void) => void
  removeEventListener: (type: 'change', cb: (ev: MediaQueryListEvent) => void) => void
}

function makeFakeMQL(initial: boolean): FakeMQL {
  return {
    matches: initial,
    listeners: [],
    addEventListener(_t, cb) {
      this.listeners.push(cb)
    },
    removeEventListener(_t, cb) {
      this.listeners = this.listeners.filter((l) => l !== cb)
    },
  }
}

describe('useIsPortraitOrientation', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined
  let fakeMQL: FakeMQL

  beforeEach(() => {
    fakeMQL = makeFakeMQL(true)
    originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation(() => fakeMQL) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia
  })

  it('returns true when matchMedia reports portrait', () => {
    const { result } = renderHook(() => useIsPortraitOrientation())
    expect(result.current).toBe(true)
  })

  it('returns false when matchMedia reports landscape', () => {
    fakeMQL.matches = false
    const { result } = renderHook(() => useIsPortraitOrientation())
    expect(result.current).toBe(false)
  })

  it('updates when matchMedia fires a change event', () => {
    fakeMQL.matches = true
    const { result } = renderHook(() => useIsPortraitOrientation())
    expect(result.current).toBe(true)
    act(() => {
      fakeMQL.matches = false
      for (const l of fakeMQL.listeners) {
        l({ matches: false } as MediaQueryListEvent)
      }
    })
    expect(result.current).toBe(false)
  })

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useIsPortraitOrientation())
    expect(fakeMQL.listeners.length).toBe(1)
    unmount()
    expect(fakeMQL.listeners.length).toBe(0)
  })
})
