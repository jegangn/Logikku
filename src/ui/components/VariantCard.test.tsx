import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VariantCard } from './VariantCard'

function renderAt(kind: 'killer' | 'jigsaw', disabled: boolean) {
  return render(
    <MemoryRouter>
      <VariantCard kind={kind} disabled={disabled} />
    </MemoryRouter>,
  )
}

describe('VariantCard', () => {
  it('renders enabled link with name + description for killer', () => {
    renderAt('killer', false)
    const card = screen.getByTestId('variant-card-killer')
    expect(card.tagName).toBe('A')
    expect(card.getAttribute('href')).toBe('/variant/killer')
    expect(card).toHaveTextContent('Killer')
    expect(card).toHaveTextContent('Cages with target sums')
  })

  it('renders disabled card without link for jigsaw', () => {
    renderAt('jigsaw', true)
    const card = screen.getByTestId('variant-card-jigsaw')
    expect(card.tagName).not.toBe('A')
    expect(card.getAttribute('aria-disabled')).toBe('true')
  })
})
