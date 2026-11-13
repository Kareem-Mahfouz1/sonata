# Air-quality frame preprocessing (NASA SVS 5518)

Turns the GEOS-CF render PNGs into compact, quantised value grids plus preset
time series. Offline only; nothing here ships to the browser except the JSON
sidecars and the gzipped uint8 arrays.

```
tools/data/
  layers.py       per-layer config: filename templates, colourbar anchors, thresholds
  colorbar.py     colourbar image -> LUT, position -> value, luminance profile
  invert.py       block-median downsample, chromaticity inversion, shading model, flags
  preprocess.py   CLI: fetch/process/cache, write grids + sidecars + series
  validate.py     re-render vs source diff, per-decile/latitude/land breakdown, plots
```

## Install

```bash
python3 -m venv .venv && .venv/bin/pip install -r tools/data/requirements.txt
```

## Run

```bash
# checkpoint: the two downloaded samples per layer
.venv/bin/python tools/data/preprocess.py --layers co,nox,o3,pm25 --frames 0,900 \
    --out data/processed/sample
.venv/bin/python tools/data/validate.py --layers co,nox,o3,pm25 --out data/processed/sample

# full run: every 6th frame, streamed (download -> process -> delete), resumable
.venv/bin/python tools/data/preprocess.py --layers o3,pm25 --every 6 --stream \
    --workers 4 --out public/data/layers
```

Frames are cached as block medians (`--out/.cache/<layer>/blocks`), results as
`--out/.cache/<layer>/results`. Deleting the cache forces a reprocess; a frame
whose result exists is never fetched twice, which is what makes the run
resumable.

## Method

1. **Block-median downsample** 2048x1024 -> 180x90 (configurable `--grid WxH`)
   before any colour work, so baked-in coastlines and borders are rejected as
   outliers rather than becoming values.
2. **Chromaticity match**: each block colour is divided by its channel sum and
   matched to the colourbar's chromaticity. Raw RGB is never matched because
   the frames are `colormap(value) * greyscale base`.
3. **Shading**: `b = median(p / c(v))` per cell, aggregated across frames with
   a p90 (a wrong value can only lower `b`, never raise it). Staticness is
   tested on cells whose value is low/absent in both frames, where `b` is
   measurable without the inversion. When static, `b` is divided out and
   luminance is added as a 0.35-weighted tie-breaker at the near-white low end
   of the ramp. When not static, the pipeline falls back to chromaticity only.
4. **Confidence flags** are stored next to the values; flagged cells are
   rendered as no-data (255) and never filled in:
   `0 ok`, `1 low saturation`, `2 very dark`, `3 no colourbar match`,
   `4 channels disagree with one greyscale multiplier`, `5 low pixel coverage`.
5. **Quantisation**: uint8 0..254 across the colourbar range (log-spaced for
   NOx and PM2.5), 255 = no data.

## Output

```
<out>/<layer>/
  values.uint8.bin.gz   frame-major, ny x nx per frame
  flags.uint8.bin.gz    same shape, flag codes
  layer.json            colourbar, grid, frames, quantisation, flags, shading report
  series.json           preset time series (Cairo)
```

## Units and confidence

Values are positions on the published colourbar interpolated through the
measured tick anchors, **not** independently calibrated concentrations. Treat
them as relative. Time is labelled "hour index since 2024-07-01 00:00, assumed
hourly, unverified" because `dates.txt` publishes dates only.

## Known limitations

- CO's colourbar tick spacing fits neither a linear nor a log scale; its
  anchors are measured ticks with piecewise-linear interpolation (unverified).
- NOx and O3 shading is only partly static between the two samples, so those
  layers keep the chromaticity-only path and their near-grey areas stay
  low-confidence.
- The 1-degree block median smooths plumes smaller than ~2 degrees.
