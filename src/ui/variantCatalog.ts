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

import classicEnMd from './onboarding/classic.md?raw'
import classicMsMd from './onboarding/classic.ms.md?raw'
import xDiagonalEnMd from './onboarding/x-diagonal.md?raw'
import xDiagonalMsMd from './onboarding/x-diagonal.ms.md?raw'
import hyperEnMd from './onboarding/hyper.md?raw'
import hyperMsMd from './onboarding/hyper.ms.md?raw'
import antiKnightEnMd from './onboarding/anti-knight.md?raw'
import antiKnightMsMd from './onboarding/anti-knight.ms.md?raw'
import antiKingEnMd from './onboarding/anti-king.md?raw'
import antiKingMsMd from './onboarding/anti-king.ms.md?raw'
import nonConsecutiveEnMd from './onboarding/non-consecutive.md?raw'
import nonConsecutiveMsMd from './onboarding/non-consecutive.ms.md?raw'
import evenOddEnMd from './onboarding/even-odd.md?raw'
import evenOddMsMd from './onboarding/even-odd.ms.md?raw'
import jigsawEnMd from './onboarding/jigsaw.md?raw'
import jigsawMsMd from './onboarding/jigsaw.ms.md?raw'
import kropkiEnMd from './onboarding/kropki.md?raw'
import kropkiMsMd from './onboarding/kropki.ms.md?raw'
import xvEnMd from './onboarding/xv.md?raw'
import xvMsMd from './onboarding/xv.ms.md?raw'
import greaterThanEnMd from './onboarding/greater-than.md?raw'
import greaterThanMsMd from './onboarding/greater-than.ms.md?raw'
import thermometerEnMd from './onboarding/thermometer.md?raw'
import thermometerMsMd from './onboarding/thermometer.ms.md?raw'
import arrowEnMd from './onboarding/arrow.md?raw'
import arrowMsMd from './onboarding/arrow.ms.md?raw'
import killerEnMd from './onboarding/killer.md?raw'
import killerMsMd from './onboarding/killer.ms.md?raw'
import littleKillerEnMd from './onboarding/little-killer.md?raw'
import littleKillerMsMd from './onboarding/little-killer.ms.md?raw'
import sandwichEnMd from './onboarding/sandwich.md?raw'
import sandwichMsMd from './onboarding/sandwich.ms.md?raw'
import skyscraperEnMd from './onboarding/skyscraper.md?raw'
import skyscraperMsMd from './onboarding/skyscraper.ms.md?raw'
import palindromeEnMd from './onboarding/palindrome.md?raw'
import palindromeMsMd from './onboarding/palindrome.ms.md?raw'
import renbanEnMd from './onboarding/renban.md?raw'
import renbanMsMd from './onboarding/renban.ms.md?raw'
import germanWhispersEnMd from './onboarding/german-whispers.md?raw'
import germanWhispersMsMd from './onboarding/german-whispers.ms.md?raw'
import mini6EnMd from './onboarding/mini-6.md?raw'
import mini6MsMd from './onboarding/mini-6.ms.md?raw'
import mega16EnMd from './onboarding/mega-16.md?raw'
import mega16MsMd from './onboarding/mega-16.ms.md?raw'
import samuraiEnMd from './onboarding/samurai.md?raw'
import samuraiMsMd from './onboarding/samurai.ms.md?raw'

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
  readonly onboarding: { readonly en: string; readonly ms: string }
}

