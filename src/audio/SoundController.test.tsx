import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

const playSound = vi.fn()
const unlockAudio = vi.fn()
vi.mock('./sound', () => ({
  playSound: (...a: unknown[]) => playSound(...a),
  unlockAudio: () => unlockAudio(),
}))

import { SoundController } from './SoundController'

function tapDown(el: Element) {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true }))
}

describe('SoundController tap listener', () => {
  beforeEach(() => {
    playSound.mockClear()
    unlockAudio.mockClear()
  })
  afterEach(cleanup)

  it('plays "tap" for a plain button', () => {
    render(<SoundController />)
    const btn = document.createElement('button')
    document.body.appendChild(btn)
    tapDown(btn)
    expect(playSound).toHaveBeenCalledWith('tap', expect.anything())
    btn.remove()
  })

  it('plays the data-sound event with data-digit for a digit button', () => {
    render(<SoundController />)
    const btn = document.createElement('button')
    btn.setAttribute('data-sound', 'place')
    btn.setAttribute('data-digit', '5')
    document.body.appendChild(btn)
    tapDown(btn)
    expect(playSound).toHaveBeenCalledWith('place', { digit: 5 })
    btn.remove()
  })

  it('stays silent for data-sound="off"', () => {
    render(<SoundController />)
    const wrap = document.createElement('div')
    wrap.setAttribute('data-sound', 'off')
    const btn = document.createElement('button')
    wrap.appendChild(btn)
    document.body.appendChild(wrap)
    tapDown(btn)
    expect(playSound).not.toHaveBeenCalled()
    wrap.remove()
  })

  it('ignores taps on non-interactive elements', () => {
    render(<SoundController />)
    const div = document.createElement('div')
    document.body.appendChild(div)
    tapDown(div)
    expect(playSound).not.toHaveBeenCalled()
    div.remove()
  })
})
