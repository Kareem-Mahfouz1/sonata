import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AIR_QUALITY_TIMING,
  AirQualityAssetError,
  AirQualityLoadError,
  createAirQualityLoader,
  getSeries,
  gridCellForCoordinate,
  presentAirQualityValue,
} from '../src/data/loaders.ts'
import type { LayerId } from '../src/data/loaders.ts'

const metadata = {
  layer: 'o3',
  name: 'Fixture O3',
  units: 'ppbv',
  units_status: 'relative',
  colorbar: { min: 5, max: 60, units: 'ppbv', interp: 'linear', axis_verified: true },
  grid: { width: 2, height: 2, bbox: [-180, -90, 180, 90], row_order: 'north to south', column_order: 'west to east' },
  frames: { count: 2, indices: [0, 1], time: AIR_QUALITY_TIMING, time_step_verified: false },
  quantization: { dtype: 'uint8', scheme: 'linear', min: 5, max: 60, nodata: 255, layout: 'frame-major, ny x nx' },
}

function fixtureLoader(overrides: Record<string, unknown> = {}) {
  const reads: string[] = []
  const layerMetadata = { ...metadata, ...overrides }
  const bytes: Record<string, Uint8Array> = {
    '/data/layers/o3/values.uint8.bin.gz': new Uint8Array([0, 127, 255, 254, 254, 1, 2, 3]),
    '/data/layers/o3/flags.uint8.bin.gz': new Uint8Array([0, 1, 0, 4, 0, 0, 2, 7]),
  }
  return {
    reads,
    loader: createAirQualityLoader({
      readJson: async (path) => {
        reads.push(path)
        return layerMetadata
      },
      readBytes: async (path) => {
        reads.push(path)
        return bytes[path]
      },
      decompress: async (value) => value,
    }),
  }
}

test('coordinate mapping handles poles, Cairo cell, longitude seam, and rejects invalid coordinates', () => {
  const grid = { width: 180, height: 90, bbox: [-180, -90, 180, 90] as [number, number, number, number] }
  assert.deepEqual(gridCellForCoordinate(90, 180, grid), { column: 0, row: 0 })
  assert.deepEqual(gridCellForCoordinate(-90, -180, grid), { column: 0, row: 89 })
  assert.deepEqual(gridCellForCoordinate(30.04, 31.24, grid), { column: 105, row: 29 })
  assert.deepEqual(gridCellForCoordinate(0, 180, grid), { column: 0, row: 45 })
  assert.deepEqual(gridCellForCoordinate(0, 179.999999, grid), { column: 179, row: 45 })
  assert.throws(() => gridCellForCoordinate(Number.NaN, 0, grid), RangeError)
  assert.throws(() => gridCellForCoordinate(91, 0, grid), RangeError)
})

test('global data is frame-major and flags are authoritative without filling neighbors', async () => {
  const { loader } = fixtureLoader()
  const result = await loader.getSeries(45, 0, 'o3')
  assert.deepEqual(result.values, [null, 1 / 254])
  assert.deepEqual(result.reasons, ['low_saturation', 'ok'])
  const seam = await loader.getSeries(45, 179.999999, 'o3')
  assert.deepEqual(seam.values, [null, 1 / 254])
  const q255 = await loader.getSeries(0, -180, 'o3')
  assert.deepEqual(q255.values, [null, null])
  assert.deepEqual(q255.reasons, ['no_data', 'no_data'])
})

test('Cairo exact presets normalize linear and log axes offline', async () => {
  const throwingFetch = async () => { throw new Error('network must not be used') }
  const loader = createAirQualityLoader({ fetch: throwingFetch })
  const o3 = await loader.getSeries(30.04, 31.24, 'o3')
  const pm25 = await loader.getSeries(30.04, 31.24, 'pm25')
  assert.equal(o3.values.length, 301)
  assert.equal(pm25.values.length, 301)
  assert.equal(o3.values.filter((value) => value === null).length, 44)
  assert.equal(pm25.values.filter((value) => value === null).length, 8)
  assert.equal(o3.metadata.axis_verified, true)
  assert.equal(pm25.metadata.colorbar.interp, 'log10')
  assert.equal(o3.metadata.timing, AIR_QUALITY_TIMING)
  assert.equal(o3.metadata.timing_verified, false)
  assert.equal(o3.values[0], (25.871795654296875 - 5) / 55)
  assert.equal(pm25.values[0], (Math.log10(17.973041534423828) - Math.log10(0.4)) / (Math.log10(409.6) - Math.log10(0.4)))
})

test('Cairo lookup is exact only and nearby points require global assets', async () => {
  let fetchCalls = 0
  const loader = createAirQualityLoader({
    fetch: async () => {
      fetchCalls += 1
      throw new Error('offline')
    },
  })
  await assert.rejects(loader.getSeries(30.040000002, 31.24, 'o3'), AirQualityAssetError)
  assert.equal(fetchCalls, 1)
})

test('CO and NOx IDs are accepted but unavailable assets are explicit errors', async () => {
  const loader = createAirQualityLoader({ fetch: async () => new Response('', { status: 404 }) })
  for (const layer of ['co', 'nox'] as LayerId[]) {
    await assert.rejects(loader.getSeries(0, 0, layer), AirQualityAssetError)
  }
})

test('lazy loads are shared in flight and failed loads are evicted for retry', async () => {
  let calls = 0
  let fail = true
  const loader = createAirQualityLoader({
    readJson: async (_path) => {
      calls += 1
      if (fail) throw new Error('temporary failure')
      return metadata
    },
    readBytes: async (path) => {
      if (path.endsWith('values.uint8.bin.gz')) return new Uint8Array([0, 127, 255, 254, 254, 1, 2, 3])
      return new Uint8Array([0, 1, 0, 4, 0, 0, 2, 7])
    },
    decompress: async (value) => value,
  })
  await assert.rejects(loader.loadLayer('o3'), AirQualityAssetError)
  fail = false
  await loader.loadLayer('o3')
  assert.equal(calls, 2)
})

