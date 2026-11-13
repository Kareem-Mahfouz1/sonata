// Fire-and-forget visual effects consumed by AmbientField. Coordinates are
// viewport pixels, matching the pointer events that trigger them.
export function burst(x: number, y: number, color: string, count = 20): void {
  window.dispatchEvent(new CustomEvent('ej:burst', { detail: { x, y, color, count } }))
}

export function ripple(x: number, y: number, color: string): void {
  window.dispatchEvent(new CustomEvent('ej:ripple', { detail: { x, y, color } }))
}

export function flash(): void {
  window.dispatchEvent(new CustomEvent('ej:flash'))
}
