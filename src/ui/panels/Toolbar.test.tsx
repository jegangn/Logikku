import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Toolbar } from './Toolbar'

function setup(overrides: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props = {
    puzzleLabel: 'Classic · Easy',
    canUndo: true,
    canRedo: true,
    onNew: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...overrides,
  }
  render(
    <MemoryRouter>
      <Toolbar {...props} />
    </MemoryRouter>,
  )
  return props
}

describe('Toolbar', () => {
  it('shows the puzzle label', () => {
    setup()
    expect(screen.getByText('Classic · Easy')).toBeInTheDocument()
  })

  it('renders a back button to Home', () => {
    setup()
    expect(screen.getByTestId('back-home')).toBeInTheDocument()
  })

  it('fires onNew on New button', async () => {
    const props = setup()
    await userEvent.setup().click(screen.getByTestId('new-btn'))
    expect(props.onNew).toHaveBeenCalled()
  })

  it('fires onUndo on Undo button when enabled', async () => {
    const props = setup({ canUndo: true })
    await userEvent.setup().click(screen.getByTestId('undo-btn'))
    expect(props.onUndo).toHaveBeenCalled()
  })

  it('disables Undo when canUndo is false', () => {
    setup({ canUndo: false })
    expect(screen.getByTestId('undo-btn')).toBeDisabled()
  })

  it('disables Redo when canRedo is false', () => {
    setup({ canRedo: false })
    expect(screen.getByTestId('redo-btn')).toBeDisabled()
  })
})
