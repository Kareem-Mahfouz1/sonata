export type ElementKind = 'chlorophyll' | 'aerosol' | 'thermal' | 'oxygen' | 'vegetation'

export interface ObservationElement {
  id: string
  name: string
  /** Provisional category — the extraction pipeline is not built yet. */
  category: string
  descriptor: string
  color: string
  light: string
  kind: ElementKind
  size: number
  left: string
  top: string
  driftX: string
  driftY: string
  floatDuration: string
  floatDelay: string
}

export const elements: ObservationElement[] = [
  {
    id: 'chlorophyll',
    name: 'Oceanic Chlorophyll',
    category: 'Derived feature',
    descriptor: 'Freq Mod // Surface',
    color: '#2f9c9a',
    light: '#9fe4dd',
    kind: 'chlorophyll',
    size: 150,
    left: '5%',
    top: '55%',
    driftX: '10px',
    driftY: '-14px',
    floatDuration: '11s',
    floatDelay: '-2s',
  },
  {
    id: 'aerosols',
    name: 'Atmospheric Aerosols',
    category: 'Atmospheric constituent',
    descriptor: 'Amplitude // Cloud',
    color: '#8e84c4',
    light: '#d8d2f4',
    kind: 'aerosol',
    size: 134,
    left: '17%',
    top: '13%',
    driftX: '-8px',
    driftY: '12px',
    floatDuration: '15s',
    floatDelay: '-6s',
  },
  {
    id: 'sst',
    name: 'Sea Surface Temp',
    category: 'Scientific variable',
    descriptor: 'Distortion // Thermal',
    color: '#5c88ba',
    light: '#c3dcf5',
    kind: 'thermal',
    size: 126,
    left: '73%',
    top: '16%',
    driftX: '12px',
    driftY: '10px',
    floatDuration: '13s',
    floatDelay: '-4s',
  },
  {
    id: 'oxygen',
    name: 'Oxygen',
    category: 'Atmospheric constituent',
    descriptor: 'Air // Suspension',
    color: '#8a7bd1',
    light: '#ded6ff',
    kind: 'oxygen',
    size: 116,
    left: '79%',
    top: '57%',
    driftX: '-11px',
    driftY: '-12px',
    floatDuration: '9s',
    floatDelay: '-1s',
  },
  {
    id: 'vegetation',
    name: 'Vegetation',
    category: 'Observation category',
    descriptor: 'Harmonics // Canopy',
    color: '#b58a55',
    light: '#f0d5ac',
    kind: 'vegetation',
    size: 140,
    left: '57%',
    top: '67%',
    driftX: '8px',
    driftY: '-10px',
    floatDuration: '17s',
    floatDelay: '-8s',
  },
]
