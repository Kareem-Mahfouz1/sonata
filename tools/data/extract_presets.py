"""Extract fine 5x5 PM2.5 series for the three Step 6 preset points.

Streams source frames, reuses the accepted per-frame base_used at each point's
grid cell, inverts with the identical point matcher, and deletes each frame.
No values are filled or interpolated.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from colorbar import Inverter, load_bar  # noqa: E402
from invert import invert_point  # noqa: E402
from layers import DEFAULTS, LAYERS  # noqa: E402
from preprocess import local_or_fetch, preset_pixel  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
POINTS = [
    {"id": "cairo", "name": "Cairo", "lat": 30.04, "lon": 31.24},
    {"id": "fort_nelson", "name": "Fort Nelson", "lat": 58.81, "lon": -122.70},
    {"id": "aswan", "name": "Aswan", "lat": 24.09, "lon": 32.90},
]


def cell(lat, lon):
    return min(89, max(0, int((90 - lat) / 2))), min(179, max(0, int((lon + 180) / 2)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/processed/presets/presets.json")
    args = ap.parse_args()
    layer = LAYERS["pm25"]
    inv = Inverter(layer, load_bar(ROOT / "data/raw/colorbars" / layer["colorbar"]))
    cache = ROOT / "data/processed/full/.cache/pm25/results"
    indices = list(range(0, 1801, 6))
    series = {p["id"]: [] for p in POINTS}

    def extract(index):
        path = local_or_fetch("pm25", layer, index, stream=True)
        img = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
        result = np.load(cache / f"{index:04d}.npz")
        row_values = {}
        for point in POINTS:
            row, col = cell(point["lat"], point["lon"])
            patch = preset_pixel(img, point["lat"], point["lon"], 5)
            value, flag, chroma = invert_point(inv, patch, float(result["base_used"][row, col]), DEFAULTS)
            row_values[point["id"]] = {"frame": index, "value": value if flag == 0 else None, "flag": flag, "chroma_dist": chroma}
        path.unlink(missing_ok=True)
        return index, row_values

    with ThreadPoolExecutor(max_workers=4) as pool:
        done = 0
        for index, row_values in pool.map(extract, indices):
            for point_id, record in row_values.items():
                series[point_id].append(record)
            done += 1
            if done % 25 == 0:
                print(f"{done}/{len(indices)} frames", flush=True)
    meta = json.loads((ROOT / "data/processed/full/pm25/layer.json").read_text())
    compact = {k: meta[k] for k in ["layer", "name", "units", "units_status", "colorbar", "grid", "frames", "quantization"]}
    compact["confidence"] = "relative; not independently calibrated concentrations"
    output = {"metadata": compact, "points": []}
    for point in POINTS:
        output["points"].append({**point, "values": [p["value"] for p in series[point["id"]]],
                                 "flags": [p["flag"] for p in series[point["id"]]],
                                 "extraction": "median of 5x5 full-resolution pixels; same inverter, base and thresholds as the grid"})
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, separators=(",", ":")))
    for point in output["points"]:
        print(point["id"], "nulls", sum(v is None for v in point["values"]), flush=True)


if __name__ == "__main__":
    main()
