import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { About } from './About'

describe('About', () => {
  it('shows the injected app version', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('app-version')).toHaveTextContent(__APP_VERSION__)
  })

  it('links to the privacy page', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy')
  })

  it('links to settings for backup/restore', () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /back up/i })).toHaveAttribute('href', '/settings')
  })
})
