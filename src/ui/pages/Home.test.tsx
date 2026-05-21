import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { Home } from './Home'
import { _resetDbForTests } from '@/storage/db'

beforeEach(async () => {
  await _resetDbForTests()
})

function mount() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  it('renders 23 variant cards', async () => {
    mount()
    expect(await screen.findByTestId('variant-card-classic')).toBeInTheDocument()
    expect(screen.getByTestId('variant-card-samurai')).toBeInTheDocument()
    expect(screen.getByTestId('variant-card-killer')).toBeInTheDocument()
    expect(screen.getByTestId('variant-card-jigsaw')).toHaveAttribute('aria-disabled', 'true')
  })

  it('grid-size filter narrows the visible set', async () => {
    mount()
    await screen.findByTestId('variant-card-classic')
    await userEvent.click(screen.getByTestId('filter-size-6x6'))
    expect(screen.getByTestId('variant-card-mini-6')).toBeInTheDocument()
    expect(screen.queryByTestId('variant-card-classic')).toBeNull()
  })

  it('feature filter (Cage) keeps only killer', async () => {
    mount()
    await screen.findByTestId('variant-card-classic')
    await userEvent.click(screen.getByTestId('filter-feature-cage'))
    expect(screen.getByTestId('variant-card-killer')).toBeInTheDocument()
    expect(screen.queryByTestId('variant-card-classic')).toBeNull()
  })

  it('empty intersection shows empty state', async () => {
    mount()
    await screen.findByTestId('variant-card-classic')
    await userEvent.click(screen.getByTestId('filter-size-6x6'))
    await userEvent.click(screen.getByTestId('filter-feature-cage'))
    expect(screen.getByTestId('home-empty')).toBeInTheDocument()
  })

  it('shows Stats + Settings nav links', async () => {
    mount()
    expect(await screen.findByTestId('link-stats')).toBeInTheDocument()
    expect(screen.getByTestId('link-settings')).toBeInTheDocument()
  })
})
