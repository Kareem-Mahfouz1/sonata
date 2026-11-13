import type { VoiceSpec } from '../audio/sonification'

export type ExplorationMode = 'probe' | 'scan' | 'time'

export interface Mapping {
  variable: string
  destination: string
  color: string
}

export interface ObservationMarker {
  x: number
  y: number
  label: string
}

export interface ObservationDataset {
  id: string
  code: string
  name: string
  subtitle: string
  image: string
  imageAlt: string
  credit: string
  lat: number
  lng: number
  resolution: string
  projection: string
  live: boolean
  duration: number
  waveSeed: number
  markers: ObservationMarker[]
  mappings: Mapping[]
  voices: VoiceSpec[]
}

// Placeholder observations: dataset names, coordinates and mappings are design
// examples, not validated NASA integrations. Imagery is public-domain NASA.
export const observations: ObservationDataset[] = [
  {
    id: 'ocean-currents',
    code: 'DS-OC-2024',
    name: 'Global Ocean Currents',
    subtitle: 'Surface velocity & temperature',
    image: '/images/ocean-clouds.jpg',
    imageAlt: 'Satellite view of cloud streets over the Atlantic Ocean off West Africa',
    credit: 'NASA Earth Observatory',
    lat: 14.59,
    lng: -38.21,
    resolution: '0.25° × 0.25°',
    projection: 'EQUIDIRECTANGULAR',
    live: true,
    duration: 300,
    waveSeed: 17,
    markers: [
      { x: 40, y: 30, label: 'Probe A · 14.59° N, 38.21° W' },
      { x: 60, y: 60, label: 'Probe B · 11.82° N, 34.04° W' },
      { x: 22, y: 70, label: 'Probe C · 18.20° N, 29.55° W' },
    ],
    mappings: [
      { variable: 'Temperature', destination: 'Pitch', color: '#E86A7C' },
      { variable: 'Current Velocity', destination: 'Amplitude', color: '#78B9BC' },
      { variable: 'Salinity Depth', destination: 'Timbre / Filter', color: '#729BCB' },
    ],
    voices: [
      { frequency: 130.8, type: 'sine', lfo: 0.3, depth: 4 },
      { frequency: 196, type: 'triangle', lfo: 0.5, depth: 3 },
      { frequency: 261.6, type: 'sine', lfo: 0.2, depth: 6, gain: 0.08 },
    ],
  },
  {
    id: 'atmospheric-co2',
    code: 'DS-AT-2024',
    name: 'Atmospheric CO2',
    subtitle: 'Tropospheric dispersion',
    image: '/images/atlantic-clouds.jpg',
    imageAlt: 'Satellite view of cloud streets over the North Atlantic',
    credit: 'NASA Earth Observatory',
    lat: 52.4,
    lng: -18.7,
    resolution: '0.50° × 0.50°',
    projection: 'ORTHOGRAPHIC',
    live: false,
    duration: 300,
    waveSeed: 41,
    markers: [
      { x: 30, y: 28, label: 'Probe A · 52.40° N, 18.70° W' },
      { x: 58, y: 52, label: 'Probe B · 49.10° N, 15.22° W' },
      { x: 72, y: 74, label: 'Probe C · 46.85° N, 12.90° W' },
    ],
    mappings: [
      { variable: 'CO₂ Concentration', destination: 'Pitch', color: '#A39BCB' },
      { variable: 'Aerosol Depth', destination: 'Amplitude', color: '#78B9BC' },
      { variable: 'Cloud Fraction', destination: 'Timbre / Filter', color: '#729BCB' },
    ],
    voices: [
      { frequency: 110, type: 'triangle', lfo: 0.8, depth: 5 },
      { frequency: 164.8, type: 'sine', lfo: 0.4, depth: 2 },
      { frequency: 329.6, type: 'sine', lfo: 1.1, depth: 8, gain: 0.06 },
    ],
  },
  {
    id: 'seismic-resonance',
    code: 'DS-SR-2024',
    name: 'Seismic Resonance',
    subtitle: 'Tectonic plate stress metrics',
    image: '/images/earth-iss.jpg',
    imageAlt: 'Night side of Earth photographed from the International Space Station',
    credit: 'NASA / ISS Crew Earth Observations',
    lat: 35.68,
    lng: 139.69,
    resolution: '0.10° × 0.10°',
    projection: 'NIGHT SIDE · ORTHO',
    live: false,
    duration: 300,
    waveSeed: 73,
    markers: [
      { x: 34, y: 66, label: 'Probe A · 35.68° N, 139.69° E' },
      { x: 52, y: 54, label: 'Probe B · 38.20° N, 142.10° E' },
      { x: 69, y: 72, label: 'Probe C · 33.40° N, 135.80° E' },
    ],
    mappings: [
      { variable: 'Plate Stress', destination: 'Pitch', color: '#E86A7C' },
      { variable: 'Event Depth', destination: 'Amplitude', color: '#78B9BC' },
      { variable: 'Magnitude', destination: 'Timbre / Filter', color: '#729BCB' },
    ],
    voices: [
      { frequency: 55, type: 'sawtooth', lfo: 0.2, depth: 1.5, gain: 0.06 },
      { frequency: 82.4, type: 'sine', lfo: 0.7, depth: 3 },
      { frequency: 123.5, type: 'triangle', lfo: 0.35, depth: 2 },
    ],
  },
]

export function findObservation(id: string): ObservationDataset {
  return observations.find((observation) => observation.id === id) ?? observations[0]
}

export function formatCoords(lat: number, lng: number): string {
  const ns = lat < 0 ? 'S' : 'N'
  const ew = lng < 0 ? 'W' : 'E'
  return `LAT: ${Math.abs(lat).toFixed(2)}° ${ns}   LNG: ${Math.abs(lng).toFixed(2)}° ${ew}`
}
