export type Screen = 'observatory' | 'fun'

export function screenFromLocation(hash: string, search: string): Screen {
  if (hash === '#fun') return 'fun'
  if (hash === '#signals' || hash === '#observatory') return 'observatory'
  return new URLSearchParams(search).get('screen') === 'fun' ? 'fun' : 'observatory'
}

export function hashForScreen(screen: Screen): string {
  return screen === 'fun' ? '#fun' : '#signals'
}
