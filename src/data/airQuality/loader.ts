import { cairoPresetsData } from './cairoPresets.ts'
import { pm25PresetsData } from './presets.ts'
import { canonicalLongitude, gridCellForCoordinate } from './coordinates.ts'
import {
  AIR_QUALITY_TIMING,
  AirQualityAssetError,
  AirQualityLoadError,
  NULL_PRESENTATION,
  type AirQualityLoaderOptions,
  type ColorbarMetadata,
  type DecodedLayer,
  type FetchLike,
  type LayerAssetReader,
  type LayerId,
  type LayerMetadata,
  type SeriesReason,
  type SeriesResult,
} from './types.ts'

interface BundledPreset {
  latitude: number
  longitude: number
  metadata: Record<string, unknown>
  values: Array<number | null>
  flags: number[]
  id?: string
  label?: string
}

type UnknownRecord = Record<string, unknown>

const DEFAULT_ASSET_BASE_PATH = '/data/layers'
const CAIRO_TOLERANCE = 1e-9
const SUPPORTED_LAYERS: readonly LayerId[] = ['o3', 'pm25', 'nox', 'co']

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLayerId(value: unknown): value is LayerId {
  return typeof value === 'string' && (SUPPORTED_LAYERS as readonly string[]).includes(value)
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`)
  }
  return value
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`)
  }
  return value
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value
}

function validateAndNormalizeMetadata(raw: unknown, expectedLayer?: LayerId): LayerMetadata {
  if (!isRecord(raw)) {
    throw new Error('metadata must be an object')
  }
  const layerValue = stringValue(raw.layer, 'metadata.layer')
  if (!isLayerId(layerValue)) {
    throw new Error(`metadata.layer is not a supported layer: ${layerValue}`)
  }
  if (expectedLayer !== undefined && layerValue !== expectedLayer) {
    throw new Error(`metadata.layer ${layerValue} does not match requested layer ${expectedLayer}`)
  }
  const name = stringValue(raw.name, 'metadata.name')
  const units = stringValue(raw.units, 'metadata.units')
  const unitsStatus = stringValue(raw.units_status, 'metadata.units_status')
  const colorbarRaw = raw.colorbar
  if (!isRecord(colorbarRaw)) {
    throw new Error('metadata.colorbar must be an object')
  }
  const colorbarMin = finiteNumber(colorbarRaw.min, 'metadata.colorbar.min')
  const colorbarMax = finiteNumber(colorbarRaw.max, 'metadata.colorbar.max')
  if (!(colorbarMax > colorbarMin)) {
    throw new Error('metadata.colorbar.max must be greater than min')
  }
  const colorbarUnits = stringValue(colorbarRaw.units, 'metadata.colorbar.units')
  const interp = colorbarRaw.interp
  if (interp !== 'linear' && interp !== 'log10') {
    throw new Error('metadata.colorbar.interp must be linear or log10')
  }
  if (interp === 'log10' && colorbarMin <= 0) {
    throw new Error('logarithmic colorbar minimum must be positive')
  }
  if (colorbarUnits !== units) {
    throw new Error('metadata units must agree with colorbar units')
  }
  const axisVerified = booleanValue(colorbarRaw.axis_verified, 'metadata.colorbar.axis_verified')
  const gridRaw = raw.grid
  if (!isRecord(gridRaw)) {
    throw new Error('metadata.grid must be an object')
  }
  const width = positiveInteger(gridRaw.width, 'metadata.grid.width')
  const height = positiveInteger(gridRaw.height, 'metadata.grid.height')
  const bboxRaw = arrayValue(gridRaw.bbox, 'metadata.grid.bbox')
  if (bboxRaw.length !== 4 || bboxRaw.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error('metadata.grid.bbox must contain four finite numbers')
  }
  const bbox = bboxRaw as [number, number, number, number]
  if (!(bbox[2] > bbox[0]) || !(bbox[3] > bbox[1])) {
    throw new Error('metadata.grid.bbox must have positive spans')
  }
  gridCellForCoordinate(0, 0, { width, height, bbox })
  if ((gridRaw.row_order !== undefined && gridRaw.row_order !== 'north to south') ||
      (gridRaw.column_order !== undefined && gridRaw.column_order !== 'west to east')) {
    throw new Error('unsupported global grid orientation')
  }
  const framesRaw = raw.frames
  if (!isRecord(framesRaw)) {
    throw new Error('metadata.frames must be an object')
  }
  const count = positiveInteger(framesRaw.count, 'metadata.frames.count')
  const indicesRaw = arrayValue(framesRaw.indices, 'metadata.frames.indices')
  if (indicesRaw.length !== count || indicesRaw.some((value) => typeof value !== 'number' || !Number.isInteger(value))) {
    throw new Error('metadata.frames.indices must contain one integer per frame')
  }
  const indices = indicesRaw as number[]
  if (indices.some((value, index) => value < 0 || (index > 0 && value <= indices[index - 1]))) {
    throw new Error('source frame indices must be nonnegative and strictly increasing')
  }
  if (framesRaw.time !== AIR_QUALITY_TIMING) {
    throw new Error(`metadata.frames.time must equal ${AIR_QUALITY_TIMING}`)
  }
  const timeStepVerified = booleanValue(framesRaw.time_step_verified, 'metadata.frames.time_step_verified')
  if (timeStepVerified) {
    throw new Error('source timing is unverified for these rendered frames')
  }
  const quantizationRaw = raw.quantization
  if (!isRecord(quantizationRaw)) {
    throw new Error('metadata.quantization must be an object')
  }
  if (quantizationRaw.dtype !== 'uint8') {
    throw new Error('metadata.quantization.dtype must be uint8')
  }
  if (quantizationRaw.scheme !== interp) {
    throw new Error('metadata.quantization.scheme must match metadata.colorbar.interp')
  }
  if (quantizationRaw.nodata !== 255) {
    throw new Error('metadata.quantization.nodata must be 255')
  }
  if (quantizationRaw.layout !== 'frame-major, ny x nx') {
    throw new Error('metadata.quantization.layout must be frame-major, ny x nx')
  }
  const quantizationMin = finiteNumber(quantizationRaw.min, 'metadata.quantization.min')
  const quantizationMax = finiteNumber(quantizationRaw.max, 'metadata.quantization.max')
  if (quantizationMin !== colorbarMin || quantizationMax !== colorbarMax) {
    throw new Error('metadata quantization range must match the colorbar range')
  }
  const metadata = {
    ...raw,
    layer: layerValue,
    name,
    units,
    units_status: unitsStatus,
    colorbar: { ...colorbarRaw, min: colorbarMin, max: colorbarMax, units: colorbarUnits, interp, axis_verified: axisVerified } as ColorbarMetadata,
    axis_verified: axisVerified,
    grid: { ...gridRaw, width, height, bbox },
    frames: { ...framesRaw, count, indices: indicesRaw as number[], time: AIR_QUALITY_TIMING as typeof AIR_QUALITY_TIMING, time_step_verified: timeStepVerified },
    timing: AIR_QUALITY_TIMING as typeof AIR_QUALITY_TIMING,
    timing_verified: false as const,
    confidence: 'relative; not independently calibrated concentrations' as const,
  }
  return metadata
}

