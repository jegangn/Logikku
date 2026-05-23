import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Settings } from './Settings'

describe('Settings footer', () => {
  it('links to Stats, Privacy, and About', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/stats')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })
})
