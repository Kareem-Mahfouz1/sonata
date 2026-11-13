export type LayerKind = 'observed' | 'modeled'

export interface LayerMeta {
  id: string
  name: string
  units: string
  kind: LayerKind
  source: string
  timeRange: string
  spatialResolution: string
  creditLine: string
}

export interface LayerData {
  meta: LayerMeta
  grid: {
    width: number
    height: number
    bbox: [number, number, number, number]
  }
  frameCount: number
  values: number[][]
}
