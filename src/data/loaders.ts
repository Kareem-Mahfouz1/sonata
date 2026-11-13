import type { LayerData } from './types'

export {
  clearAirQualityCache,
  createAirQualityLoader,
  decodeLayerData,
  getSeries,
  loadLayer,
  nullPresentation,
  presentAirQualityValue,
  validateLayerData,
} from './airQuality/loader.ts'
export { AIR_QUALITY_TIMING, NULL_PRESENTATION, AirQualityAssetError, AirQualityLoadError } from './airQuality/types.ts'
export { canonicalLongitude, coordinateToGridCell, gridCellForCoordinate, isValidCoordinate } from './airQuality/coordinates.ts'
export type {
  AirQualityLoaderOptions,
  ColorbarMetadata,
  DecodedLayer,
  FetchLike,
  GridCell,
  GridMetadata,
  LayerAssetReader,
  LayerId,
  LayerMetadata,
  SeriesReason,
  SeriesResult,
} from './airQuality/types.ts'
export type { AirQualityLoader } from './airQuality/loader.ts'

export async function loadLayerData(path: string): Promise<LayerData> {
  // Placeholder for loading bundled static JSON from /public/data.
  const response = await fetch(path)
  return (await response.json()) as LayerData
}
