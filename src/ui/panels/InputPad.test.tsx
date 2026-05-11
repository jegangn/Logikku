import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputPad } from './InputPad'

describe('InputPad', () => {
  it('renders 9 digit buttons and an erase button', () => {
    render(
      <InputPad
        mode="value"
        onDigit={() => {}}
        onErase={() => {}}
        onModeChange={() => {}}
      />,
    )
    for (let d = 1; d <= 9; d++) {
      expect(screen.getByTestId(`digit-${d}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('erase-btn')).toBeInTheDocument()
  })

  it('calls onDigit with the tapped digit', async () => {
    const onDigit = vi.fn()
    render(
      <InputPad
        mode="value"
        onDigit={onDigit}
        onErase={() => {}}
        onModeChange={() => {}}
      />,
    )
    await userEvent.setup().click(screen.getByTestId('digit-5'))
    expect(onDigit).toHaveBeenCalledWith(5)
  })

  it('switches mode via the value/pencil toggles', async () => {
    const onModeChange = vi.fn()
    render(
      <InputPad
        mode="value"
        onDigit={() => {}}
        onErase={() => {}}
        onModeChange={onModeChange}
      />,
    )
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Pencil' }))
    expect(onModeChange).toHaveBeenCalledWith('pencil')
  })

  it('disables digits and erase when disabled prop is set', () => {
    render(
      <InputPad
        mode="value"
        disabled
        onDigit={() => {}}
        onErase={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(screen.getByTestId('digit-1')).toBeDisabled()
    expect(screen.getByTestId('erase-btn')).toBeDisabled()
  })

  it('marks the active mode with aria-selected', () => {
    render(
      <InputPad
        mode="pencil"
        onDigit={() => {}}
        onErase={() => {}}
        onModeChange={() => {}}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Pencil' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Value' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })
})
