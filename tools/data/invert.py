"""Frame -> value grid inversion.

Per frame (as agreed):
  1. block-median downsample 2048x1024 -> nx x ny (default 180x90) so that
     baked-in coastlines/borders are rejected as outliers;
  2. match the median colour to the colourbar on chromaticity (scale
     invariant).  When a static shading estimate exists, the shading is
     divided out first and luminance is added as a tie-breaker;
  3. estimate the greyscale multiplier b from  p = c(v) * b  and flag cells
     that are too dark, too grey, or inconsistent with that model.

Nothing is invented: every flagged cell is stored with a flag code and is
rendered as "no data" downstream.
"""
from __future__ import annotations

import numpy as np

from colorbar import Inverter, luminance

OK = 0
LOW_SAT = 1
DARK = 2
NO_MATCH = 3
BASE_INCONSISTENT = 4
LOW_COVERAGE = 5

FLAG_LEGEND = {
    OK: "ok",
    LOW_SAT: "low saturation - hue does not constrain the value",
    DARK: "very dark - shading has destroyed the colour",
    NO_MATCH: "colour does not match any colourbar entry",
    BASE_INCONSISTENT: "channels disagree with a single greyscale multiplier",
    LOW_COVERAGE: "too few usable pixels in the block",
}


def block_median(img: np.ndarray, nx: int, ny: int) -> tuple[np.ndarray, np.ndarray]:
    """Median RGB and usable-pixel fraction per block (exact, non-integer edges)."""
    h, w = img.shape[:2]
    xe = np.round(np.linspace(0, w, nx + 1)).astype(int)
    ye = np.round(np.linspace(0, h, ny + 1)).astype(int)
    out = np.zeros((ny, nx, 3), dtype=np.float32)
    cov = np.zeros((ny, nx), dtype=np.float32)
    bright = img.max(axis=2)
    for j in range(ny):
        for i in range(nx):
            block = img[ye[j]:ye[j + 1], xe[i]:xe[i + 1]]
            out[j, i] = np.median(block.reshape(-1, 3), axis=0)
            cov[j, i] = (bright[ye[j]:ye[j + 1], xe[i]:xe[i + 1]] >= 30).mean()
    return out, cov


def saturation(pixels: np.ndarray) -> np.ndarray:
    mx = pixels.max(axis=1)
    return (mx - pixels.min(axis=1)) / np.maximum(mx, 1e-6)


def invert_frame(inv: Inverter, block: np.ndarray, cov: np.ndarray, cfg: dict,
                 base: np.ndarray | None = None) -> dict:
    """Invert one downsampled frame; returns value/idx/flag grids and base estimate."""
    ny, nx, _ = block.shape
    observed = block.reshape(-1, 3)

    work = observed
    if base is not None:
        b_flat = np.maximum(base.reshape(-1), 1e-3)
        work = np.clip(observed / b_flat[:, None], 0, 255)

    idx, chroma_dist = inv.match_chroma(work)
    if base is not None:
        total = np.maximum(work.sum(axis=1, keepdims=True), 1e-6)
        chroma_p = work / total
        chroma_all = np.sqrt(((chroma_p[:, None, :] - inv.chroma[None, :, :]) ** 2).sum(axis=2))
        lum_dist = np.abs(luminance(work)[:, None] / 255.0 - inv.lum[None, :])
        idx = (chroma_all + 0.35 * lum_dist).argmin(axis=1)
        chroma_dist = chroma_all[np.arange(len(idx)), idx]

    b, spread = inv.implied_base(observed, idx)

    flags = np.full(len(idx), OK, dtype=np.uint8)
    flags[cov.reshape(-1) < cfg["min_coverage"]] = LOW_COVERAGE
    flags[observed.max(axis=1) < cfg["brightness_min"]] = DARK
    flags[chroma_dist > cfg["chroma_tol"]] = NO_MATCH
    flags[spread > cfg["base_spread_max"]] = BASE_INCONSISTENT
    low_sat = saturation(work) < cfg["sat_min"]
    flags[low_sat & (flags == OK)] = LOW_SAT

    return {
        "value": inv.values[idx].reshape(ny, nx).astype(np.float32),
        "idx": idx.reshape(ny, nx).astype(np.int16),
        "flags": flags.reshape(ny, nx),
        "base": b.reshape(ny, nx).astype(np.float32),
        "base_spread": spread.reshape(ny, nx).astype(np.float32),
        "chroma_dist": chroma_dist.reshape(ny, nx).astype(np.float32),
        "corrected": work.reshape(ny, nx, 3).astype(np.float32),
    }


