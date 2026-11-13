export interface PresetPoint {
  id: string
  label: string
  lat: number
  lon: number
  evidence: string
}

export const presetPoints: PresetPoint[] = [
  { id: 'cairo', label: 'Cairo', lat: 30.04, lon: 31.24, evidence: 'Nightly build-up and morning drop; three layers available.' },
  { id: 'fort_nelson', label: 'Fort Nelson', lat: 58.81, lon: -122.70, evidence: 'Strongest episodic plume: median 0.15, P95 0.88 of the PM2.5 range.' },
  { id: 'aswan', label: 'Aswan', lat: 24.09, lon: 32.90, evidence: 'Clean contrast: median 0.27, P95 0.35, low variation.' },
]
