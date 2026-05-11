import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  it('shows the puzzle label', () => {
    render(<Toolbar puzzleLabel="Classic · Easy" onNew={() => {}} />)
    expect(screen.getByText('Classic · Easy')).toBeInTheDocument()
  })

  it('calls onNew when New button is tapped', async () => {
    const onNew = vi.fn()
    render(<Toolbar puzzleLabel="Classic · Easy" onNew={onNew} />)
    await userEvent.setup().click(screen.getByTestId('new-btn'))
    expect(onNew).toHaveBeenCalled()
  })
})
