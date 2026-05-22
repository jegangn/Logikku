import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SamuraiBoardView } from './SamuraiBoardView'
import { createSamuraiBoard, setValueShared } from '@/engine'

describe('SamuraiBoardView', () => {
  it('renders 5 sub-grid groups', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`samurai-subgrid-${i}`)).toBeInTheDocument()
    }
  })

  it('renders 5 × 81 = 405 gridcells', () => {
    const board = createSamuraiBoard()
    const { container } = render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(405)
  })

  it('sets outer SVG viewBox to 0 0 630 630 (21 × 30)', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    const svg = screen.getByTestId('samurai-board')
    expect(svg.getAttribute('viewBox')).toBe('0 0 630 630')
  })

  it('selecting a shared cell highlights it in BOTH the center and the NW corner', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView
        board={board}
        selected={{ gridIdx: 0, coord: { r: 1, c: 1 } }}
        onSelect={() => {}}
      />,
    )
    const center = screen
      .getByTestId('samurai-subgrid-0')
      .querySelector('[data-testid="cell-1-1"]')
    const nw = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-7"]')
    expect(center?.getAttribute('data-selected')).toBe('true')
    expect(nw?.getAttribute('data-selected')).toBe('true')
  })

  it('selecting an unshared cell highlights only that sub-grid', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView
        board={board}
        selected={{ gridIdx: 2, coord: { r: 5, c: 5 } }}
        onSelect={() => {}}
      />,
    )
    const ne = screen
      .getByTestId('samurai-subgrid-2')
      .querySelector('[data-testid="cell-5-5"]')
    expect(ne?.getAttribute('data-selected')).toBe('true')
    for (const otherIdx of [0, 1, 3, 4]) {
      const other = screen
        .getByTestId(`samurai-subgrid-${otherIdx}`)
        .querySelectorAll('[data-selected="true"]')
      expect(other.length).toBe(0)
    }
  })

  it('onSelect fires { gridIdx, coord } on NW corner tap', async () => {
    const board = createSamuraiBoard()
    const onSelect = vi.fn()
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={onSelect} />,
    )
    const nwCell = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-7"]')!
    const user = userEvent.setup()
    await user.click(nwCell)
    expect(onSelect).toHaveBeenCalledWith({
      gridIdx: 1,
      coord: { r: 7, c: 7 },
    })
  })

  it('peer highlight extends across the overlap when selection is shared', () => {
    const board = createSamuraiBoard()
    render(
      <SamuraiBoardView
        board={board}
        selected={{ gridIdx: 0, coord: { r: 1, c: 1 } }}
        onSelect={() => {}}
      />,
    )
    const nwPeerSample = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-5"]')
    const rect = nwPeerSample?.querySelector('rect')
    expect(rect?.getAttribute('fill')).toBe('rgba(255, 255, 255, 0.03)')
  })

  it('omits aria-colindex on samurai cells (documented exception)', () => {
    const board = createSamuraiBoard()
    render(<SamuraiBoardView board={board} selected={null} onSelect={() => {}} />)
    const center = screen
      .getByTestId('samurai-subgrid-0')
      .querySelector('[data-testid="cell-1-1"]')
    const corner = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-1-1"]')
    expect(center?.getAttribute('aria-colindex')).toBeNull()
    expect(corner?.getAttribute('aria-colindex')).toBeNull()
  })

  it('reflects samuraiConflicts in both center and corner for a shared duplicate', () => {
    const board = createSamuraiBoard()
    setValueShared(board, 0, { r: 1, c: 1 }, 5)
    setValueShared(board, 0, { r: 1, c: 5 }, 5)
    render(
      <SamuraiBoardView board={board} selected={null} onSelect={() => {}} />,
    )
    const centerConflict = screen
      .getByTestId('samurai-subgrid-0')
      .querySelector('[data-testid="cell-1-1"]')
    const nwConflict = screen
      .getByTestId('samurai-subgrid-1')
      .querySelector('[data-testid="cell-7-7"]')
    expect(centerConflict?.getAttribute('data-conflict')).toBe('true')
    expect(nwConflict?.getAttribute('data-conflict')).toBe('true')
  })
})
