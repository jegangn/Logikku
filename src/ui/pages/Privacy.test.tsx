import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Privacy } from './Privacy'

describe('Privacy', () => {
  it('states plainly that no data is collected', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    )
    expect(screen.getByText(/collects no data/i)).toBeInTheDocument()
  })

  it('back button returns home', async () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/" element={<div data-testid="home-stub">home</div>} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('← Back'))
    expect(screen.getByTestId('home-stub')).toBeInTheDocument()
  })
})
