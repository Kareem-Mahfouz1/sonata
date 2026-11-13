export function announce(message: string): void {
  window.dispatchEvent(new CustomEvent('earth-jukebox:announce', { detail: message }))
}
