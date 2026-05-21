import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import 'fake-indexeddb/auto'
import { Onboarding } from './Onboarding'
import { useOnboardingStore } from '@/state/onboardingStore'
import { _resetDbForTests } from '@/storage/db'

beforeEach(async () => {
  await _resetDbForTests()
  useOnboardingStore.setState({ seen: new Set(), loaded: true })
})

describe('Onboarding', () => {
  it('renders screen 1 first with Next button', () => {
    render(<Onboarding kind="killer" onDone={() => {}} />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-next')).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-done')).toBeNull()
  })

  it('Next advances to screen 2 (Done button)', async () => {
    render(<Onboarding kind="killer" onDone={() => {}} />)
    await userEvent.click(screen.getByTestId('onboarding-next'))
    expect(screen.getByText('Quick example')).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-done')).toBeInTheDocument()
  })

  it('Done calls markSeen + onDone', async () => {
    const onDone = vi.fn()
    render(<Onboarding kind="killer" onDone={onDone} />)
    await userEvent.click(screen.getByTestId('onboarding-next'))
    await userEvent.click(screen.getByTestId('onboarding-done'))
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
    expect(onDone).toHaveBeenCalled()
  })

  it('Skip from screen 1 also marks seen + calls onDone', async () => {
    const onDone = vi.fn()
    render(<Onboarding kind="killer" onDone={onDone} />)
    await userEvent.click(screen.getByTestId('onboarding-skip'))
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
    expect(onDone).toHaveBeenCalled()
  })

  it('backdrop tap dismisses with markSeen', async () => {
    const onDone = vi.fn()
    render(<Onboarding kind="killer" onDone={onDone} />)
    await userEvent.click(screen.getByTestId('onboarding-backdrop'))
    expect(useOnboardingStore.getState().hasSeen('killer')).toBe(true)
    expect(onDone).toHaveBeenCalled()
  })
})
