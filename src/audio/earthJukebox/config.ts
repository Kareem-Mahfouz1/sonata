/**
 * SINGLE SOURCE OF TRUTH for Earth Jukebox sonification.
 * Tune these values by ear; engine code reads them and contains no voice defaults.
 *
 * Each getSeries value is normalized against the FULL published colorbar range
 * (not this location's min/max): O3 is linear (5–60 ppbv), PM2.5 and NOx are
 * logarithmic. Values are never displayed as physical concentrations.
 * Nulls rest a voice until its next valid reading; they are not low values.
 */
export type EarthLayerId = 'o3' | 'pm25' | 'nox'
export type VoiceKind = 'lead' | 'pad' | 'pulse'
export type VoiceInstrument = 'sine' | 'triangle' | 'sawtooth'
export type InstrumentId = 'piano' | 'flute' | 'violin' | 'cello' | 'guitar' | 'synth'
export type InstrumentMap = Record<EarthLayerId, InstrumentId>
export type InstrumentKind = 'sustained' | 'plucked'
export interface InstrumentConfig {
  id: InstrumentId
  label: string
  /** Honest UI label: every instrument is a local synthesized approximation. */
  honestLabel: string
  kind: InstrumentKind
  /** Realistic playable MIDI range, clamped against the voice range. */
  range: readonly [number, number]
  /** Relative output trim, 0–1. */
  level: number
  /** Oscillator shape for sustained approximations. */
  waveform: VoiceInstrument
}
export interface VoiceConfig {
  id: EarthLayerId
  label: string
  shortLabel: string
  voice: VoiceKind
  enabledByDefault: boolean
  defaultInstrument: InstrumentId
  /** Main pitch instrument, used by lead and pulse voices. */
  instrument: VoiceInstrument
  /** Normal-mode pitch scale in MIDI notes, low to high. */
  scale: readonly number[]
  /** Pitch range in MIDI notes; interpolation spans this range. */
  pitchRange: readonly [number, number]
  /** Gain curve: gain = min + (max-min) * value^curve. */
  gain: readonly [number, number, number]
  /** Short fade-in/out when valid/null transitions occur (seconds). */
  fade: number
  /** Pad brightness (filter cutoff) curve: minHz + (maxHz-minHz) * value^curve. */
  brightness?: readonly [number, number, number]
  /** Pad noise-vs-oscillator mix curve; 0 is tonal, 1 is noise. */
  noiseMix?: readonly [number, number, number]
  /** Pulse events per second curve. */
  pulseRate?: readonly [number, number, number]
  /** Plucked-note events per second curve (piano/guitar on non-pulse voices). */
  pluckRate?: readonly [number, number, number]
  /** Pulse envelope duration (seconds). */
  pulseLength?: number
}
export interface EarthJukeboxConfig {
  mode: 'normal'
  /** Fixed Cairo preset only in this checkpoint; the photo probe is untouched. */
  preset: { id: 'cairo'; latitude: number; longitude: number; label: string }
  /** One full 301-frame pass at 1x takes about this many seconds. */
  sweepSeconds: number
  speed: { min: number; max: number; step: number; default: number }
  voices: readonly VoiceConfig[]
  instruments: readonly InstrumentConfig[]
  /** Extension point for a later fun mode with swappable instruments. */
  funMode: { enabled: false }
}

/** Fixed pentatonic pitch classes, extended across octaves so low instruments stay consonant. */
export const PENTATONIC_SCALE = [
  36, 38, 40, 43, 45,
  48, 50, 52, 55, 57,
  60, 62, 64, 67, 69,
  72, 74, 76, 79, 81, 84,
] as const

export const instrumentConfigs: readonly InstrumentConfig[] = [
  { id: 'piano', label: 'Piano', honestLabel: 'synth: piano-like', kind: 'plucked', range: [36, 84], level: 0.9, waveform: 'sine' },
  { id: 'flute', label: 'Flute', honestLabel: 'synth: flute-like', kind: 'sustained', range: [60, 84], level: 1, waveform: 'triangle' },
  { id: 'violin', label: 'Violin', honestLabel: 'synth: violin-like', kind: 'sustained', range: [55, 84], level: 0.85, waveform: 'sawtooth' },
  { id: 'cello', label: 'Cello', honestLabel: 'synth: cello-like', kind: 'sustained', range: [36, 64], level: 0.9, waveform: 'sawtooth' },
  { id: 'guitar', label: 'Guitar', honestLabel: 'synth: guitar-like', kind: 'plucked', range: [40, 76], level: 0.85, waveform: 'triangle' },
  { id: 'synth', label: 'Synth', honestLabel: 'synthesized voice', kind: 'sustained', range: [36, 84], level: 1, waveform: 'triangle' },
] as const

