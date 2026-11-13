export type LayerId = 'o3' | 'pm25' | 'nox' | 'co'

export type Interpolation = 'linear' | 'log10'

export type SeriesReason = 'ok' | 'low_saturation' | 'inconsistent_shading' | 'no_data'

export const AIR_QUALITY_TIMING = 'hour index since 2024-07-01 00:00, assumed hourly, unverified'
export const NULL_PRESENTATION = 'no reliable reading'

export interface ColorbarMetadata {
  min: number
  max: number
  units: string
  interp: Interpolation
  axis_verified: boolean
  [key: string]: unknown
}

export interface GridMetadata {
  width: number
  height: number
  bbox: [number, number, number, number]
  [key: string]: unknown
}

export interface FramesMetadata {
  count: number
  indices: number[]
  time: typeof AIR_QUALITY_TIMING
  time_step_verified: boolean
  [key: string]: unknown
}

export interface LayerMetadata {
  layer: LayerId
  name: string
  units: string
  units_status: string
  colorbar: ColorbarMetadata
  axis_verified: boolean
  grid: GridMetadata
  frames: FramesMetadata
  timing: typeof AIR_QUALITY_TIMING
  timing_verified: false
  confidence: 'relative; not independently calibrated concentrations'
  [key: string]: unknown
}

export interface SeriesResult {
  layer: LayerId
  values: Array<number | null>
  reasons: SeriesReason[]
  reasonCodes: SeriesReason[]
  metadata: LayerMetadata
}

export interface DecodedLayer {
  metadata: LayerMetadata
  values: Uint8Array
  flags: Uint8Array
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface LayerAssetReader {
  readJson?: (path: string) => Promise<unknown>
  readBytes?: (path: string) => Promise<Uint8Array>
  fetch?: FetchLike
}

export interface AirQualityLoaderOptions extends LayerAssetReader {
  assetBasePath?: string
  assetReader?: LayerAssetReader
  decompress?: (compressed: Uint8Array) => Promise<Uint8Array>
}

export interface GridCell {
  column: number
  row: number
}

export class AirQualityAssetError extends Error {
  readonly code = 'asset_error'
  readonly layer: LayerId
  readonly path: string

  constructor(layer: LayerId, path: string, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AirQualityAssetError'
    this.layer = layer
    this.path = path
  }
}

export class AirQualityLoadError extends Error {
  readonly code = 'load_error'
  readonly layer: LayerId

  constructor(layer: LayerId, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AirQualityLoadError'
    this.layer = layer
  }
}
