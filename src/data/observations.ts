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
  lat: string
  lng: string
  resolution: string
  projection: string
  live: boolean
  duration: number
  waveSeed: number
  markers: ObservationMarker[]
  mappings: Mapping[]
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
    lat: '14.59° N',
    lng: '38.21° W',
    resolution: '0.25° × 0.25°',
    projection: 'EQUIDIRECTANGULAR',
    live: true,
    duration: 300,
    waveSeed: 17,
    markers: [
      { x: 37, y: 44, label: 'Probe A · 14.59° N, 38.21° W' },
      { x: 63, y: 61, label: 'Probe B · 11.82° N, 34.04° W' },
      { x: 76, y: 33, label: 'Probe C · 18.20° N, 29.55° W' },
    ],
    mappings: [
      { variable: 'Temperature', destination: 'Pitch', color: '#D98989' },
      { variable: 'Current Velocity', destination: 'Amplitude', color: '#78B9BC' },
      { variable: 'Salinity Depth', destination: 'Timbre / Filter', color: '#729BCB' },
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
    lat: '52.40° N',
    lng: '18.70° W',
    resolution: '0.50° × 0.50°',
    projection: 'ORTHOGRAPHIC',
    live: false,
    duration: 240,
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
  },
  {
    id: 'seismic-resonance',
    code: 'DS-SM-2024',
    name: 'Seismic Resonance',
    subtitle: 'Tectonic plate stress metrics',
    image: '/images/earth-iss.jpg',
    imageAlt: 'Night side of Earth photographed from the International Space Station',
    credit: 'NASA / ISS Crew Earth Observations',
    lat: '35.68° N',
    lng: '139.69° E',
    resolution: '0.10° × 0.10°',
    projection: 'NIGHT SIDE · ORTHO',
    live: false,
    duration: 210,
    waveSeed: 73,
    markers: [
      { x: 34, y: 66, label: 'Probe A · 35.68° N, 139.69° E' },
      { x: 52, y: 54, label: 'Probe B · 38.20° N, 142.10° E' },
      { x: 69, y: 72, label: 'Probe C · 33.40° N, 135.80° E' },
    ],
    mappings: [
      { variable: 'Plate Stress', destination: 'Pitch', color: '#D98989' },
      { variable: 'Event Depth', destination: 'Amplitude', color: '#78B9BC' },
      { variable: 'Magnitude', destination: 'Timbre / Filter', color: '#729BCB' },
    ],
  },
]

export function findObservation(id: string): ObservationDataset {
  return observations.find((observation) => observation.id === id) ?? observations[0]
}
