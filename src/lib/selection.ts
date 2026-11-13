export const MAX_ELEMENTS = 3

export interface ToggleResult {
  selected: string[]
  rejected: boolean
}

export function toggleSelection(
  selected: readonly string[],
  id: string,
  max: number = MAX_ELEMENTS,
): ToggleResult {
  if (selected.includes(id)) {
    return { selected: selected.filter((item) => item !== id), rejected: false }
  }
  if (selected.length >= max) {
    return { selected: [...selected], rejected: true }
  }
  return { selected: [...selected, id], rejected: false }
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatShort(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function ratio(value: number, min: number, max: number): number {
  return max === min ? 0 : clamp((value - min) / (max - min), 0, 1)
}
