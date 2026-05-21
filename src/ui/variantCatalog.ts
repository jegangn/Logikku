import type { ComponentType, SVGProps } from 'react'

import Classic from './thumbnails/classic.svg?react'
import XDiagonal from './thumbnails/x-diagonal.svg?react'
import Hyper from './thumbnails/hyper.svg?react'
import AntiKnight from './thumbnails/anti-knight.svg?react'
import AntiKing from './thumbnails/anti-king.svg?react'
import NonConsecutive from './thumbnails/non-consecutive.svg?react'
import EvenOdd from './thumbnails/even-odd.svg?react'
import Jigsaw from './thumbnails/jigsaw.svg?react'
import Kropki from './thumbnails/kropki.svg?react'
import Xv from './thumbnails/xv.svg?react'
import GreaterThan from './thumbnails/greater-than.svg?react'
import Thermometer from './thumbnails/thermometer.svg?react'
import Arrow from './thumbnails/arrow.svg?react'
import Killer from './thumbnails/killer.svg?react'
import LittleKiller from './thumbnails/little-killer.svg?react'
import Sandwich from './thumbnails/sandwich.svg?react'
import Skyscraper from './thumbnails/skyscraper.svg?react'
import Palindrome from './thumbnails/palindrome.svg?react'
import Renban from './thumbnails/renban.svg?react'
import GermanWhispers from './thumbnails/german-whispers.svg?react'
import Mini6 from './thumbnails/mini-6.svg?react'
import Mega16 from './thumbnails/mega-16.svg?react'
import Samurai from './thumbnails/samurai.svg?react'

import classicMd from './onboarding/classic.md?raw'
import xDiagonalMd from './onboarding/x-diagonal.md?raw'
import hyperMd from './onboarding/hyper.md?raw'
import antiKnightMd from './onboarding/anti-knight.md?raw'
import antiKingMd from './onboarding/anti-king.md?raw'
import nonConsecutiveMd from './onboarding/non-consecutive.md?raw'
import evenOddMd from './onboarding/even-odd.md?raw'
import jigsawMd from './onboarding/jigsaw.md?raw'
import kropkiMd from './onboarding/kropki.md?raw'
import xvMd from './onboarding/xv.md?raw'
import greaterThanMd from './onboarding/greater-than.md?raw'
import thermometerMd from './onboarding/thermometer.md?raw'
import arrowMd from './onboarding/arrow.md?raw'
import killerMd from './onboarding/killer.md?raw'
import littleKillerMd from './onboarding/little-killer.md?raw'
import sandwichMd from './onboarding/sandwich.md?raw'
import skyscraperMd from './onboarding/skyscraper.md?raw'
import palindromeMd from './onboarding/palindrome.md?raw'
import renbanMd from './onboarding/renban.md?raw'
import germanWhispersMd from './onboarding/german-whispers.md?raw'
import mini6Md from './onboarding/mini-6.md?raw'
import mega16Md from './onboarding/mega-16.md?raw'
import samuraiMd from './onboarding/samurai.md?raw'

export type VariantKind =
  | 'classic' | 'x-diagonal' | 'hyper' | 'anti-knight' | 'anti-king'
  | 'non-consecutive' | 'even-odd' | 'jigsaw' | 'kropki' | 'xv'
  | 'greater-than' | 'thermometer' | 'arrow' | 'killer' | 'little-killer'
  | 'sandwich' | 'skyscraper' | 'palindrome' | 'renban' | 'german-whispers'
  | 'mini-6' | 'mega-16' | 'samurai'

export type VariantSize = '9x9' | '6x6' | '16x16' | 'samurai'
export type VariantFeature =
  | 'classic-like' | 'cage' | 'path' | 'outside-clue'
  | 'parity' | 'edge-clue' | 'arithmetic'

export interface VariantMeta {
  readonly kind: VariantKind
  readonly size: VariantSize
  readonly features: ReadonlyArray<VariantFeature>
  readonly Thumbnail: ComponentType<SVGProps<SVGSVGElement>>
  readonly onboarding: string
}

