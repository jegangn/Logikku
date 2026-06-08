import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cell } from './Cell'

function renderInSvg(child: React.ReactElement) {
  return render(
    <svg viewBox="0 0 100 100" data-testid="svg-wrap">
      {child}
    </svg>,
  )
}

describe('Cell', () => {
  it('renders a placed value', () => {
    renderInSvg(
      <Cell
        coord={{ r: 0, c: 0 }}
        cellSize={64}
        gridSize={9}
        value={5}
        candidates={new Set()}
        given={false}
        selected={false}
        peerHighlight={false}
        sameValueHighlight={false}
        conflict={false}
        locked={false}
        shakeKey={0}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders pencil marks for an empty cell', () => {
    renderInSvg(
      <Cell
        coord={{ r: 0, c: 0 }}
        cellSize={64}
        gridSize={9}
        value={null}
        candidates={new Set([1, 3, 7])}
        given={false}
        selected={false}
        peerHighlight={false}
        sameValueHighlight={false}
        conflict={false}
        locked={false}
        shakeKey={0}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.queryByText('2')).toBeNull()
  })

  it('uses given styling weight 700 when given', () => {
    renderInSvg(
      <Cell
        coord={{ r: 0, c: 0 }}
        cellSize={64}
        gridSize={9}
        value={9}
        candidates={new Set()}
        given={true}
        selected={false}
        peerHighlight={false}
        sameValueHighlight={false}
        conflict={false}
        locked={false}
        shakeKey={0}
        onSelect={() => {}}
      />,
    )
    const text = screen.getByText('9')
    expect(text.getAttribute('font-weight')).toBe('700')
  })

  it('exposes aria-label describing the cell', () => {
    renderInSvg(
      <Cell
        coord={{ r: 2, c: 4 }}
        cellSize={64}
        gridSize={9}
        value={null}
        candidates={new Set()}
        given={false}
        selected={false}
        peerHighlight={false}
        sameValueHighlight={false}
        conflict={false}
        locked={false}
        shakeKey={0}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByLabelText(/row 3 column 5/i)).toBeInTheDocument()
  })

  it('renders hex glyph for value 12 as "C"', () => {
    renderInSvg(
      <Cell
        coord={{ r: 0, c: 0 }}
        cellSize={64}
        gridSize={16}
        value={12}
        candidates={new Set()}
        given={false}
        selected={false}
        peerHighlight={false}
        sameValueHighlight={false}
        conflict={false}
        locked={false}
        shakeKey={0}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders 4x4 pencil marks with hex labels when gridSize=16', () => {
    renderInSvg(
      <Cell
        coord={{ r: 0, c: 0 }}
        cellSize={64}
        gridSize={16}
        value={null}
        candidates={new Set([1, 10, 11, 16])}
        given={false}
        selected={false}
        peerHighlight={false}
        sameValueHighlight={false}
        conflict={false}
        locked={false}
        shakeKey={0}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
    expect(screen.queryByText('2')).toBeNull()
  })
})
