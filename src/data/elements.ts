import type { VoiceSpec } from '../audio/sonification'

export type ElementKind = 'chlorophyll' | 'aerosol' | 'thermal' | 'ozone' | 'vegetation' | 'dust'

export interface ObservationElement {
  id: string
  name: string
  /** Provisional category — the extraction pipeline is not built yet. */
  category: string
  descriptor: string
  color: string
  kind: ElementKind
  size: number
  /** Bubble centre as a percentage of the observation field. */
  x: number
  y: number
  glyph?: string
  voice: VoiceSpec
}

export const elements: ObservationElement[] = [
  {
    id: 'chlorophyll',
    name: 'Oceanic Chlorophyll',
    category: 'Derived feature',
    descriptor: 'Freq Mod // Surface',
    color: '#78B9BC',
    kind: 'chlorophyll',
    size: 148,
    x: 28.4,
    y: 35,
    voice: { frequency: 220, type: 'sine', lfo: 0.4, depth: 8 },
  },
  {
    id: 'aerosols',
    name: 'Atmospheric Aerosols',
    category: 'Atmospheric constituent',
    descriptor: 'Amplitude // Cloud',
    color: '#A39BCB',
    kind: 'aerosol',
    size: 176,
    x: 66,
    y: 25,
    voice: { frequency: 329.6, type: 'triangle', lfo: 0.25, depth: 3 },
  },
  {
    id: 'sst',
    name: 'Sea Surface Temp',
    category: 'Scientific variable',
    descriptor: 'Distortion // Thermal',
    color: '#729BCB',
    kind: 'thermal',
    size: 124,
    x: 47.5,
    y: 58,
    voice: { frequency: 110, type: 'sawtooth', lfo: 0.9, depth: 3, gain: 0.06 },
  },
  {
    id: 'ozone',
    name: 'Ozone O₃',
    category: 'Atmospheric constituent',
    descriptor: 'Pitch // Stratosphere',
    color: '#B07BE0',
    kind: 'ozone',
    size: 100,
    x: 19.5,
    y: 49,
    glyph: 'O₃',
    voice: { frequency: 165, type: 'sine', lfo: 0.3, depth: 2 },
  },
  {
    id: 'vegetation',
    name: 'Vegetation',
    category: 'Observation category',
    descriptor: 'Timbre // Land',
    color: '#E0883E',
    kind: 'vegetation',
    size: 112,
    x: 34.4,
    y: 74.5,
    voice: { frequency: 261.6, type: 'triangle', lfo: 0.5, depth: 4 },
  },
  {
    id: 'dust',
    name: 'Dust Plume',
    category: 'Derived feature',
    descriptor: 'Filter // Desert',
    color: '#D6B477',
    kind: 'dust',
    size: 96,
    x: 42.4,
    y: 20,
    voice: { frequency: 392, type: 'sine', lfo: 0.7, depth: 5 },
  },
]
