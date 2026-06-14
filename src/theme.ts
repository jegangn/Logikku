export function applyTheme(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset['theme'] = 'light'
}
