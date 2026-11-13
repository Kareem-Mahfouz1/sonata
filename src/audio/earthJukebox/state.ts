import { describeLevel, earthJukeboxConfig, type EarthLayerId } from './config.ts'

export type LayerState = Record<EarthLayerId, number | null>

/** Null is an immediate rest, never a low reading. No value is carried across it. */
export function voiceAction(value: number | null, enabled: boolean): 'set' | 'rest' {
  return enabled && value !== null ? 'set' : 'rest'
}

/** Choose a valid sample at or after a frame without inventing or bridging a value. */
export function scrubFrame<T>(values: readonly (T | null)[], requested: number): number {
  return Math.max(0, Math.min(values.length - 1, Math.floor(requested)))
}

export function describeState(states: LayerState): string {
  const parts = earthJukeboxConfig.voices.map((voice) => {
    const value = states[voice.id]
    return value === null ? `${voice.label}: no reliable reading; voice resting` : `${voice.label}: ${describeLevel(value)}`
  })
  return `${parts.join('. ')}.`
}

export const TIMING_LABEL = 'hour index since 2024-07-01 00:00, assumed hourly, unverified'
