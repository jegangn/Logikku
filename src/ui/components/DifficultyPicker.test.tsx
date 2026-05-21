import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DifficultyPicker } from './DifficultyPicker'

describe('DifficultyPicker', () => {
  it('renders only difficulties present in the bank', () => {
    render(<DifficultyPicker variant="killer" onPick={() => {}} />)
    // killer ships: diabolical, easy, expert, hard, medium → no very-easy/tough
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-medium')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-hard')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-expert')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-diabolical')).toBeInTheDocument()
    expect(screen.queryByTestId('difficulty-very-easy')).toBeNull()
    expect(screen.queryByTestId('difficulty-tough')).toBeNull()
  })

  it('orders bands very-easy → diabolical', () => {
    render(<DifficultyPicker variant="samurai" onPick={() => {}} />)
    const buttons = screen.getAllByRole('button')
    const labels = buttons.map((b) => b.getAttribute('data-testid'))
    const expected = [
      'difficulty-very-easy','difficulty-easy','difficulty-medium',
      'difficulty-hard','difficulty-tough','difficulty-expert',
      'difficulty-diabolical',
    ]
    expect(labels).toEqual(expected)
  })

  it('calls onPick with the chosen band', async () => {
    const onPick = vi.fn()
    render(<DifficultyPicker variant="killer" onPick={onPick} />)
    await userEvent.click(screen.getByTestId('difficulty-hard'))
    expect(onPick).toHaveBeenCalledWith('hard')
  })
})
