# NASA SVS 5518 preprocessing

This offline pipeline converts rendered NASA air-quality PNG frames into compact global grids and preset time series. It does not modify the app, probe, audio engine, placeholder datasets, or Tone dependency. The recovered numbers are **relative positions on the published colorbar**, not independently calibrated atmospheric concentrations.

## Install and run

```bash
python3 -m venv .venv
.venv/bin/pip install -r tools/data/requirements.txt

# Approved 301-frame O3 and PM2.5 pass; missing source frames are streamed.
.venv/bin/python -u tools/data/preprocess.py --layers o3,pm25 --every 6 \
  --stream --workers 4 --out data/processed/full

# Export-only regeneration: uses cached fine patches and unchanged global grids.
.venv/bin/python tools/data/series.py --out data/processed/full --layers o3,pm25

# Report only: never fills gaps or repairs spikes.
.venv/bin/python tools/data/sanity.py --out data/processed/full

# Deterministic regression tests (synthetic unit fixtures only).
.venv/bin/python -m unittest discover -s tools/data -p 'test_*.py' -v
```

NOx and CO full passes require further approval. CO retains `axis_verified: false` and an unverified piecewise axis. Its full pass comes after NOx.

## Processing and confidence

Global frames are block-median downsampled from 2048×1024 to **180×90** before inversion. Each global cell therefore spans **2° longitude × 2° latitude**, not 1°. A median suppresses thin coastlines only while contaminated pixels remain a minority; it is not a guaranteed coastline mask.

Colors are divided by their RGB sum and compared to the layer colorbar using Euclidean chromaticity distance. When the existing estimator accepts a static greyscale base, that base is divided out and luminance contributes a 0.35-weighted score. Otherwise the matcher stays chromaticity-only. The base estimator's p90 rule is an empirical heuristic: incorrect matches can bias the implied base in either direction. A near-white staticness test with too few comparable cells does **not** prove that shading is nonstatic. These are limitations to report, not grounds to adjust the scientific output silently.

Flag codes are 0 (usable), 1 (low saturation), 2 (very dark), 3 (no colorbar match), 4 (inconsistent greyscale multiplier), and 5 (low usable-pixel coverage). The global grid stores bytes 0–254 for usable values and **255 for every flagged cell**. Sidecar flags are authoritative. NOx and PM2.5 use log-spaced quantization; O3 and CO use linear quantization. Consumers must decode byte 255 as null, never as a concentration.

## Cairo extraction

The primary Cairo series is obtained from the per-channel median of the **5×5 full-resolution pixels** surrounding 30.04°N, 31.24°E, followed by the same inverter and thresholds as the global grid. The window is about **0.879° × 0.879°**. Cached RGB patch medians make later export-only corrections resumable without downloading the frames again.

`value` and `flag` are the fine reading. `grid_value` and `grid_flag` refer to the **containing 2° global cell**, decoded from the shipped grid. Each reading becomes JSON null when its own flag is nonzero, with no interpolation, neighbour substitution, or smoothing. `fine_minus_grid` and `fine_minus_grid_pct` are null unless both readings are usable.

The earlier checkpoint used a 3×3-cell average. That covered **6° × 6°**, not 2°, and is no longer the global-cell comparator. The full-resolution patch and containing-cell comparison is the current format.

## Output format and timing

Each layer directory contains `values.uint8.bin.gz`, `flags.uint8.bin.gz`, `layer.json`, and `series.json`. Binary order is frame-major, then rows north to south and columns west to east. There are 301 sampled frames, source indices 0000, 0006, …, 1800. Each array has shape `[301, 90, 180]` and decompresses to 4,876,200 bytes.

Metadata records the colorbar min/max/units, `axis_verified`, source indices, no-data convention, and relative-confidence statement. Axis verification refers only to the colorbar interpolation scale, not calibrated atmospheric units.

Timing is **“hour index since 2024-07-01 00:00, assumed hourly, unverified.”** The source publishes dates without clock times; no verified time zone is assigned. For sampled ordinal `j`, the four diagnostic clock bins are `6 × (j mod 4)` = 00/06/12/18, equivalent to `source_index mod 24` for this run. Clock labels are assumptions, not measured Cairo local times.

## Sanity checks and resumability

`sanity.py` reports diurnal means with valid and null counts, same-day noon-versus-midnight comparisons, flagged fractions for every frame, statistics for both Cairo methods, two-sided isolated >3× peaks/troughs, and every adjacent >3× transition. Null neighbours are not bridged. CSVs expose every frame's data and flags; JSON contains complete jump and flag lists. Observed anomalies are not corrected.

Downloads use direct per-layer filename templates, four workers maximum, retries with exponential backoff, and atomic `.part` renames. Each PNG is deleted after its block and patch medians are cached. Cached medians avoid repeat downloads on resumption, though the current batch still recalculates inversion passes. Do not reuse an output directory with a different grid, preset list, or source/colorbar configuration: cache paths are not configuration-keyed. Use a fresh output directory for those changes.

Pipeline source under `tools/data/` remains tracked in Git. Only raw frames, previews/reports, processed data, and Python cache artifacts are ignored. App code remains untouched.
