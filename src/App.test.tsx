import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the home page brand heading at /', async () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Logikku' }),
      ).toBeInTheDocument()
    })
  })
})