export const VARIANT_CATALOG: ReadonlyArray<VariantMeta> = [
  { kind: 'classic',          size: '9x9',     features: ['classic-like'],          Thumbnail: Classic,         onboarding: { en: classicEnMd,         ms: classicMsMd } },
  { kind: 'x-diagonal',       size: '9x9',     features: ['classic-like'],          Thumbnail: XDiagonal,       onboarding: { en: xDiagonalEnMd,       ms: xDiagonalMsMd } },
  { kind: 'hyper',            size: '9x9',     features: ['classic-like'],          Thumbnail: Hyper,           onboarding: { en: hyperEnMd,           ms: hyperMsMd } },
  { kind: 'anti-knight',      size: '9x9',     features: ['classic-like'],          Thumbnail: AntiKnight,      onboarding: { en: antiKnightEnMd,      ms: antiKnightMsMd } },
  { kind: 'anti-king',        size: '9x9',     features: ['classic-like'],          Thumbnail: AntiKing,        onboarding: { en: antiKingEnMd,        ms: antiKingMsMd } },
  { kind: 'non-consecutive',  size: '9x9',     features: ['classic-like'],          Thumbnail: NonConsecutive,  onboarding: { en: nonConsecutiveEnMd,  ms: nonConsecutiveMsMd } },
  { kind: 'even-odd',         size: '9x9',     features: ['parity'],                Thumbnail: EvenOdd,         onboarding: { en: evenOddEnMd,         ms: evenOddMsMd } },
  { kind: 'jigsaw',           size: '9x9',     features: ['classic-like'],          Thumbnail: Jigsaw,          onboarding: { en: jigsawEnMd,          ms: jigsawMsMd } },
  { kind: 'kropki',           size: '9x9',     features: ['edge-clue'],             Thumbnail: Kropki,          onboarding: { en: kropkiEnMd,          ms: kropkiMsMd } },
  { kind: 'xv',               size: '9x9',     features: ['edge-clue','arithmetic'],Thumbnail: Xv,              onboarding: { en: xvEnMd,              ms: xvMsMd } },
  { kind: 'greater-than',     size: '9x9',     features: ['edge-clue'],             Thumbnail: GreaterThan,     onboarding: { en: greaterThanEnMd,     ms: greaterThanMsMd } },
  { kind: 'thermometer',      size: '9x9',     features: ['path'],                  Thumbnail: Thermometer,     onboarding: { en: thermometerEnMd,     ms: thermometerMsMd } },
  { kind: 'arrow',            size: '9x9',     features: ['path','arithmetic'],     Thumbnail: Arrow,           onboarding: { en: arrowEnMd,           ms: arrowMsMd } },
  { kind: 'killer',           size: '9x9',     features: ['cage','arithmetic'],     Thumbnail: Killer,          onboarding: { en: killerEnMd,          ms: killerMsMd } },
  { kind: 'little-killer',    size: '9x9',     features: ['outside-clue','arithmetic'], Thumbnail: LittleKiller,onboarding: { en: littleKillerEnMd,    ms: littleKillerMsMd } },
  { kind: 'sandwich',         size: '9x9',     features: ['outside-clue','arithmetic'], Thumbnail: Sandwich,    onboarding: { en: sandwichEnMd,        ms: sandwichMsMd } },
  { kind: 'skyscraper',       size: '9x9',     features: ['outside-clue'],          Thumbnail: Skyscraper,      onboarding: { en: skyscraperEnMd,      ms: skyscraperMsMd } },
  { kind: 'palindrome',       size: '9x9',     features: ['path'],                  Thumbnail: Palindrome,      onboarding: { en: palindromeEnMd,      ms: palindromeMsMd } },
  { kind: 'renban',           size: '9x9',     features: ['path'],                  Thumbnail: Renban,          onboarding: { en: renbanEnMd,          ms: renbanMsMd } },
  { kind: 'german-whispers',  size: '9x9',     features: ['path'],                  Thumbnail: GermanWhispers,  onboarding: { en: germanWhispersEnMd,  ms: germanWhispersMsMd } },
  { kind: 'mini-6',           size: '6x6',     features: ['classic-like'],          Thumbnail: Mini6,           onboarding: { en: mini6EnMd,           ms: mini6MsMd } },
  { kind: 'mega-16',          size: '16x16',   features: ['classic-like'],          Thumbnail: Mega16,          onboarding: { en: mega16EnMd,          ms: mega16MsMd } },
  { kind: 'samurai',          size: 'samurai', features: ['classic-like'],          Thumbnail: Samurai,         onboarding: { en: samuraiEnMd,         ms: samuraiMsMd } },
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
  // Every `---` line is a section fence, so onboarding bodies must not use
  // `---` as a markdown horizontal rule — it would mis-split the sections.
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
