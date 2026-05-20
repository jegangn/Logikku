import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RotateDevicePrompt } from './RotateDevicePrompt'

describe('RotateDevicePrompt', () => {
  it('renders a rotate icon and the landscape prompt text', () => {
    render(<RotateDevicePrompt />)
    expect(screen.getByTestId('rotate-device-prompt')).toBeInTheDocument()
    expect(screen.getByText(/landscape/i)).toBeInTheDocument()
    const svg = screen.getByTestId('rotate-icon')
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('exposes an accessible aria-label', () => {
    render(<RotateDevicePrompt />)
    expect(screen.getByRole('img', { name: /rotate/i })).toBeInTheDocument()
  })
})
