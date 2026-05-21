import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { VariantDetail } from './VariantDetail'
import { useOnboardingStore } from '@/state/onboardingStore'
import { _resetDbForTests } from '@/storage/db'

function mountAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div data-testid="home-stub">home</div>} />
        <Route path="/variant/:kind" element={<VariantDetail />} />
        <Route path="/play" element={<div data-testid="play-stub">play</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await _resetDbForTests()
  useOnboardingStore.setState({ seen: new Set(), loaded: true })
})

describe('VariantDetail', () => {
  it('renders rules and difficulty picker for killer', () => {
    mountAt('/variant/killer')
    expect(screen.getByText('Killer')).toBeInTheDocument()
    expect(screen.getByText('Rules')).toBeInTheDocument()
    expect(screen.getByText('Pick difficulty')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-easy')).toBeInTheDocument()
  })

  it('unknown kind redirects to /', () => {
    mountAt('/variant/nonsense')
    expect(screen.getByTestId('home-stub')).toBeInTheDocument()
  })

  it('first-play opens onboarding instead of navigating to /play', async () => {
    mountAt('/variant/killer')
    await userEvent.click(screen.getByTestId('difficulty-easy'))
    expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument()
    expect(screen.queryByTestId('play-stub')).toBeNull()
  })

  it('after onboarding seen, difficulty pick navigates to /play directly', async () => {
    useOnboardingStore.setState({ seen: new Set(['killer'] as const), loaded: true })
    mountAt('/variant/killer')
    await userEvent.click(screen.getByTestId('difficulty-easy'))
    expect(await screen.findByTestId('play-stub')).toBeInTheDocument()
  })
})
