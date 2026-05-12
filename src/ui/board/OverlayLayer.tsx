import type { PropsWithChildren } from 'react'
import { XDiagonalOverlay } from './overlays/XDiagonalOverlay'

export interface OverlayLayerProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly variant?: string
}

export function OverlayLayer({
  gridSize,
  cellSize,
  variant,
  children,
}: PropsWithChildren<OverlayLayerProps>) {
  return (
    <g data-testid="overlay-layer">
      {variant === 'x-diagonal' && (
        <XDiagonalOverlay gridSize={gridSize} cellSize={cellSize} />
      )}
      {children}
    </g>
  )
}