function asBytes(value: Uint8Array | ArrayBuffer, label: string): Uint8Array {
  if (value instanceof Uint8Array) {
    return value
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }
  throw new Error(`${label} must be a Uint8Array`)
}

function reasonForFlag(flag: number): SeriesReason {
  if (flag === 1) return 'low_saturation'
  if (flag === 4) return 'inconsistent_shading'
  return 'no_data'
}

function normalizedValue(rawValue: number, colorbar: ColorbarMetadata): number | null {
  if (!Number.isFinite(rawValue) || rawValue < colorbar.min || rawValue > colorbar.max) {
    return null
  }
  const normalized = colorbar.interp === 'log10'
    ? (Math.log10(rawValue) - Math.log10(colorbar.min)) / (Math.log10(colorbar.max) - Math.log10(colorbar.min))
    : (rawValue - colorbar.min) / (colorbar.max - colorbar.min)
  return Number.isFinite(normalized) && normalized >= 0 && normalized <= 1 ? normalized : null
}

function cairoPresetForLayer(layer: LayerId): BundledPreset | null {
  const candidate = (cairoPresetsData as unknown as Partial<Record<LayerId, unknown>>)[layer]
  if (!isRecord(candidate)) return null
  if (typeof candidate.latitude !== 'number' || typeof candidate.longitude !== 'number' || !isRecord(candidate.metadata)) return null
  if (!Array.isArray(candidate.values) || !Array.isArray(candidate.flags)) return null
  return candidate as unknown as BundledPreset
}

function cairoMetadata(layer: LayerId, preset: BundledPreset): LayerMetadata {
  return validateAndNormalizeMetadata({
    ...preset.metadata,
    layer,
    timing: AIR_QUALITY_TIMING,
    timing_verified: false,
  }, layer)
}

