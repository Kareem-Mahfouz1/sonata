# Step 4 — Typed air-quality data module

## Scope

The data foundation is implemented without changing the frontend shell, photo probe, audio engine, Tone dependency, placeholder layer selections, or transport durations. UI/audio integration remains a later step. No PM2.5 bin is excluded, and no data are interpolated, smoothed, or filled.

```ts
import { getSeries, loadLayer, presentAirQualityValue } from '../src/data/loaders.ts'

const cairo = await getSeries(30.04, 31.24, 'o3')
const value = cairo.values[0] // normalized number in [0, 1], or null
const reason = cairo.reasonCodes[0]
const presentation = presentAirQualityValue(value)
// null -> { text: 'no reliable reading', isNull: true, shouldRest: true }

// Global data is lazy-loaded independently of the bundled preset.
const grid = await loadLayer('pm25')
```

`SeriesResult` contains `values`, `reasonCodes` (also available as `reasons`), and metadata. Usable readings have reason `ok`. A nonzero confidence flag always produces null: flag 1 maps to `low_saturation`, flag 4 to `inconsistent_shading`, and other missing/dark/unmatched/unknown flags map to `no_data`. A nodata byte 255 is null even when its flag is malformed as zero. Asset or format failures reject with a typed load/asset error rather than inventing an all-null scientific series.

## Offline presets and lazy grids

The exact Cairo location uses a bundled **fine 5×5 full-resolution median** series, with no fetch call. All three completed layers have 301 offline readings: O3 has 44 nulls, PM2.5 eight, and NOx 103. Equivalent wrapped longitudes resolve to the same preset; nearby locations do not borrow its fine readings. Normalization is linear for O3 and logarithmic for PM2.5/NOx, using the colorbar ranges. Original fine values are retained in generated source without display rounding.

Other locations read the containing cell of a lazy **180×90** global grid. Byte 0–254 normalizes to `byte / 254`, consistent with each layer's linear/log quantization. No neighbors are averaged or substituted. Each layer's metadata and two gzip assets load once, including concurrent calls; failed loads are evicted for retry. Native `DecompressionStream('gzip')` is required for global binary loading. `createAirQualityLoader` supports injected asset readers and decompression for tests or alternative hosting.

Metadata includes units as colorbar labels, minimum/maximum, `colorbar.interp`, `axis_verified`, actual source indices, and the exact timing label:

> hour index since 2024-07-01 00:00, assumed hourly, unverified

Confidence is relative, not independently calibrated concentration. `axis_verified` verifies interpretation of the colorbar axis only. Timing is not Cairo local time or verified UTC. CO has no full assets or bundled preset; its unavailable assets fail explicitly. The CO unverified-axis behavior is covered using a clearly synthetic format fixture.

## Coordinate and format safeguards

Lookup accepts a full-globe equirectangular bbox `[-180, -90, 180, 90]`. Longitude wraps to `[-180, 180)`; both antimeridian spellings select the western seam. Latitude must be finite and within `[-90, 90]`; the poles select the first/last row. Cairo maps to global column 105, row 29, and full-resolution column 1201, row 341.

The loader rejects unsupported extents/orientations, invalid logarithmic ranges, mismatched units/ranges, non-increasing source indices, verified-clock claims for this dataset, and wrong binary lengths. The photo-based probe is not migrated here and must not be treated as a physically valid sampling surface when this module is connected to the UI.

## Files and regeneration

Core source is under `src/data/airQuality/`; the original `loadLayerData` API and old types remain available. `test/loaders.test.ts` is included by `npm test`.

```bash
# Uses previously processed data, not a new download.
python tools/data/bundle_app.py --layers o3,pm25,nox

npm test
npm run build
npm run lint
```

The compact generated Cairo source is tracked (about 32 KB). Global assets under `public/data/layers/` are ignored and supplied in the checkpoint bundle; copy `app-assets/layers/` to that directory when using the patch on another checkout. Raw source PNGs and full processed/cache directories remain ignored. A new checkout's Cairo preset still works without these global files; arbitrary-location lookups require them.

The existing npm lockfile has an i18next optional TypeScript-5 peer conflict with pinned TypeScript 7. Validation installed it with `npm ci --legacy-peer-deps`; dependency versions, package-lock.json, and Tone remain unchanged. Generated float32 round-trip decimal spellings have a narrowly scoped precision-lint exemption; all 301 values/flags per layer were compared exactly with the processed JSON exports.

## Verification

All **21 Node tests**, **six Python regression tests**, production type/build checks, and lint pass. Tests cover poles/antimeridian/Cairo pixels, invalid coordinates and metadata, frame-major indexing, native gzip, every null reason, no neighbor filling, exact offline Cairo in all three layers, nearby-coordinate fallback, in-flight sharing and retry, and relative CO metadata. Lint reports zero warnings and zero errors.

A null's `shouldRest` signal and “no reliable reading” text are ready for UI/audio consumers; no new voice mapping or playback behavior has been implemented. Step 5 requires separate approval.
