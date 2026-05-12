import type { PropsWithChildren } from 'react'
import { XDiagonalOverlay } from './overlays/XDiagonalOverlay'
import { HyperOverlay } from './overlays/HyperOverlay'
import { JigsawOverlay } from './overlays/JigsawOverlay'
import { EvenOddOverlay } from './overlays/EvenOddOverlay'

export interface OverlayLayerProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly variant?: string
  /** Jigsaw: per-cell piece id, length `gridSize*gridSize`. */
  readonly jigsawPieceMap?: ReadonlyArray<number>
  /** Even-Odd: 'E' / 'O' / '.' mask string. */
  readonly parityMask?: string
}

export function OverlayLayer({
  gridSize,
  cellSize,
  variant,
  jigsawPieceMap,
  parityMask,
  children,
}: PropsWithChildren<OverlayLayerProps>) {
  return (
    <g data-testid="overlay-layer">
      {variant === 'x-diagonal' && (
        <XDiagonalOverlay gridSize={gridSize} cellSize={cellSize} />
      )}
      {variant === 'hyper' && (
        <HyperOverlay gridSize={gridSize} cellSize={cellSize} />
      )}
      {variant === 'jigsaw' && jigsawPieceMap && (
        <JigsawOverlay
          gridSize={gridSize}
          cellSize={cellSize}
          pieceMap={jigsawPieceMap}
        />
      )}
      {variant === 'even-odd' && parityMask && (
        <EvenOddOverlay
          gridSize={gridSize}
          cellSize={cellSize}
          parityMask={parityMask}
        />
      )}
      {children}
    </g>
  )
}