function cairoResult(layer: LayerId, preset: BundledPreset): SeriesResult {
  const metadata = cairoMetadata(layer, preset)
  const expectedLength = metadata.frames.count
  if (preset.values.length !== expectedLength || preset.flags.length !== expectedLength) {
    throw new AirQualityLoadError(layer, 'Cairo preset values and flags must match metadata.frames.count')
  }
  const values: Array<number | null> = []
  const reasons: SeriesReason[] = []
  for (let index = 0; index < expectedLength; index += 1) {
    const flag = preset.flags[index]
    const rawValue = preset.values[index]
    if (typeof flag !== 'number' || !Number.isInteger(flag) || flag < 0 || flag > 255 || flag !== 0) {
      values.push(null)
      reasons.push(reasonForFlag(typeof flag === 'number' ? flag : 255))
      continue
    }
    if (typeof rawValue !== 'number') {
      values.push(null)
      reasons.push('no_data')
      continue
    }
    const value = normalizedValue(rawValue, metadata.colorbar)
    if (value === null) {
      values.push(null)
      reasons.push('no_data')
    } else {
      values.push(value)
      reasons.push('ok')
    }
  }
  return { layer, values, reasons, reasonCodes: reasons, metadata, source: 'detailed', label: preset.label ?? 'Cairo' }
}

function assetPath(basePath: string, layer: LayerId, fileName: string): string {
  return `${basePath.replace(/\/$/, '')}/${layer}/${fileName}`
}

async function defaultDecompress(compressed: Uint8Array): Promise<Uint8Array> {
  // Some hosts add Content-Encoding: gzip for .gz files, so the browser has
  // already inflated them. Only inflate bytes that still carry the gzip magic.
  if (compressed.length < 2 || compressed[0] !== 0x1f || compressed[1] !== 0x8b) return compressed
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('gzip decompression requires native DecompressionStream')
  }
  const copy = new ArrayBuffer(compressed.byteLength)
  new Uint8Array(copy).set(compressed)
  const body = new Response(new Blob([copy]).stream().pipeThrough(new DecompressionStream('gzip')))
  return new Uint8Array(await body.arrayBuffer())
}

async function fetchResponse(fetchImpl: FetchLike, path: string, layer: LayerId): Promise<Response> {
  try {
    const response = await fetchImpl(path)
    if (response.ok === false) {
      throw new AirQualityAssetError(layer, path, `air-quality asset unavailable (${response.status}) at ${path}`)
    }
    return response
  } catch (error) {
    if (error instanceof AirQualityAssetError) throw error
    throw new AirQualityAssetError(layer, path, `unable to read air-quality asset at ${path}`, error)
  }
}

function defaultFetch(): FetchLike {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('fetch is unavailable; provide an injected asset reader')
  }
  return globalThis.fetch.bind(globalThis)
}

function fetchForReader(reader: LayerAssetReader, layer: LayerId, path: string): FetchLike {
  if (reader.fetch) return reader.fetch
  try {
    return defaultFetch()
  } catch (error) {
    throw new AirQualityAssetError(layer, path, `air-quality asset unavailable at ${path}`, error)
  }
}

async function readJson(reader: LayerAssetReader, path: string, layer: LayerId): Promise<unknown> {
  if (reader.readJson) {
    try {
      return await reader.readJson(path)
    } catch (error) {
      if (error instanceof AirQualityAssetError) throw error
      throw new AirQualityAssetError(layer, path, `unable to read air-quality metadata at ${path}`, error)
    }
  }
  const response = await fetchResponse(fetchForReader(reader, layer, path), path, layer)
  try {
    return await response.json()
  } catch (error) {
    throw new AirQualityLoadError(layer, `invalid JSON metadata at ${path}`, error)
  }
}

async function readBytes(reader: LayerAssetReader, path: string, layer: LayerId): Promise<Uint8Array> {
  if (reader.readBytes) {
    try {
      return asBytes(await reader.readBytes(path), path)
    } catch (error) {
      if (error instanceof AirQualityAssetError) throw error
      throw new AirQualityAssetError(layer, path, `unable to read air-quality binary at ${path}`, error)
    }
  }
  const response = await fetchResponse(fetchForReader(reader, layer, path), path, layer)
  try {
    return new Uint8Array(await response.arrayBuffer())
  } catch (error) {
    throw new AirQualityLoadError(layer, `unable to read binary response at ${path}`, error)
  }
}

export function decodeLayerData(layer: LayerId, metadataRaw: unknown, values: Uint8Array, flags: Uint8Array): DecodedLayer {
  try {
    const metadata = validateAndNormalizeMetadata(metadataRaw, layer)
    const expectedLength = metadata.frames.count * metadata.grid.width * metadata.grid.height
    if (values.length !== expectedLength) {
      throw new Error(`values length ${values.length} does not equal expected ${expectedLength}`)
    }
    if (flags.length !== expectedLength) {
      throw new Error(`flags length ${flags.length} does not equal expected ${expectedLength}`)
    }
    return { metadata, values, flags }
  } catch (error) {
    if (error instanceof AirQualityLoadError) throw error
    throw new AirQualityLoadError(layer, error instanceof Error ? error.message : 'malformed layer data', error)
  }
}

export const validateLayerData = decodeLayerData

export interface AirQualityLoader {
  getSeries: (latitude: number, longitude: number, layer: LayerId) => Promise<SeriesResult>
  loadLayer: (layer: LayerId) => Promise<DecodedLayer>
  clearCache: (layer?: LayerId) => void
}

