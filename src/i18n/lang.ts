export type Language = 'en' | 'ms' | 'system'

export function resolveLang(language: Language): 'en' | 'ms' {
  if (language !== 'system') return language
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language.toLowerCase().startsWith('ms') ? 'ms' : 'en'
}

export function applyLang(language: Language): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = resolveLang(language)
}

export function watchSystemLang(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('languagechange', onChange)
  return () => window.removeEventListener('languagechange', onChange)
}
