import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BackButton } from './BackButton'

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

describe('BackButton', () => {
  it('navigates to an explicit target when `to` is given', () => {
    render(
      <MemoryRouter initialEntries={['/play']}>
        <Routes>
          <Route
            path="/play"
            element={
              <>
                <BackButton to="/" />
                <LocationProbe />
              </>
            }
          />
          <Route path="/" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/')
  })

  it('goes back to the previous screen when there is history and no `to`', () => {
    render(
      <MemoryRouter initialEntries={['/first']}>
        <Routes>
          <Route
            path="/first"
            element={
              <>
                <Link to="/second">go</Link>
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/second"
            element={
              <>
                <BackButton />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/second')
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/first')
  })

  it('falls back to Home when there is no in-app history and no `to`', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route
            path="/settings"
            element={
              <>
                <BackButton />
                <LocationProbe />
              </>
            }
          />
          <Route path="/" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/')
  })

  it('renders a custom label when provided', () => {
    render(
      <MemoryRouter>
        <BackButton label="Home" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
  })
})
