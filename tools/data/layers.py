"""Per-layer configuration for NASA SVS 5518 air-quality frames.

Provenance for every number (all measured in Step 2 recon):
  * anchors: (position along the colourbar in [0,1], value) pairs taken from
    the published tick labels.
  * interp: interpolation space between anchors. "linear" for O3 (ticks sit on
    a linear scale) and CO (fits neither linear nor log, so we interpolate
    between the measured ticks). "log10" for NOx and PM2.5 (decade / x4 ticks).
  * time step: implied by 1801 frames spanning 1800 hours. dates.txt publishes
    dates only, so per-frame times are UNVERIFIED.
"""
from __future__ import annotations

BASE_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005518"
FRAMES_URL = f"{BASE_URL}/frames/2048x1024_2x1_30p"

LAYERS = {
    "co": {
        "name": "Carbon Monoxide",
        "units": "ppbv",
        "folder": "CarbonMonoxide_Layer",
        # NASA's own filename carries the "AiQuality" typo - keep it verbatim.
        "template": "AiQuality_CO_Layer_2048x1024_{index:04d}.png",
        "colorbar": "CarbonMonoxide_colorbar.png",
        "interp": "linear",
        "anchors": [(0.00, 40.0), (0.31, 100.0), (0.54, 130.0), (0.77, 200.0), (1.00, 500.0)],
        "anchors_source": "measured ticks; fits neither linear nor log (unverified)",
        "axis_verified": False,
        "axis_note": "tick positions fit neither linear nor log; piecewise between measured ticks",
    },
    "nox": {
        "name": "Nitrogen Oxides",
        "units": "ppbv",
        "folder": "NitrogenOxides_Layer",
        "template": "AirQuality_NOx_Layer_2048x1024_{index:04d}.png",
        "colorbar": "NitrogenOxides_colorbar.png",
        "interp": "log10",
        "anchors": [(0.0, 1e-3), (0.25, 1e-2), (0.5, 1e-1), (0.75, 1.0), (1.0, 10.0)],
        "anchors_source": "decade labels; measured positions within 0.02-0.06 of ideal log",
        "axis_verified": True,
        "axis_note": "decade labels are unambiguous; measured tick offsets attributed to label centring",
    },
    "o3": {
        "name": "Ozone",
        "units": "ppbv",
        "folder": "Ozone_Layer",
        "template": "AirQuality_O3_Layer_2048x1024_{index:04d}.png",
        "colorbar": "Ozone_colorbar.png",
        "interp": "linear",
        "anchors": [(0.0, 5.0), (1.0, 60.0)],
        "anchors_source": "measured ticks 0.268/0.628 vs linear 0.273/0.636 (verified linear)",
        "axis_verified": True,
        "axis_note": "ticks match a linear scale to within 0.01 of the bar",
    },
    "pm25": {
        "name": "Particulate Matter (PM2.5)",
        "units": "ug/m3",
        "folder": "PM2.5_Layer",
        "template": "AirQuality_PM2.5_Layer_2048x1024_{index:04d}.png",
        "colorbar": "PM2.5_colorbar.png",
        "interp": "log10",
        "anchors": [(0.0, 0.4), (0.2, 1.6), (0.4, 6.4), (0.6, 25.6), (0.8, 102.4), (1.0, 409.6)],
        "anchors_source": "measured 0.20/0.40/0.60/0.81 vs ideal 0.2/0.4/0.6/0.8 (verified log)",
        "axis_verified": True,
        "axis_note": "x4 log ticks match measured positions within 0.01",
    },
}

FRAME_COUNT = 1801
TIME_STEP_HOURS = 1.0
TIME_STEP_VERIFIED = False
START_DATE = "2024-07-01"

# Inversion thresholds.  Frames are colormap(value) * greyscale base, so hue is
# the primary signal; luminance is only used where hue is uninformative.
DEFAULTS = {
    "brightness_min": 30.0,   # max channel below this -> too dark to trust
    "chroma_tol": 0.06,       # chromaticity distance to count as a match
    "sat_min": 0.12,          # saturation below this -> low confidence
    "base_spread_max": 0.35,  # channel-ratio spread of the implied base
    "min_coverage": 0.25,     # share of valid pixels for a cell to count
    "base_static_corr": 0.90, # correlation between frames' base maps
}

# Fixed sample locations.  Cairo is the only one named so far; the brief says
# two more will follow, so the list is data, not code.
# `patch_px` is the full-resolution window used for the fine extraction:
# 5 px at 2048x1024 = 0.88 deg lon x 0.88 deg lat.
PRESETS = [
    {"id": "cairo", "name": "Cairo", "lat": 30.04, "lon": 31.24, "patch_px": 5},
]
