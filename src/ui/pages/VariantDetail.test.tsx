import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { VariantDetail } from './VariantDetail'
import { useOnboardingStore } from '@/state/onboardingStore'
import { useStatsStore } from '@/state/statsStore'
import { _resetDbForTests, putStats } from '@/storage/db'

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
  useStatsStore.setState({ byBand: {}, loaded: false })
  await putStats({ key: 'v1', byBand: {} })
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

  it('hides the stats block when the variant has no completions', async () => {
    mountAt('/variant/killer')
    await screen.findByText('Pick difficulty')
    expect(screen.queryByTestId('variant-stats')).toBeNull()
  })

  it('shows played count and best time aggregated across the variant bands', async () => {
    await useStatsStore.getState().recordCompletion('killer', 'easy', 263_000)
    await useStatsStore.getState().recordCompletion('killer', 'hard', 600_000)
    mountAt('/variant/killer')
    const stats = await screen.findByTestId('variant-stats')
    expect(stats).toHaveTextContent('Played 2')
    expect(stats).toHaveTextContent('Best time 4m 23s')
  })

  it('does not count another variant toward this one', async () => {
    await useStatsStore.getState().recordCompletion('classic', 'easy', 120_000)
    mountAt('/variant/killer')
    await screen.findByText('Pick difficulty')
    expect(screen.queryByTestId('variant-stats')).toBeNull()
  })
})