export const earthJukeboxConfig: EarthJukeboxConfig = {
  mode: 'normal',
  preset: { id: 'cairo', latitude: 30.04, longitude: 31.24, label: 'Cairo' },
  sweepSeconds: 60,
  speed: { min: 0.25, max: 2, step: 0.25, default: 1 },
  voices: [
    {
      id: 'o3', label: 'Ozone', shortLabel: 'O3', voice: 'lead', enabledByDefault: true,
      defaultInstrument: 'flute', instrument: 'triangle', scale: PENTATONIC_SCALE, pitchRange: [48, 84],
      gain: [0.035, 0.15, 0.8], fade: 0.12, pluckRate: [1.1, 2.6, 1],
    },
    {
      id: 'pm25', label: 'Particulate matter', shortLabel: 'PM2.5', voice: 'pad',
      enabledByDefault: true, defaultInstrument: 'cello', instrument: 'sine', scale: PENTATONIC_SCALE,
      pitchRange: [36, 48], gain: [0.025, 0.13, 1], fade: 0.35,
      brightness: [240, 3800, 1.4], noiseMix: [0.08, 0.72, 1], pluckRate: [0.65, 1.5, 1],
    },
    {
      id: 'nox', label: 'Nitrogen oxides', shortLabel: 'NOx', voice: 'pulse',
      enabledByDefault: false, defaultInstrument: 'guitar', instrument: 'sine', scale: PENTATONIC_SCALE,
      pitchRange: [60, 72], gain: [0.035, 0.13, 0.8], fade: 0.06,
      pulseRate: [0.45, 3.6, 1], pulseLength: 0.085,
    },
  ],
  instruments: instrumentConfigs,
  funMode: { enabled: false },
}

export function voiceConfig(id: EarthLayerId): VoiceConfig {
  const found = earthJukeboxConfig.voices.find((voice) => voice.id === id)
  if (!found) throw new Error(`No sonification mapping for ${id}`)
  return found
}

export function instrumentConfig(id: InstrumentId): InstrumentConfig {
  const found = earthJukeboxConfig.instruments.find((instrument) => instrument.id === id)
  if (!found) throw new Error(`No instrument mapping for ${id}`)
  return found
}

export function defaultInstrumentMap(): InstrumentMap {
  return Object.fromEntries(earthJukeboxConfig.voices.map((voice) => [voice.id, voice.defaultInstrument])) as InstrumentMap
}

/** The engine releases this node before activating the next one. */
export function instrumentSwitchPlan(current: InstrumentId, next: InstrumentId): { active: InstrumentId; release: InstrumentId | null } {
  return { active: next, release: current === next ? null : current }
}

export function normalizedToGain(value: number, [min, max, curve]: readonly [number, number, number]): number {
  const bounded = Math.min(1, Math.max(0, value))
  return min + (max - min) * bounded ** curve
}

export function normalizedToMidi(value: number, [low, high]: readonly [number, number]): number {
  const bounded = Math.min(1, Math.max(0, value))
  return low + (high - low) * bounded
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** Snap to the nearest configured scale note; the scale is the normal-mode constraint. */
export function midiToScale(midi: number, scale: readonly number[]): number {
  return scale.reduce((closest, note) => Math.abs(note - midi) < Math.abs(closest - midi) ? note : closest)
}

/** Clamp the voice range against the instrument's realistic range. */
export function voiceRangeForInstrument(config: VoiceConfig, instrumentId: InstrumentId): readonly [number, number] {
  const instrument = instrumentConfig(instrumentId)
  const low = Math.max(config.pitchRange[0], instrument.range[0])
  const high = Math.min(config.pitchRange[1], instrument.range[1])
  return low <= high ? [low, high] : config.pitchRange
}

export function valueToFrequency(value: number, config: VoiceConfig, instrumentId: InstrumentId = 'synth'): number {
  const range = voiceRangeForInstrument(config, instrumentId)
  return midiToFrequency(midiToScale(normalizedToMidi(value, range), PENTATONIC_SCALE))
}

export function curveValue(value: number, curve: readonly [number, number, number]): number {
  const [min, max, power] = curve
  return min + (max - min) * Math.min(1, Math.max(0, value)) ** power
}

export function describeLevel(value: number): string {
  if (value >= 0.75) return 'high compared with this layer’s range'
  if (value >= 0.45) return 'mid-to-high compared with this layer’s range'
  if (value >= 0.2) return 'mid-to-low compared with this layer’s range'
  return 'low compared with this layer’s range'
}
