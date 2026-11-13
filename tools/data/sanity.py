"""Post-run sanity checks (report only, never fixes anything).

  1. Cairo mean diurnal profile (frame index mod 4 = 00/06/12/18 on the
     assumed clock) - O3 should peak in the afternoon.
  2. Fraction of flagged cells per frame over time (does the flagged area
     drift?) and whether Cairo is ever flagged.
  3. Cairo series min/max/percentiles and frames that jump more than 3x the
     neighbouring frames.
  4. Total output size (runtime is passed in or read from the run log).

Usage: python tools/data/sanity.py --out data/processed/full [--runtime 480]
"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from invert import dequantise  # noqa: E402
from layers import LAYERS, TIME_STEP_HOURS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def load_bins(layer_dir: Path, nx: int, ny: int) -> tuple[np.ndarray, np.ndarray]:
    with gzip.open(layer_dir / "values.uint8.bin.gz", "rb") as fh:
        raw = fh.read()
    with gzip.open(layer_dir / "flags.uint8.bin.gz", "rb") as fh:
        flags = fh.read()
    values = np.frombuffer(raw, dtype=np.uint8).reshape(-1, ny, nx)
    flags = np.frombuffer(flags, dtype=np.uint8).reshape(-1, ny, nx)
    return values, flags


def outlier_frames(series: np.ndarray, factor: float = 3.0) -> list[dict]:
    """Frames whose value is more than `factor` times both neighbours."""
    hits = []
    for i in range(1, len(series) - 1):
        v, prev, nxt = series[i], series[i - 1], series[i + 1]
        if not np.isfinite(v) or not np.isfinite(prev) or not np.isfinite(nxt):
            continue
        ref = (prev + nxt) / 2
        if ref <= 0:
            continue
        ratio = v / ref
        if ratio > factor or ratio < 1 / factor:
            hits.append({"position": i, "ratio": float(ratio), "value": float(v),
                         "neighbours": [float(prev), float(nxt)]})
    return hits


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/processed/full")
    ap.add_argument("--layers", default="o3,pm25")
    ap.add_argument("--runtime", type=float, default=None, help="seconds, from the run log")
    ap.add_argument("--figdir", default="data/preview")
    args = ap.parse_args()

    out_root = ROOT / args.out
    fig_dir = ROOT / args.figdir
    fig_dir.mkdir(parents=True, exist_ok=True)
    report = {"runtime_seconds": args.runtime, "layers": {}}

    for key in args.layers.split(","):
        layer = LAYERS[key]
        layer_dir = out_root / key
        meta = json.loads((layer_dir / "layer.json").read_text())
        nx, ny = meta["grid"]["width"], meta["grid"]["height"]
        values, flags = load_bins(layer_dir, nx, ny)
        decoded = dequantise(values, layer)
        indices = meta["frames"]["indices"]

        series_doc = json.loads((layer_dir / "series.json").read_text())[0]
        points = series_doc["points"]
        fine = np.array([p["value"] if p["value"] is not None else np.nan for p in points])
        grid = np.array([p["grid_value"] if p["grid_value"] is not None else np.nan for p in points])
        flags_fine = np.array([p["flag"] for p in points])
        diffs = np.array([p["fine_minus_grid_pct"] if p["fine_minus_grid_pct"] is not None else np.nan
                          for p in points])

        # 1. diurnal profile on the assumed clock
        hours = np.array([(i * TIME_STEP_HOURS) % 24 for i in indices])
        diurnal = {}
        for h in sorted(set(hours)):
            sel = (hours == h) & np.isfinite(fine)
            diurnal[str(int(h))] = {
                "n": int(sel.sum()),
                "mean": float(np.nanmean(fine[sel])) if sel.any() else None,
                "median": float(np.nanmedian(fine[sel])) if sel.any() else None,
            }

        # 2. flagged fraction per frame
        frac = (flags != 0).mean(axis=(1, 2))
        slope = float(np.polyfit(indices, frac, 1)[0]) * 24  # per day
        cairo_flagged = int((flags_fine != 0).sum())
        cairo_grid_flagged = int((np.array([p["grid_flag"] for p in points]) != 0).sum())

        # 3. series stats and jumps
        finite = fine[np.isfinite(fine)]
        stats = {
            "n_frames": len(fine),
            "n_null": int(np.isnan(fine).sum()),
            "min": float(finite.min()), "max": float(finite.max()),
            "p05": float(np.percentile(finite, 5)), "p50": float(np.percentile(finite, 50)),
            "p95": float(np.percentile(finite, 95)), "mean": float(finite.mean()),
        }
        jumps = outlier_frames(fine)
        jumps = [{"frame": int(indices[j["position"]]), **j} for j in jumps]
        grid_stats = {
            "n_null": int(np.isnan(grid).sum()),
            "min": float(np.nanmin(grid)), "max": float(np.nanmax(grid)),
            "p50": float(np.nanmedian(grid)),
        }

        report["layers"][key] = {
            "units": layer["units"],
            "axis_verified": layer["axis_verified"],
            "frames": len(indices),
            "diurnal_assumed_clock": diurnal,
            "flagged_fraction": {
                "mean": float(frac.mean()), "min": float(frac.min()), "max": float(frac.max()),
                "trend_per_day": slope,
                "first": float(frac[0]), "last": float(frac[-1]),
            },
            "cairo_flagged_frames": {"fine": cairo_flagged, "grid": cairo_grid_flagged},
            "cairo_fine_stats": stats,
            "cairo_grid_stats": grid_stats,
            "cairo_fine_minus_grid_pct": {
                "mean": float(np.nanmean(diffs)), "median": float(np.nanmedian(diffs)),
                "p05": float(np.nanpercentile(diffs, 5)), "p95": float(np.nanpercentile(diffs, 95)),
            },
            "cairo_jumps_over_3x": jumps,
        }

        # plots
        fig, axes = plt.subplots(1, 3, figsize=(16, 3.6))
        hs = sorted(int(h) for h in diurnal if diurnal[str(int(h))]["mean"] is not None)
        axes[0].bar([str(h) for h in hs], [diurnal[str(h)]["mean"] for h in hs], color="#4c72b0")
        axes[0].set_title(f"{key.upper()} Cairo diurnal mean ({layer['units']}), assumed clock")
        axes[0].set_xlabel("hour of day (frame index mod 4)")
        axes[0].axhline(np.nanmean(fine), color="grey", ls="--", lw=1)

        axes[1].plot(indices, frac * 100, lw=0.8, color="#c44e52")
        axes[1].set_title(f"{key.upper()} flagged cells per frame (%), trend {slope * 100:+.3f} pp/day")
        axes[1].set_xlabel("hour index since 2024-07-01 00:00")

        axes[2].plot(indices, fine, lw=1, label="fine 5x5 px")
        axes[2].plot(indices, grid, lw=1, alpha=0.7, label="grid 3x3 cells")
        axes[2].set_title(f"{key.upper()} Cairo series (relative)")
        axes[2].legend(fontsize=7)
        axes[2].set_xlabel("hour index")
        fig.tight_layout()
        fig.savefig(fig_dir / f"sanity_{key}.png", dpi=110)
        plt.close(fig)

    total = sum(p.stat().st_size for p in out_root.rglob("*") if p.is_file()
                and ".cache" not in p.parts)
    report["output_bytes"] = total
    report["output_mb"] = round(total / 1048576, 2)
    (fig_dir / "sanity_report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
