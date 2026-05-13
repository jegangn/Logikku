import type { Difficulty } from '@/engine/grader/se'

/**
 * Optional per-puzzle structure carried alongside `givens`. Variants that
 * need it (Jigsaw, Even-Odd, ...) populate the relevant fields; the loader
 * passes them straight to the constraint factory at play time.
 */
export interface PuzzleRecord {
  readonly id: string
  readonly variant: string
  readonly size: number
  readonly givens: string
  readonly difficulty: Difficulty
  readonly se: number
  readonly hardestTier: number
  readonly steps: number
  readonly generatedAt: string
  /** Jigsaw: 9 polyomino regions, each as an array of 9 cell indices (r*size+c). */
  readonly regions?: ReadonlyArray<ReadonlyArray<number>>
  /** Even-Odd: 81-char mask of "E" / "O" / ".". */
  readonly parityMask?: string
  /** Kropki / XV / Greater-Than: edge marks. */
  readonly edges?: ReadonlyArray<{
    readonly from: { readonly r: number; readonly c: number }
    readonly to: { readonly r: number; readonly c: number }
    readonly kind: string
  }>
  /** Thermometer: paths from bulb to tip. */
  readonly thermometers?: ReadonlyArray<{
    readonly id: string
    readonly path: ReadonlyArray<{ readonly r: number; readonly c: number }>
  }>
  /** Arrow: head + tail. */
  readonly arrows?: ReadonlyArray<{
    readonly id: string
    readonly head: ReadonlyArray<{ readonly r: number; readonly c: number }>
    readonly tail: ReadonlyArray<{ readonly r: number; readonly c: number }>
  }>
}

export type PuzzleBank = ReadonlyArray<PuzzleRecord>
