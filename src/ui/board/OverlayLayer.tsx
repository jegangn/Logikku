import type { PropsWithChildren } from 'react'
import { XDiagonalOverlay } from './overlays/XDiagonalOverlay'
import { HyperOverlay } from './overlays/HyperOverlay'
import { JigsawOverlay } from './overlays/JigsawOverlay'
import { EvenOddOverlay } from './overlays/EvenOddOverlay'
import {
  EdgeMarkOverlay,
  type EdgeMark,
} from './overlays/EdgeMarkOverlay'
import {
  ThermometerOverlay,
  type ThermometerPath,
} from './overlays/ThermometerOverlay'
import { ArrowOverlay, type ArrowShape } from './overlays/ArrowOverlay'

export interface OverlayLayerProps {
  readonly gridSize: number
  readonly cellSize: number
  readonly variant?: string
  /** Jigsaw: per-cell piece id, length `gridSize*gridSize`. */
  readonly jigsawPieceMap?: ReadonlyArray<number>
  /** Even-Odd: 'E' / 'O' / '.' mask string. */
  readonly parityMask?: string
  /** Kropki / XV / Greater-Than: edge marks. */
  readonly edges?: ReadonlyArray<EdgeMark>
  /** Thermometer: paths from bulb to tip. */
  readonly thermometers?: ReadonlyArray<ThermometerPath>
  /** Arrow: head + tail paths. */
  readonly arrows?: ReadonlyArray<ArrowShape>
}

export function OverlayLayer({
  gridSize,
  cellSize,
  variant,
  jigsawPieceMap,
  parityMask,
  edges,
  thermometers,
  arrows,
  children,
}: PropsWithChildren<OverlayLayerProps>) {
  const isEdgeVariant =
    variant === 'kropki' || variant === 'xv' || variant === 'greater-than'
  return (
    <g data-testid="overlay-layer">
      {variant === 'thermometer' && thermometers && thermometers.length > 0 && (
        <ThermometerOverlay
          gridSize={gridSize}
          cellSize={cellSize}
          thermometers={thermometers}
        />
      )}
      {variant === 'arrow' && arrows && arrows.length > 0 && (
        <ArrowOverlay
          gridSize={gridSize}
          cellSize={cellSize}
          arrows={arrows}
        />
      )}
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
      {isEdgeVariant && edges && edges.length > 0 && (
        <EdgeMarkOverlay
          gridSize={gridSize}
          cellSize={cellSize}
          edges={edges}
        />
      )}
      {children}
    </g>
  )
}
