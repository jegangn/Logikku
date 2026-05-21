import { create } from 'zustand'
import {
  getOnboarding,
  putOnboarding,
  type SavedOnboarding,
} from '@/storage/db'
import type { VariantKind } from '@/ui/variantCatalog'

export interface OnboardingState {
  readonly seen: ReadonlySet<VariantKind>
  readonly loaded: boolean
  hasSeen: (kind: VariantKind) => boolean
  markSeen: (kind: VariantKind) => Promise<void>
  reset: () => Promise<void>
  loadFromDb: () => Promise<void>
}

async function persist(seen: ReadonlySet<VariantKind>): Promise<void> {
  const next: SavedOnboarding = { key: 'v1', kinds: [...seen] }
  await putOnboarding(next)
}

export const useOnboardingStore = create<OnboardingState>((setState, get) => ({
  seen: new Set<VariantKind>(),
  loaded: false,

  hasSeen: (kind) => get().seen.has(kind),

  loadFromDb: async () => {
    const saved = await getOnboarding()
    setState({
      seen: new Set(saved.kinds as ReadonlyArray<VariantKind>),
      loaded: true,
    })
  },

  markSeen: async (kind) => {
    const current = get().seen
    if (current.has(kind)) return
    const next = new Set(current)
    next.add(kind)
    setState({ seen: next })
    await persist(next)
  },

  reset: async () => {
    const empty = new Set<VariantKind>()
    setState({ seen: empty })
    await persist(empty)
  },
}))
