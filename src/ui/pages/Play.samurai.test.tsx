import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Play } from './Play'
import { useGameStore } from '@/state/gameStore'

function mountAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play" element={<Play />} />
      </Routes>
    </MemoryRouter>,
  )
}

function mockOrientation(portrait: boolean) {
  const listeners: Array<(ev: MediaQueryListEvent) => void> = []
  ;(window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = vi
    .fn()
    .mockImplementation(() => ({
      matches: portrait,
      addEventListener: (_t: string, cb: (ev: MediaQueryListEvent) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_t: string, cb: (ev: MediaQueryListEvent) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  useGameStore.setState({
    board: null,
    selected: null,
    history: [],
    historyIndex: -1,
    completedAt: null,
    puzzleId: null,
  } as Partial<ReturnType<typeof useGameStore.getState>>)
  mockOrientation(false)
})

describe('Play.tsx — samurai variant', () => {
  it('renders cruciform when /play?variant=samurai&difficulty=easy', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    expect(await screen.findByTestId('samurai-board')).toBeInTheDocument()
    expect(screen.queryByTestId('board')).toBeNull()
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`samurai-subgrid-${i}`)).toBeInTheDocument()
    }
  })

  it('tapping a shared cell selects in both center and NW', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const centerCell = within(screen.getByTestId('samurai-subgrid-0'))
      .getByTestId('cell-1-1')
    await user.click(centerCell)
    expect(centerCell.getAttribute('data-selected')).toBe('true')
    const nwCell = within(screen.getByTestId('samurai-subgrid-1'))
      .getByTestId('cell-7-7')
    expect(nwCell.getAttribute('data-selected')).toBe('true')
  })

  it('keyboard digit places in both shared cells', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const centerCell = within(screen.getByTestId('samurai-subgrid-0'))
      .getByTestId('cell-1-1')
    await user.click(centerCell)
    await user.keyboard('7')
    expect(centerCell.getAttribute('aria-label')).toMatch(/entered 7/)
    const nwCell = within(screen.getByTestId('samurai-subgrid-1'))
      .getByTestId('cell-7-7')
    expect(nwCell.getAttribute('aria-label')).toMatch(/entered 7/)
  })

  it('Backspace clears the placement on both sides', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const centerCell = within(screen.getByTestId('samurai-subgrid-0'))
      .getByTestId('cell-1-1')
    await user.click(centerCell)
    await user.keyboard('7')
    await user.keyboard('{Backspace}')
    const nwCell = within(screen.getByTestId('samurai-subgrid-1'))
      .getByTestId('cell-7-7')
    expect(centerCell.getAttribute('aria-label')).toMatch(/empty/)
    expect(nwCell.getAttribute('aria-label')).toMatch(/empty/)
  })

  it('toolbar label reads "Samurai · Easy"', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    expect(screen.getByText(/Samurai · Easy/)).toBeInTheDocument()
  })

  it('portrait orientation swaps the cruciform for RotateDevicePrompt', async () => {
    mockOrientation(true)
    mountAt('/play?variant=samurai&difficulty=easy')
    expect(await screen.findByTestId('rotate-device-prompt')).toBeInTheDocument()
    expect(screen.queryByTestId('samurai-board')).toBeNull()
  })

  it('classic variant still renders the legacy Board', async () => {
    mountAt('/play?variant=classic&difficulty=easy')
    expect(await screen.findByTestId('board')).toBeInTheDocument()
    expect(screen.queryByTestId('samurai-board')).toBeNull()
  })
})
