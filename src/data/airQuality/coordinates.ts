import type { GridCell, GridMetadata } from './types.ts'

const LONGITUDE_MIN = -180

export function canonicalLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) {
    throw new RangeError('longitude must be finite')
  }
  const wrapped = ((longitude - LONGITUDE_MIN) % 360 + 360) % 360 + LONGITUDE_MIN
  return Object.is(wrapped, -0) ? 0 : wrapped
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90
}

export function gridCellForCoordinate(latitude: number, longitude: number, grid: GridMetadata): GridCell {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new RangeError('latitude must be finite in [-90, 90] and longitude must be finite')
  }
  if (!Number.isInteger(grid.width) || grid.width <= 0 || !Number.isInteger(grid.height) || grid.height <= 0) {
    throw new RangeError('grid dimensions must be positive integers')
  }
  if (grid.bbox.length !== 4 || grid.bbox.some((value, index) => value !== [-180, -90, 180, 90][index])) {
    throw new RangeError('air-quality lookup requires a full-globe equirectangular bbox')
  }
  const [west, south, east, north] = grid.bbox
  const wrappedLongitude = canonicalLongitude(longitude)
  const longitudeSpan = east - west
  const latitudeSpan = north - south
  if (!(longitudeSpan > 0) || !(latitudeSpan > 0)) {
    throw new RangeError('grid bbox must have positive longitude and latitude spans')
  }
  const column = Math.min(grid.width - 1, Math.max(0, Math.floor(((wrappedLongitude - west) / longitudeSpan) * grid.width)))
  const row = Math.min(grid.height - 1, Math.max(0, Math.floor(((north - latitude) / latitudeSpan) * grid.height)))
  return { column, row }
}

export const coordinateToGridCell = gridCellForCoordinate
