import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from './Board'
import {
  CLASSIC_9,
  createClassicConstraint,
  createHyperConstraint,
  createXDiagonalConstraint,
  parsePuzzle,
} from '@/engine'

const EASY =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'

function makeGrid(puzzle = EASY) {
  const c = createClassicConstraint({ shape: CLASSIC_9 })
  return { ...parsePuzzle(puzzle, CLASSIC_9), constraints: [c] }
}

describe('Board', () => {
  it('renders 81 cells with grid role', () => {
    const grid = makeGrid()
    render(<Board grid={grid} selected={null} onSelect={() => {}} />)
    const board = screen.getByTestId('board')
    expect(within(board).getAllByRole('gridcell')).toHaveLength(81)
  })

  it('marks the selected cell via data-selected', () => {
    const grid = makeGrid()
    render(
      <Board grid={grid} selected={{ r: 4, c: 4 }} onSelect={() => {}} />,
    )
    const sel = screen.getByTestId('cell-4-4')
    expect(sel.getAttribute('data-selected')).toBe('true')
    const other = screen.getByTestId('cell-0-0')
    expect(other.getAttribute('data-selected')).toBe('false')
  })

  it('calls onSelect when a cell is clicked', async () => {
    const onSelect = vi.fn()
    const grid = makeGrid()
    render(<Board grid={grid} selected={null} onSelect={onSelect} />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('cell-2-3'))
    expect(onSelect).toHaveBeenCalledWith({ r: 2, c: 3 })
  })

  it('marks conflicting cells via data-conflict', () => {
    const conflicting =
      '550000000' + '0'.repeat(72)
    const grid = makeGrid(conflicting)
    render(<Board grid={grid} selected={null} onSelect={() => {}} />)
    expect(screen.getByTestId('cell-0-0').getAttribute('data-conflict')).toBe(
      'true',
    )
    expect(screen.getByTestId('cell-0-1').getAttribute('data-conflict')).toBe(
      'true',
    )
    expect(screen.getByTestId('cell-1-1').getAttribute('data-conflict')).toBe('false')
  })

  it('exposes an aria-label for screen readers', () => {
    const grid = makeGrid()
    render(<Board grid={grid} selected={null} onSelect={() => {}} />)
    expect(screen.getByRole('grid', { name: /sudoku board/i })).toBeInTheDocument()
  })

  it('renders the x-diagonal overlay when variant="x-diagonal"', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const xdiag = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const grid = {
      ...parsePuzzle('0'.repeat(81), CLASSIC_9),
      constraints: [classic, xdiag],
    }
    render(
      <Board
        grid={grid}
        selected={null}
        variant="x-diagonal"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('x-diagonal-overlay')).toBeInTheDocument()
  })

  it('omits the x-diagonal overlay for classic variant', () => {
    const grid = makeGrid()
    render(
      <Board grid={grid} selected={null} variant="classic" onSelect={() => {}} />,
    )
    expect(screen.queryByTestId('x-diagonal-overlay')).toBeNull()
  })

  it('renders the hyper overlay when variant="hyper"', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const hyper = createHyperConstraint({ shape: CLASSIC_9 })
    const grid = {
      ...parsePuzzle('0'.repeat(81), CLASSIC_9),
      constraints: [classic, hyper],
    }
    render(
      <Board
        grid={grid}
        selected={null}
        variant="hyper"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('hyper-overlay')).toBeInTheDocument()
  })

  it('detects conflicts inside a hyper window', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const hyper = createHyperConstraint({ shape: CLASSIC_9 })
    const givens =
      '0'.repeat(10) +
      '6' + // (1,1)
      '0'.repeat(15) +
      '6' + // (2,7)... wait, recompute below
      '0'.repeat(54)
    // Place two 6s inside window-1 (rows 1-3, cols 1-3): at (1,1) and (3,3).
    const cells = '0'.repeat(81).split('')
    cells[1 * 9 + 1] = '6'
    cells[3 * 9 + 3] = '6'
    const givens2 = cells.join('')
    void givens
    const grid = {
      ...parsePuzzle(givens2, CLASSIC_9),
      constraints: [classic, hyper],
    }
    render(
      <Board
        grid={grid}
        selected={null}
        variant="hyper"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('cell-1-1').getAttribute('data-conflict')).toBe(
      'true',
    )
    expect(screen.getByTestId('cell-3-3').getAttribute('data-conflict')).toBe(
      'true',
    )
  })

  it('detects conflicts on the NE-SW diagonal under x-diagonal', () => {
    const classic = createClassicConstraint({ shape: CLASSIC_9 })
    const xdiag = createXDiagonalConstraint({ shape: CLASSIC_9 })
    const givens =
      '00000000' + '4' + // row 0: (0,8)=4
      '0'.repeat(63) +
      '4' + '0'.repeat(8) // row 8: (8,0)=4
    const grid = {
      ...parsePuzzle(givens, CLASSIC_9),
      constraints: [classic, xdiag],
    }
    render(
      <Board
        grid={grid}
        selected={null}
        variant="x-diagonal"
        onSelect={() => {}}
      />,
    )
    expect(screen.getByTestId('cell-0-8').getAttribute('data-conflict')).toBe(
      'true',
    )
    expect(screen.getByTestId('cell-8-0').getAttribute('data-conflict')).toBe(
      'true',
    )
  })
})