export function createAirQualityLoader(options: AirQualityLoaderOptions = {}): AirQualityLoader {
  const basePath = options.assetBasePath ?? DEFAULT_ASSET_BASE_PATH
  const cache = new Map<LayerId, Promise<DecodedLayer>>()
  const reader: LayerAssetReader = options.assetReader ?? options
  const decompress = options.decompress ?? defaultDecompress

  const loadLayer = (layer: LayerId): Promise<DecodedLayer> => {
    if (!isLayerId(layer)) {
      return Promise.reject(new AirQualityAssetError(String(layer) as LayerId, `${basePath}/${String(layer)}`, `unsupported air-quality layer: ${String(layer)}`))
    }
    const cached = cache.get(layer)
    if (cached) return cached
    const pending = (async () => {
      const metadataPath = assetPath(basePath, layer, 'layer.json')
      const valuesPath = assetPath(basePath, layer, 'values.uint8.bin.gz')
      const flagsPath = assetPath(basePath, layer, 'flags.uint8.bin.gz')
      const metadata = await readJson(reader, metadataPath, layer)
      const [compressedValues, compressedFlags] = await Promise.all([
        readBytes(reader, valuesPath, layer),
        readBytes(reader, flagsPath, layer),
      ])
      let values: Uint8Array
      let flags: Uint8Array
      try {
        values = asBytes(await decompress(compressedValues), valuesPath)
        flags = asBytes(await decompress(compressedFlags), flagsPath)
      } catch (error) {
        throw new AirQualityLoadError(layer, `unable to decompress ${layer} binary assets`, error)
      }
      return decodeLayerData(layer, metadata, values, flags)
    })()
    cache.set(layer, pending)
    pending.catch(() => {
      if (cache.get(layer) === pending) cache.delete(layer)
    })
    return pending
  }

  const getSeries = async (latitude: number, longitude: number, layer: LayerId): Promise<SeriesResult> => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90) {
      throw new RangeError('latitude must be finite in [-90, 90] and longitude must be finite')
    }
    const wrappedLongitude = canonicalLongitude(longitude)
    const cairoPreset = cairoPresetForLayer(layer)
    if (cairoPreset && Math.abs(latitude - cairoPreset.latitude) <= CAIRO_TOLERANCE && Math.abs(wrappedLongitude - cairoPreset.longitude) <= CAIRO_TOLERANCE) {
      return cairoResult(layer, cairoPreset)
    }
    if (layer === 'pm25') {
      const point = (pm25PresetsData as unknown as BundledPreset[]).find((item) =>
        Math.abs(latitude - item.latitude) <= CAIRO_TOLERANCE && Math.abs(wrappedLongitude - item.longitude) <= CAIRO_TOLERANCE)
      if (point) return cairoResult(layer, point)
    }
    const decoded = await loadLayer(layer)
    const cell = gridCellForCoordinate(latitude, longitude, decoded.metadata.grid)
    const cellOffset = cell.row * decoded.metadata.grid.width + cell.column
    const values: Array<number | null> = []
    const reasons: SeriesReason[] = []
    const frameSize = decoded.metadata.grid.width * decoded.metadata.grid.height
    for (let frame = 0; frame < decoded.metadata.frames.count; frame += 1) {
      const byte = decoded.values[frame * frameSize + cellOffset]
      const flag = decoded.flags[frame * frameSize + cellOffset]
      if (flag !== 0) {
        values.push(null)
        reasons.push(reasonForFlag(flag))
      } else if (byte === 255) {
        values.push(null)
        reasons.push('no_data')
      } else {
        values.push(byte / 254)
        reasons.push('ok')
      }
    }
    return { layer, values, reasons, reasonCodes: reasons, metadata: decoded.metadata, source: 'regional', label: 'Regional 2° cell' }
  }

  const clearCache = (layer?: LayerId): void => {
    if (layer === undefined) cache.clear()
    else cache.delete(layer)
  }

  return { getSeries, loadLayer, clearCache }
}

const defaultLoader = createAirQualityLoader()

export const getSeries = (latitude: number, longitude: number, layer: LayerId): Promise<SeriesResult> => defaultLoader.getSeries(latitude, longitude, layer)
export const loadLayer = (layer: LayerId): Promise<DecodedLayer> => defaultLoader.loadLayer(layer)
export const clearAirQualityCache = (layer?: LayerId): void => defaultLoader.clearCache(layer)

export function presentAirQualityValue(value: number | null): { text: string; isNull: boolean; shouldRest: boolean } {
  return value === null
    ? { text: NULL_PRESENTATION, isNull: true, shouldRest: true }
    : { text: String(value), isNull: false, shouldRest: false }
}

export const nullPresentation = presentAirQualityValue
