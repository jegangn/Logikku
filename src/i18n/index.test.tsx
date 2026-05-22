import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider, useT, useLang } from './index'
import { useSettingsStore } from '@/state/settingsStore'

function Probe() {
  const t = useT()
  const lang = useLang()
  return <span data-testid="probe">{`${lang}:${t.home.settings}`}</span>
}

describe('LanguageProvider / useT / useLang', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'system' })
  })

  it('falls back to English when there is no provider', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('en:Settings')
  })

  it('serves English when settings language is en', () => {
    useSettingsStore.setState({ language: 'en' })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('en:Settings')
  })

  it('serves Bahasa Malaysia when settings language is ms', () => {
    useSettingsStore.setState({ language: 'ms' })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('ms:Tetapan')
  })
})