def invert_point(inv: Inverter, color: np.ndarray, base: float | None, cfg: dict) -> tuple:
    """Invert a single colour (a full-resolution preset patch median)."""
    p = np.asarray(color, dtype=np.float32).reshape(1, 3)
    work = p if base is None else np.clip(p / max(base, 1e-3), 0, 255)
    idx, chroma_dist = inv.match_chroma(work)
    if base is not None:
        total = np.maximum(work.sum(axis=1, keepdims=True), 1e-6)
        chroma_all = np.sqrt(((work / total)[:, None, :] - inv.chroma[None, :, :]) ** 2).sum(axis=2)
        lum_dist = np.abs(luminance(work)[:, None] / 255.0 - inv.lum[None, :])
        idx = (chroma_all + 0.35 * lum_dist).argmin(axis=1)
        chroma_dist = chroma_all[np.arange(1), idx]
    b, spread = inv.implied_base(p, idx)
    flag = OK
    if p.max() < cfg["brightness_min"]:
        flag = DARK
    elif chroma_dist[0] > cfg["chroma_tol"]:
        flag = NO_MATCH
    elif spread[0] > cfg["base_spread_max"]:
        flag = BASE_INCONSISTENT
    elif saturation(work)[0] < cfg["sat_min"]:
        flag = LOW_SAT
    return float(inv.values[idx[0]]), int(flag), float(chroma_dist[0])


def estimate_base(frames: list[dict], blocks: list[np.ndarray], cfg: dict) -> dict:
    """Estimate the static greyscale shading and test whether it is static.

    The estimator takes a high percentile of the per-frame implied base
    (p90, i.e. the maximum with two frames): a wrong colour match can only
    make the implied base too low, never too high, so the upper envelope is
    the robust estimate.

    The staticness test follows the brief: look only at cells whose value is
    low/absent in both frames (near-white, saturation < 0.06).  There the
    colormap colour is white regardless of the exact value, so b = p / 255
    is measured directly, without going through the value inversion.
    """
    stack = np.stack([f["base"] for f in frames])
    base = np.clip(np.percentile(stack, 90, axis=0), 0.02, 1.05).astype(np.float32)

    report = {
        "frames": len(frames),
        "median_base": float(np.median(base)),
        "fraction_shaded": float((base < 0.8).mean()),
        "estimator": "p90 of implied base across frames",
    }
    report["unshaded"] = report["fraction_shaded"] <= 0.02

    if len(frames) > 1:
        sat = [saturation(blk.reshape(-1, 3)).reshape(blk.shape[:2]) for blk in blocks]
        bright = [blk.max(axis=2) for blk in blocks]
        low = np.ones_like(sat[0], dtype=bool)
        for s, br in zip(sat, bright):
            low &= (s < 0.06) & (br > 60)
        report["low_value_cells"] = int(low.sum())
        if low.sum() > 50:
            ref = np.full(3, 252.0)
            ba = (blocks[0][low] / ref).mean(axis=1)
            bb = (blocks[1][low] / ref).mean(axis=1)
            report["low_value_corr"] = float(np.corrcoef(ba, bb)[0, 1])
            report["low_value_mad"] = float(np.abs(ba - bb).mean())
            report["low_value_base_p50"] = [float(np.median(ba)), float(np.median(bb))]
            report["static"] = bool(report["low_value_corr"] > cfg["base_static_corr"]
                                    and report["low_value_mad"] < 0.1)
        else:
            report["static"] = bool(report["unshaded"])
    else:
        report["static"] = bool(report["unshaded"])

    return {"base": base, "report": report}


def quantise(value: np.ndarray, flags: np.ndarray, layer: dict) -> np.ndarray:
    """uint8: 0..254 across the colourbar range, 255 = no data."""
    lo = min(a[1] for a in layer["anchors"])
    hi = max(a[1] for a in layer["anchors"])
    if layer["interp"] == "log10":
        t = (np.log10(np.maximum(value, lo)) - np.log10(lo)) / (np.log10(hi) - np.log10(lo))
    else:
        t = (value - lo) / (hi - lo)
    q = np.clip(np.round(t * 254.0), 0, 254).astype(np.uint8)
    q[flags != OK] = 255
    return q


def dequantise(q: np.ndarray, layer: dict) -> np.ndarray:
    lo = min(a[1] for a in layer["anchors"])
    hi = max(a[1] for a in layer["anchors"])
    t = q.astype(np.float32) / 254.0
    if layer["interp"] == "log10":
        v = 10 ** (np.log10(lo) + t * (np.log10(hi) - np.log10(lo)))
    else:
        v = lo + t * (hi - lo)
    return np.where(q == 255, np.nan, v)
