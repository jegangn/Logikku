import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardCellsLayer } from './BoardCellsLayer'
import { CLASSIC_9, createClassicConstraint, parsePuzzle } from '@/engine'

function makeGrid() {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...parsePuzzle('0'.repeat(81), CLASSIC_9), constraints: [c] }
}

describe('BoardCellsLayer', () => {
  it('renders 81 gridcells inside a single <g>', () => {
    const grid = makeGrid()
    const { container } = render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={() => {}}
        />
      </svg>,
    )
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(81)
  })

  it('marks the selected cell via data-selected', () => {
    const grid = makeGrid()
    render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={{ r: 4, c: 4 }}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={() => {}}
        />
      </svg>,
    )
    expect(screen.getByTestId('cell-4-4').getAttribute('data-selected')).toBe('true')
    expect(screen.getByTestId('cell-0-0').getAttribute('data-selected')).toBe('false')
  })

  it('fires onSelect with the local coord', async () => {
    const grid = makeGrid()
    const onSelect = vi.fn()
    render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          onSelect={onSelect}
        />
      </svg>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByTestId('cell-2-3'))
    expect(onSelect).toHaveBeenCalledWith({ r: 2, c: 3 })
  })

  it('marks conflict cells via data-conflict from the conflictSet prop', () => {
    const grid = makeGrid()
    render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set(['0,0', '0,1'])}
          onSelect={() => {}}
        />
      </svg>,
    )
    expect(screen.getByTestId('cell-0-0').getAttribute('data-conflict')).toBe('true')
    expect(screen.getByTestId('cell-0-1').getAttribute('data-conflict')).toBe('true')
    expect(screen.getByTestId('cell-1-1').getAttribute('data-conflict')).toBe('false')
  })

  it('suppresses heavy box lines when suppressBoxLines=true', () => {
    const grid = makeGrid()
    const { container } = render(
      <svg>
        <BoardCellsLayer
          grid={grid}
          cellSize={30}
          selectedCoord={null}
          selectedValue={null}
          peerSet={new Set()}
          conflictSet={new Set()}
          suppressBoxLines
          onSelect={() => {}}
        />
      </svg>,
    )
    // No tier-2 box separators remain (they collapse to thin cell lines)...
    const boxLines = container.querySelectorAll('line[stroke="var(--color-grid-box)"]')
    expect(boxLines.length).toBe(0)
    // ...but the outer frame (4 edges) is always drawn.
    const frameLines = container.querySelectorAll('line[stroke="var(--color-board-frame)"]')
    expect(frameLines.length).toBe(4)
  })

})

describe('Board (existing) still passes through to BoardCellsLayer', () => {
  it('renders 81 cells via the integrated Board', async () => {
    const { Board } = await import('./Board')
    const grid = makeGrid()
    render(<Board grid={grid} selected={null} onSelect={() => {}} />)
    const board = screen.getByTestId('board')
    expect(within(board).getAllByRole('gridcell')).toHaveLength(81)
  })
})
