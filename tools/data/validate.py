"""Validate the inversion: re-render colormap(value) * base and diff the source.

Produces one figure per layer (source / recovered value / re-render / diff)
and a JSON report with the percentage of cells within tolerance, broken down
by value decile, latitude band and land/ocean.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from colorbar import Inverter, load_bar  # noqa: E402
from invert import OK  # noqa: E402
from layers import LAYERS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
TOL = 25.0  # max-channel difference, 0-255


def cairo_cell(lat: float, lon: float, nx: int, ny: int) -> tuple[int, int]:
    return int(np.floor((90 - lat) / 180 * ny)), int(np.floor((lon + 180) / 360 * nx))


def land_ocean(nx: int, ny: int):
    try:
        import global_land_mask as glm
    except ImportError:
        return None
    lats = 90 - (np.arange(ny) + 0.5) * 180 / ny
    lons = -180 + (np.arange(nx) + 0.5) * 360 / nx
    return np.array([[glm.is_land(la, lo) for lo in lons] for la in lats])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--layers", default="co,nox,o3,pm25")
    ap.add_argument("--out", default="data/processed/sample")
    ap.add_argument("--figdir", default="data/preview")
    ap.add_argument("--frames", default=None)
    args = ap.parse_args()

    out_root = ROOT / args.out
    fig_dir = ROOT / args.figdir
    fig_dir.mkdir(parents=True, exist_ok=True)
    report = {}

    for key in args.layers.split(","):
        layer = LAYERS[key]
        bar = load_bar(str(ROOT / "data" / "raw" / "colorbars" / layer["colorbar"]))
        inv = Inverter(layer, bar)
        cache = out_root / ".cache" / key / "results"
        files = sorted(cache.glob("*.npz"))
        if args.frames:
            keep = {int(v) for v in args.frames.split(",")}
            files = [f for f in files if int(f.stem) in keep]

        frames = []
        for f in files:
            with np.load(f) as npz:
                frames.append({"index": int(f.stem), **{k: npz[k] for k in npz.files}})
        if not frames:
            print(f"no cached results for {key}")
            continue

        ny, nx = frames[0]["flags"].shape
        ocean = land_ocean(nx, ny)
        per_frame = []

        for fr in frames:
            block, idx, base, flags = fr["block"], fr["idx"], fr["base_used"], fr["flags"]
            rendered = np.clip(inv.colors[idx] * base[..., None], 0, 255)
            diff = np.abs(rendered - block).max(axis=2)
            ok = flags == OK
            within = (diff <= TOL) & ok
            value = inv.values[idx]

            entry = {
                "frame": fr["index"],
                "cells_ok": int(ok.sum()),
                "cells_total": int(ok.size),
                "within_tol_of_ok": float(within.sum() / max(ok.sum(), 1)),
                "within_tol_of_all": float(within.sum() / ok.size),
                "median_diff_ok": float(np.median(diff[ok])) if ok.any() else None,
                "chroma_dist_p50": float(np.percentile(fr["chroma_dist"][ok], 50)) if ok.any() else None,
                "chroma_dist_p95": float(np.percentile(fr["chroma_dist"][ok], 95)) if ok.any() else None,
            }

            # where does it fail? by value decile, latitude band, land/ocean
            if ok.any():
                deciles = np.quantile(value[ok], np.linspace(0, 1, 11))
                by_decile = []
                for d in range(10):
                    m = ok & (value >= deciles[d]) & (value <= deciles[d + 1])
                    by_decile.append(round(float(((diff <= TOL) & m).sum() / max(m.sum(), 1)), 3))
                entry["within_tol_by_value_decile"] = by_decile
                bands = []
                for lo in range(-90, 90, 30):
                    r0 = int((90 - (lo + 30)) / 180 * ny)
                    r1 = int((90 - lo) / 180 * ny)
                    m = ok.copy()
                    m[:r0] = False
                    m[r1:] = False
                    bands.append(round(float(((diff <= TOL) & m).sum() / max(m.sum(), 1)), 3))
                entry["within_tol_by_lat_band_-90_to_90"] = bands
                if ocean is not None:
                    entry["within_tol_land"] = round(float(((diff <= TOL) & ok & ocean).sum() / max((ok & ocean).sum(), 1)), 3)
                    entry["within_tol_ocean"] = round(float(((diff <= TOL) & ok & ~ocean).sum() / max((ok & ~ocean).sum(), 1)), 3)
            per_frame.append(entry)

        # Cairo series
        row, col = cairo_cell(30.04, 31.24, nx, ny)
        cairo = []
        for fr in frames:
            window = np.s_[max(0, row - 1):row + 2, max(0, col - 1):col + 2]
            ok = fr["flags"][window] == OK
            v = inv.values[fr["idx"][window]]
            cairo.append({"frame": fr["index"],
                          "value": float(v[ok].mean()) if ok.any() else None,
                          "cells_ok": int(ok.sum())})

        # figure
        fig, axes = plt.subplots(len(frames), 4, figsize=(18, 4.2 * len(frames)))
        axes = np.atleast_2d(axes)
        for r, fr in enumerate(frames):
            block, idx, base, flags = fr["block"], fr["idx"], fr["base_used"], fr["flags"]
            rendered = np.clip(inv.colors[idx] * base[..., None], 0, 255)
            value = inv.values[idx].copy()
            value[flags != OK] = np.nan
            diff = np.abs(rendered - block).max(axis=2)
            panels = [
                (block / 255.0, "source (block median)", None, None),
                (value, f"recovered value ({layer['units']})", None, None),
                (rendered / 255.0, "re-render: colormap(value) x base", None, None),
                (diff, f"|diff| max channel (tol {TOL:.0f})", "inferno", (0, 120)),
            ]
            for c, (img, title, cmap, vlim) in enumerate(panels):
                ax = axes[r, c]
                kw = {}
                if vlim:
                    kw = {"vmin": vlim[0], "vmax": vlim[1]}
                im = ax.imshow(img, cmap=cmap, aspect="auto", **kw)
                ax.set_title(f"{key.upper()} frame {fr['index']:04d} - {title}", fontsize=9)
                ax.set_xticks([])
                ax.set_yticks([])
                fig.colorbar(im, ax=ax, fraction=0.03, pad=0.01)
        fig.tight_layout()
        fig_path = fig_dir / f"validation_{key}.png"
        fig.savefig(fig_path, dpi=110)
        plt.close(fig)

        report[key] = {"figure": str(fig_path.relative_to(ROOT)), "frames": per_frame,
                       "cairo": cairo}

    (ROOT / args.figdir / "validation_report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
