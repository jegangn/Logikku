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
    const { centerCell, nwCell } = await findEmptySharedCell()
    await user.click(centerCell)
    await user.keyboard('7')
    expect(centerCell.getAttribute('aria-label')).toMatch(/entered 7/)
    expect(nwCell.getAttribute('aria-label')).toMatch(/entered 7/)
  })

  it('Backspace clears the placement on both sides', async () => {
    mountAt('/play?variant=samurai&difficulty=easy')
    await screen.findByTestId('samurai-board')
    const user = userEvent.setup()
    const { centerCell, nwCell } = await findEmptySharedCell()
    await user.click(centerCell)
    await user.keyboard('7')
    await user.keyboard('{Backspace}')
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

// Walk all 4 shared boxes of the cruciform and return the first non-given
// (center cell, mirror cell) pair. Per SAMURAI_LAYOUT: NW pairs center box
// (0,0) ↔ NW (2,2); NE pairs (0,2) ↔ (2,0); SW pairs (2,0) ↔ (0,2); SE
// pairs (2,2) ↔ (0,0). The "centerCell" we return is the center side; the
// "nwCell" is its partner in the corresponding corner sub-grid.
async function findEmptySharedCell(): Promise<{
  centerCell: HTMLElement
  nwCell: HTMLElement
}> {
  const center = screen.getByTestId('samurai-subgrid-0')
  // Each tuple: (cornerIdx, centerBoxR, centerBoxC, cornerBoxR, cornerBoxC).
  const corners: ReadonlyArray<[number, number, number, number, number]> = [
    [1, 0, 0, 2, 2],
    [2, 0, 2, 2, 0],
    [3, 2, 0, 0, 2],
    [4, 2, 2, 0, 0],
  ]
  for (const [cornerIdx, cbr, cbc, xbr, xbc] of corners) {
    const corner = screen.getByTestId(`samurai-subgrid-${cornerIdx}`)
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const centerR = cbr * 3 + dr
        const centerC = cbc * 3 + dc
        const cell = within(center).getByTestId(`cell-${centerR}-${centerC}`)
        if (cell.getAttribute('data-given') === 'false') {
          const cornerR = xbr * 3 + dr
          const cornerC = xbc * 3 + dc
          const partner = within(corner).getByTestId(`cell-${cornerR}-${cornerC}`)
          return { centerCell: cell, nwCell: partner }
        }
      }
    }
  }
  throw new Error('no empty shared cell across the four cruciform overlaps')
}
