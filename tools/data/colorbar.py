"""Colourbar -> lookup table (LUT) and LUT position -> physical value.

The bar image published by SVS is a gradient with a 1-2 px white border.
We locate the longest opaque horizontal run, inset the border, and keep one
colour per column so that column index maps linearly to "position along the
bar" in [0, 1].
"""
from __future__ import annotations

import numpy as np
from PIL import Image


def luminance(rgb: np.ndarray) -> np.ndarray:
    """Rec. 709 relative luminance, 0-255 scale, works on (..., 3)."""
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def load_bar(path: str) -> dict:
    """Return the bar colours (N,3), their positions (N,), and the bar bbox."""
    rgba = np.asarray(Image.open(path).convert("RGBA")).astype(float)
    alpha = rgba[..., 3]

    best = None
    for row in range(rgba.shape[0]):
        opaque = np.where(alpha[row] == 255)[0]
        if len(opaque) < 200:
            continue
        runs = np.split(opaque, np.where(np.diff(opaque) != 1)[0] + 1)
        run = max(runs, key=len)
        if len(run) < 200:
            continue
        # Rank by colour variety, not run length: the longest opaque row is
        # usually the white border, the gradient row has hundreds of colours.
        variety = len(np.unique(rgba[row, run[0] + 2:run[-1] - 1, :3], axis=0))
        if best is None or variety > best[0]:
            best = (variety, row, int(run[0]), int(run[-1]))
    if best is None:
        raise ValueError(f"no colourbar gradient found in {path}")

    _, row, left, right = best
    if best[0] < 50:
        raise ValueError(f"colourbar row {row} in {path} has too few colours")
    left, right = left + 2, right - 2  # drop the white border
    colors = rgba[row, left:right + 1, :3]
    return {
        "colors": colors,
        "positions": np.linspace(0.0, 1.0, len(colors)),
        "row": row,
        "left": left,
        "right": right,
    }


def positions_to_values(positions: np.ndarray, layer: dict) -> np.ndarray:
    """Map colourbar position -> value using the layer's measured anchors."""
    anchor_pos = np.array([a[0] for a in layer["anchors"]], dtype=float)
    anchor_val = np.array([a[1] for a in layer["anchors"]], dtype=float)
    if layer["interp"] == "log10":
        return 10.0 ** np.interp(positions, anchor_pos, np.log10(anchor_val))
    return np.interp(positions, anchor_pos, anchor_val)


def luminance_profile(colors: np.ndarray) -> dict:
    """Is value encoded in luminance?  Reports monotonicity along the bar."""
    lum = luminance(colors)
    diffs = np.diff(lum)
    decreasing = float((diffs <= 0).mean())
    increasing = float((diffs >= 0).mean())
    direction = "decreasing" if decreasing >= increasing else "increasing"
    # Rank correlation between position and luminance; quantisation noise
    # leaves a few +-1 level steps, so rank correlation is the honest test
    # of "value is encoded in brightness".
    n = len(lum)
    ranks = np.argsort(np.argsort(lum)).astype(float)
    rho = np.corrcoef(np.arange(n), ranks)[0, 1]
    # Quantisation noise leaves a few +-1 level steps; rank correlation is the
    # honest test of "value is encoded in brightness".
    monotonic = abs(rho) > 0.999
    return {
        "monotonic": bool(monotonic),
        "direction": direction,
        "frac_steps_consistent": max(decreasing, increasing),
        "rank_correlation": float(rho),
        "lum_first": float(lum[0]),
        "lum_last": float(lum[-1]),
        "lum_range": float(lum.max() - lum.min()),
    }


class Inverter:
    """Chromaticity-first inversion of one layer's frames."""

    def __init__(self, layer: dict, bar: dict):
        self.layer = layer
        self.colors = bar["colors"]                       # (N,3) 0-255
        self.positions = bar["positions"]
        self.values = positions_to_values(self.positions, layer)
        self.lum = luminance(self.colors) / 255.0
        total = np.maximum(self.colors.sum(axis=1, keepdims=True), 1e-6)
        self.chroma = self.colors / total                 # (N,3)
        self.chroma_max = self.colors / np.maximum(self.colors.max(axis=1, keepdims=True), 1e-6)

    def match_chroma(self, pixels: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Nearest colourbar entry by chromaticity (scale invariant)."""
        total = np.maximum(pixels.sum(axis=1, keepdims=True), 1e-6)
        chroma = pixels / total
        d = np.sqrt(((chroma[:, None, :] - self.chroma[None, :, :]) ** 2).sum(axis=2))
        return d.argmin(axis=1), d.min(axis=1)

    def match_luminance(self, pixels: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Nearest colourbar entry by normalised luminance (for grey pixels)."""
        lum = luminance(pixels) / 255.0
        d = np.abs(lum[:, None] - self.lum[None, :])
        return d.argmin(axis=1), d.min(axis=1)

    def implied_base(self, pixels: np.ndarray, idx: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Per-pixel greyscale multiplier b with p = c(v) * b, and its consistency."""
        ref = np.maximum(self.colors[idx], 1.0)
        ratio = pixels / ref
        b = np.median(ratio, axis=1)
        spread = (ratio.max(axis=1) - ratio.min(axis=1)) / np.maximum(b, 1e-6)
        return b, spread