test('malformed metadata and binary lengths fail explicitly', async () => {
  const malformed = fixtureLoader({ colorbar: { ...metadata.colorbar, max: 5 } })
  await assert.rejects(malformed.loader.loadLayer('o3'), AirQualityLoadError)
  const wrongLength = fixtureLoader()
  wrongLength.loader = createAirQualityLoader({
    readJson: async () => metadata,
    readBytes: async () => new Uint8Array([1]),
    decompress: async (value) => value,
  })
  await assert.rejects(wrongLength.loader.loadLayer('o3'), AirQualityLoadError)
})

test('null presentation stays separate from numeric normalization and signals rest', () => {
  assert.deepEqual(presentAirQualityValue(null), { text: 'no reliable reading', isNull: true, shouldRest: true })
  assert.deepEqual(presentAirQualityValue(0.25), { text: '0.25', isNull: false, shouldRest: false })
})

test('default exported getSeries serves exact Cairo without a fetch', async () => {
  const result = await getSeries(30.04, 31.24, 'o3')
  assert.equal(result.values.length, 301)
})

// Explicit synthetic fixtures below test format behavior, not NASA measurements.
test('all scientific flags and nodata bytes return null with the correct reason', async () => {
  const tinyMetadata = { ...metadata, grid: { width: 1, height: 1, bbox: [-180, -90, 180, 90] }, frames: { ...metadata.frames, count: 8, indices: [0, 6, 12, 18, 24, 30, 36, 42] } }
  const loader = createAirQualityLoader({
    readJson: async () => tinyMetadata,
    readBytes: async (path) => path.endsWith('values.uint8.bin.gz')
      ? new Uint8Array([127, 127, 127, 127, 127, 127, 127, 255])
      : new Uint8Array([0, 1, 2, 3, 4, 5, 7, 0]),
    decompress: async (bytes) => bytes,
  })
  const result = await loader.getSeries(0, 0, 'o3')
  assert.deepEqual(result.values, [0.5, null, null, null, null, null, null, null])
  assert.deepEqual(result.reasonCodes, ['ok', 'low_saturation', 'no_data', 'no_data', 'inconsistent_shading', 'no_data', 'no_data', 'no_data'])
})

test('concurrent requests share one complete layer load and later requests reuse it', async () => {
  const { loader, reads } = fixtureLoader()
  const [first, second] = await Promise.all([loader.loadLayer('o3'), loader.loadLayer('o3')])
  assert.equal(first, second)
  assert.equal(reads.length, 3)
  await loader.getSeries(0, 0, 'o3')
  assert.equal(reads.length, 3)
})

test('native gzip decoding and CO relative unverified-axis metadata are preserved', async () => {
  const { gzipSync } = await import('node:zlib')
  const coMetadata = { ...metadata, layer: 'co', name: 'Synthetic CO format fixture', colorbar: { ...metadata.colorbar, axis_verified: false } }
  const loader = createAirQualityLoader({
    readJson: async () => coMetadata,
    readBytes: async (path) => new Uint8Array(gzipSync(path.endsWith('values.uint8.bin.gz')
      ? new Uint8Array([0, 127, 255, 254, 254, 1, 2, 3])
      : new Uint8Array([0, 1, 0, 4, 0, 0, 2, 7]))),
  })
  const result = await loader.getSeries(45, -90, 'co')
  assert.deepEqual(result.values, [0, 1])
  assert.equal(result.metadata.axis_verified, false)
  assert.equal(result.metadata.confidence, 'relative; not independently calibrated concentrations')
  assert.equal(result.metadata.frames.time_step_verified, false)
})

test('all available exact Cairo presets work without global fetch, including wrapped longitude', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('fetch must not be called for a bundled preset') }
  try {
    for (const layer of ['o3', 'pm25', 'nox'] as LayerId[]) {
      const series = await getSeries(30.04, 31.24 + 360, layer)
      assert.equal(series.values.length, 301)
      assert.ok(series.values.every((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= 1)))
      assert.deepEqual(series.metadata.frames.indices, Array.from({ length: 301 }, (_, index) => index * 6))
      if (layer === 'nox') assert.equal(series.values.filter((value) => value === null).length, 103)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('unsupported extents, frame ordering, verified clocks and invalid log scales fail explicitly', async () => {
  const cases = [
    { grid: { ...metadata.grid, bbox: [-90, -90, 90, 90] } },
    { grid: { ...metadata.grid, row_order: 'south to north' } },
    { frames: { ...metadata.frames, indices: [6, 0] } },
    { frames: { ...metadata.frames, time_step_verified: true } },
    { colorbar: { ...metadata.colorbar, min: 0, interp: 'log10' } },
  ]
  for (const overrides of cases) {
    const { loader } = fixtureLoader(overrides)
    await assert.rejects(loader.loadLayer('o3'), AirQualityLoadError)
  }
  const grid = { width: 180, height: 90, bbox: [-180, -90, 180, 90] as [number, number, number, number] }
  assert.deepEqual(gridCellForCoordinate(0, 540, grid), { column: 0, row: 45 })
  assert.deepEqual(gridCellForCoordinate(30.04, 31.24, { ...grid, width: 2048, height: 1024 }), { column: 1201, row: 341 })
  assert.throws(() => gridCellForCoordinate(-90.001, 0, grid), RangeError)
  assert.throws(() => gridCellForCoordinate(0, Infinity, grid), RangeError)
})
