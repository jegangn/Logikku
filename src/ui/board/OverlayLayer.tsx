import type { PropsWithChildren } from 'react'

export interface OverlayLayerProps {
  readonly gridSize: number
  readonly cellSize: number
}

export function OverlayLayer({
  children,
}: PropsWithChildren<OverlayLayerProps>) {
  return <g data-testid="overlay-layer">{children}</g>
}
