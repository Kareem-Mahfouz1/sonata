"""NASA SVS 5518 frames -> quantised value grids + preset time series.

Usage
  # checkpoint run on the downloaded samples
  python tools/data/preprocess.py --layers co,nox,o3,pm25 --frames 0,900 \
      --out data/processed/sample

  # agreed full run (O3 + PM2.5 first, every 6th frame, stream + delete)
  python tools/data/preprocess.py --layers o3,pm25 --every 6 --stream \
      --workers 4 --out public/data/layers

Frames are downloaded only when missing, processed one at a time and deleted
again in --stream mode.  Everything is resumable: a frame whose result is
already cached is never fetched twice.
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import shutil
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from colorbar import Inverter, load_bar, luminance_profile, positions_to_values  # noqa: E402
from invert import (FLAG_LEGEND, OK, block_median, dequantise, estimate_base,  # noqa: E402
                    invert_frame, quantise)
from layers import (DEFAULTS, FRAME_COUNT, FRAMES_URL, LAYERS, PRESETS,  # noqa: E402
                    START_DATE, TIME_STEP_HOURS, TIME_STEP_VERIFIED)

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
MAX_WORKERS = 4


def frame_name(layer: dict, index: int) -> str:
    return layer["template"].format(index=index)


def frame_url(layer: dict, index: int) -> str:
    return f"{FRAMES_URL}/{layer['folder']}/{frame_name(layer, index)}"


def fetch(url: str, dest: Path, retries: int = 5) -> Path:
    """Download with exponential backoff; atomic rename; skip if present."""
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    delay = 2.0
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=60) as response, open(tmp, "wb") as fh:
                shutil.copyfileobj(response, fh)
            tmp.replace(dest)
            return dest
        except Exception as exc:  # noqa: BLE001
            if attempt == retries - 1:
                raise
            print(f"    retry {attempt + 1}/{retries} for {url.split('/')[-1]}: {exc}")
            time.sleep(delay)
            delay *= 2
    return dest


def local_or_fetch(layer_key: str, layer: dict, index: int, stream: bool) -> Path | None:
    path = RAW / "frames" / layer_key / frame_name(layer, index)
    if path.exists():
        return path
    if not stream:
        return None
    return fetch(frame_url(layer, index), path)


def process_frame(path: Path, inv: Inverter, nx: int, ny: int) -> dict:
    img = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    block, cov = block_median(img, nx, ny)
    return {"block": block, "cov": cov}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--layers", default="co,nox,o3,pm25")
    ap.add_argument("--frames", default=None, help="comma separated indices")
    ap.add_argument("--every", type=int, default=None, help="every Nth frame")
    ap.add_argument("--grid", default="180x90")
    ap.add_argument("--out", default="data/processed")
    ap.add_argument("--workers", type=int, default=MAX_WORKERS)
    ap.add_argument("--stream", action="store_true", help="download missing frames and delete after use")
    ap.add_argument("--fresh", action="store_true", help="ignore the result cache")
    args = ap.parse_args()

    nx, ny = (int(v) for v in args.grid.lower().split("x"))
    if args.frames:
        indices = sorted(int(v) for v in args.frames.split(","))
    elif args.every:
        indices = list(range(0, FRAME_COUNT, args.every))
    else:
        indices = list(range(0, FRAME_COUNT, 6))

    out_root = ROOT / args.out
    out_root.mkdir(parents=True, exist_ok=True)
    cfg = dict(DEFAULTS)
    summary = {}

    for key in args.layers.split(","):
        layer = LAYERS[key]
        bar = load_bar(str(RAW / "colorbars" / layer["colorbar"]))
        inv = Inverter(layer, bar)
        prof = luminance_profile(bar["colors"])
        print(f"\n== {layer['name']} ({key})  frames={len(indices)}  "
              f"luminance {prof['direction']} monotonic={prof['monotonic']} "
              f"rho={prof['rank_correlation']:.3f}")

        cache = out_root / ".cache" / key
        (cache / "blocks").mkdir(parents=True, exist_ok=True)
        (cache / "results").mkdir(parents=True, exist_ok=True)

        # --- stage 1: block medians (the expensive, parallel part) ----------
        todo = [i for i in indices if args.fresh or not (cache / "blocks" / f"{i:04d}.npz").exists()]
        if todo:
            print(f"   fetching/processing {len(todo)} frames with {args.workers} workers")

            def job(i: int) -> None:
                path = local_or_fetch(key, layer, i, args.stream)
                if path is None:
                    raise FileNotFoundError(f"frame {i} missing and --stream not set")
                data = process_frame(path, inv, nx, ny)
                np.savez_compressed(cache / "blocks" / f"{i:04d}.npz",
                                    block=data["block"], cov=data["cov"])
                if args.stream:
                    path.unlink(missing_ok=True)

            with ThreadPoolExecutor(max_workers=args.workers) as pool:
                list(pool.map(job, todo))

        blocks = {}
        for i in indices:
            with np.load(cache / "blocks" / f"{i:04d}.npz") as npz:
                blocks[i] = (npz["block"].astype(np.float32), npz["cov"].astype(np.float32))

        # --- stage 2: pass 1 (chromaticity only) -> base map ----------------
        pass1 = [invert_frame(inv, *blocks[i], cfg) for i in indices]
        base_info = estimate_base(pass1, [blocks[i][0] for i in indices], cfg)
        base = base_info["base"] if base_info["report"].get("static", False) else None
        print(f"   base: {json.dumps(base_info['report'])}")

        # --- stage 3: pass 2 (shading divided out) --------------------------
        results = []
        for i in indices:
            res = invert_frame(inv, *blocks[i], cfg, base=base)
            base_used = base if base is not None else res["base"]
            np.savez_compressed(cache / "results" / f"{i:04d}.npz",
                                block=blocks[i][0], idx=res["idx"], base=res["base"],
                                flags=res["flags"], chroma_dist=res["chroma_dist"],
                                base_used=base_used)
            results.append(res)

        # --- stage 4: quantised grids + sidecar -----------------------------
        values = np.stack([quantise(r["value"], r["flags"], layer) for r in results])
        flags = np.stack([r["flags"] for r in results])
        layer_dir = out_root / key
        layer_dir.mkdir(parents=True, exist_ok=True)
        for name, arr in (("values.uint8.bin.gz", values), ("flags.uint8.bin.gz", flags)):
            with gzip.open(layer_dir / name, "wb", compresslevel=9) as fh:
                fh.write(arr.tobytes())

        lo = min(a[1] for a in layer["anchors"])
        hi = max(a[1] for a in layer["anchors"])
        sidecar = {
            "layer": key,
            "name": layer["name"],
            "units": layer["units"],
            "units_status": "colourbar label, not independently calibrated",
            "colorbar": {
                "min": lo, "max": hi, "interp": layer["interp"],
                "anchors": layer["anchors"], "anchors_source": layer["anchors_source"],
                "luminance": prof,
            },
            "grid": {"width": nx, "height": ny, "bbox": [-180, -90, 180, 90]},
            "frames": {
                "count": len(indices), "indices": indices,
                "time": "hour index since 2024-07-01 00:00, assumed hourly, unverified",
                "time_step_hours": TIME_STEP_HOURS,
                "time_step_verified": TIME_STEP_VERIFIED,
                "start": START_DATE,
            },
            "quantization": {
                "dtype": "uint8", "scheme": layer["interp"], "min": lo, "max": hi,
                "nodata": 255, "layout": "frame-major, ny x nx",
                "encoding": "gzip of raw uint8 frame-major array",
            },
            "nodata": {"brightness_min": cfg["brightness_min"], "chroma_tol": cfg["chroma_tol"],
                       "sat_min": cfg["sat_min"], "min_coverage": cfg["min_coverage"]},
            "flags": {"dtype": "uint8", "legend": FLAG_LEGEND},
            "inversion": {
                "method": "chromaticity match against colourbar, block-median downsample",
                "shading": base_info["report"],
                "confidence": "relative - values are positions on the published colourbar",
            },
        }
        (layer_dir / "layer.json").write_text(json.dumps(sidecar, indent=2))

        # --- stage 5: preset time series ------------------------------------
        series = []
        for preset in PRESETS:
            col = int(np.floor((preset["lon"] + 180) / 360 * nx))
            row = int(np.floor((90 - preset["lat"]) / 180 * ny))
            points = []
            for i, res in zip(indices, results):
                window = np.s_[max(0, row - 1):row + 2, max(0, col - 1):col + 2]
                vals = res["value"][window]
                fl = res["flags"][window]
                ok = fl == OK
                points.append({
                    "frame": i,
                    "hour_index": i,
                    "value": float(vals[ok].mean()) if ok.any() else None,
                    "cells_ok": int(ok.sum()),
                    "flag": int(np.bincount(fl.ravel()).argmax()),
                })
            series.append({"preset": preset["id"], "name": preset["name"],
                           "lat": preset["lat"], "lon": preset["lon"], "points": points})
        (layer_dir / "series.json").write_text(json.dumps(series, indent=2))

        size = sum(p.stat().st_size for p in layer_dir.iterdir() if p.is_file())
        summary[key] = {"frames": len(indices), "bytes": size, "luminance": prof,
                        "base": base_info["report"]}
        print(f"   wrote {layer_dir}  {size / 1024:.1f} KB")

    total = sum(v["bytes"] for v in summary.values())
    print(f"\ntotal shipped output: {total / 1024:.1f} KB for "
          f"{sum(v['frames'] for v in summary.values())} frames")
    print(json.dumps({k: {"frames": v["frames"], "bytes": v["bytes"]} for k, v in summary.items()},
                     indent=2))


if __name__ == "__main__":
    main()