export const VARIANT_CATALOG: ReadonlyArray<VariantMeta> = [
  { kind: 'classic',          size: '9x9',     features: ['classic-like'],          Thumbnail: Classic,         onboarding: classicMd },
  { kind: 'x-diagonal',       size: '9x9',     features: ['classic-like'],          Thumbnail: XDiagonal,       onboarding: xDiagonalMd },
  { kind: 'hyper',            size: '9x9',     features: ['classic-like'],          Thumbnail: Hyper,           onboarding: hyperMd },
  { kind: 'anti-knight',      size: '9x9',     features: ['classic-like'],          Thumbnail: AntiKnight,      onboarding: antiKnightMd },
  { kind: 'anti-king',        size: '9x9',     features: ['classic-like'],          Thumbnail: AntiKing,        onboarding: antiKingMd },
  { kind: 'non-consecutive',  size: '9x9',     features: ['classic-like'],          Thumbnail: NonConsecutive,  onboarding: nonConsecutiveMd },
  { kind: 'even-odd',         size: '9x9',     features: ['parity'],                Thumbnail: EvenOdd,         onboarding: evenOddMd },
  { kind: 'jigsaw',           size: '9x9',     features: ['classic-like'],          Thumbnail: Jigsaw,          onboarding: jigsawMd },
  { kind: 'kropki',           size: '9x9',     features: ['edge-clue'],             Thumbnail: Kropki,          onboarding: kropkiMd },
  { kind: 'xv',               size: '9x9',     features: ['edge-clue','arithmetic'],Thumbnail: Xv,              onboarding: xvMd },
  { kind: 'greater-than',     size: '9x9',     features: ['edge-clue'],             Thumbnail: GreaterThan,     onboarding: greaterThanMd },
  { kind: 'thermometer',      size: '9x9',     features: ['path'],                  Thumbnail: Thermometer,     onboarding: thermometerMd },
  { kind: 'arrow',            size: '9x9',     features: ['path','arithmetic'],     Thumbnail: Arrow,           onboarding: arrowMd },
  { kind: 'killer',           size: '9x9',     features: ['cage','arithmetic'],     Thumbnail: Killer,          onboarding: killerMd },
  { kind: 'little-killer',    size: '9x9',     features: ['outside-clue','arithmetic'], Thumbnail: LittleKiller,onboarding: littleKillerMd },
  { kind: 'sandwich',         size: '9x9',     features: ['outside-clue','arithmetic'], Thumbnail: Sandwich,    onboarding: sandwichMd },
  { kind: 'skyscraper',       size: '9x9',     features: ['outside-clue'],          Thumbnail: Skyscraper,      onboarding: skyscraperMd },
  { kind: 'palindrome',       size: '9x9',     features: ['path'],                  Thumbnail: Palindrome,      onboarding: palindromeMd },
  { kind: 'renban',           size: '9x9',     features: ['path'],                  Thumbnail: Renban,          onboarding: renbanMd },
  { kind: 'german-whispers',  size: '9x9',     features: ['path'],                  Thumbnail: GermanWhispers,  onboarding: germanWhispersMd },
  { kind: 'mini-6',           size: '6x6',     features: ['classic-like'],          Thumbnail: Mini6,           onboarding: mini6Md },
  { kind: 'mega-16',          size: '16x16',   features: ['classic-like'],          Thumbnail: Mega16,          onboarding: mega16Md },
  { kind: 'samurai',          size: 'samurai', features: ['classic-like'],          Thumbnail: Samurai,         onboarding: samuraiMd },
]

const BY_KIND: ReadonlyMap<VariantKind, VariantMeta> = new Map(
  VARIANT_CATALOG.map((v) => [v.kind, v]),
)

export function getVariant(kind: VariantKind): VariantMeta {
  const meta = BY_KIND.get(kind)
  if (!meta) throw new Error(`unknown variant kind: ${kind}`)
  return meta
}

export interface OnboardingSection {
  readonly title: string
  readonly body: string
}

const TITLE_LINE = /^title:\s*(.+)$/m

export function parseOnboardingSections(src: string): ReadonlyArray<OnboardingSection> {
  const parts = src.split(/^---$/m)
  const sections: OnboardingSection[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const yaml = parts[i] ?? ''
    const body = parts[i + 1] ?? ''
    const titleMatch = yaml.match(TITLE_LINE)
    if (!titleMatch) continue
    sections.push({ title: (titleMatch[1] ?? '').trim(), body })
  }
  if (sections.length < 2) {
    throw new Error('expected at least 2 onboarding sections')
  }
  return sections
}

export function isVariantKind(value: string): value is VariantKind {
  return BY_KIND.has(value as VariantKind)
}
