"""Preset exports, shared by the batch and cached export-only regeneration.

No filling, smoothing, clipping of time series, or neighbour substitution.
Fine points are RGB medians of the cached full-resolution 5x5 patches.
The comparator is the containing 2x2-degree global cell, not a 3x3 mean.
"""
from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path

import numpy as np

from colorbar import Inverter, load_bar
from invert import OK, dequantise, invert_point
from layers import DEFAULTS, LAYERS, PRESETS

ROOT = Path(__file__).resolve().parents[2]
TIME_LABEL = "hour index since 2024-07-01 00:00, assumed hourly, unverified"


def build_series(inv, layer, indices, patches, values, flags, base=None, cfg=None):
    """values are decoded shipped grid bytes; flags are authoritative per cell."""
    cfg = DEFAULTS if cfg is None else cfg
    _, ny, nx = values.shape
    series = []
    for preset in PRESETS:
        col = min(nx - 1, max(0, int((preset['lon'] + 180) / 360 * nx)))
        row = min(ny - 1, max(0, int((90 - preset['lat']) / 180 * ny)))
        patch_px = preset.get('patch_px', 5)
        points = []
        for ordinal, index in enumerate(indices):
            point_base = None if base is None else float(base[row, col])
            fine, fine_flag, distance = invert_point(
                inv, patches[index][preset['id']], point_base, cfg)
            fine = fine if fine_flag == OK and np.isfinite(fine) else None
            grid_flag = int(flags[ordinal, row, col])
            grid = float(values[ordinal, row, col]) if grid_flag == OK else None
            difference = None if fine is None or grid is None else fine - grid
            difference_pct = None if difference is None or grid == 0 else difference / grid * 100
            points.append({
                'sample_index': ordinal, 'frame': index, 'hour_index': index,
                'hour_of_day': index % 24, 'value': fine, 'flag': fine_flag,
                'chroma_dist': distance, 'grid_value': grid, 'grid_flag': grid_flag,
                'fine_minus_grid': difference, 'fine_minus_grid_pct': difference_pct,
            })
        series.append({
            'preset': preset['id'], 'name': preset['name'], 'lat': preset['lat'], 'lon': preset['lon'],
            'units': layer['units'], 'axis_verified': layer['axis_verified'],
            'units_as_read': layer.get('units_as_read', layer['units']),
            'confidence': 'relative; not independently calibrated concentrations',
            'timing': TIME_LABEL, 'time_step_verified': False,
            'extraction': {
                'fine': f'per-channel median of {patch_px}x{patch_px} full-resolution pixels, then inversion',
                'fine_window_degrees': [patch_px * 360 / 2048, patch_px * 180 / 1024],
                'fine_pixel': [int((preset['lon'] + 180) / 360 * 2048), int((90 - preset['lat']) / 180 * 1024)],
                'grid': 'containing global block-median cell; decoded from shipped uint8 grid',
                'grid_cell_row_col': [row, col], 'grid_window_degrees': [360 / nx, 180 / ny],
                'base_for_fine': 'none (chromaticity only)' if base is None else 'estimated static base of containing grid cell',
                'nodata': 'value is null whenever its own flag is nonzero; no interpolation or filling',
            },
            'points': points,
        })
    return series


def regenerate(out, keys):
    """Re-export preset series from cached patches and unchanged shipped grids."""
    for key in keys:
        directory = out / key
        metadata = json.loads((directory / 'layer.json').read_text())
        layer = LAYERS[key]
        nx, ny = metadata['grid']['width'], metadata['grid']['height']
        indices = metadata['frames']['indices']
        with gzip.open(directory / 'values.uint8.bin.gz', 'rb') as stream:
            q = np.frombuffer(stream.read(), dtype=np.uint8).reshape(len(indices), ny, nx)
        with gzip.open(directory / 'flags.uint8.bin.gz', 'rb') as stream:
            flags = np.frombuffer(stream.read(), dtype=np.uint8).reshape(q.shape)
        assert np.array_equal(q == 255, flags != OK), 'no-data byte and flags disagree'
        patches = {}
        for index in indices:
            with np.load(out / '.cache' / key / 'blocks' / f'{index:04d}.npz') as block:
                patches[index] = {p['id']: block[f"patch_{p['id']}"] for p in PRESETS}
        base = None
        if metadata['inversion']['shading'].get('static', False):
            with np.load(out / '.cache' / key / 'results' / f'{indices[0]:04d}.npz') as result:
                base = result['base_used']
        inv = Inverter(layer, load_bar(str(ROOT / 'data' / 'raw' / 'colorbars' / layer['colorbar'])))
        document = build_series(inv, layer, indices, patches, dequantise(q, layer), flags, base=base)
        (directory / 'series.json').write_text(json.dumps(document, indent=2, allow_nan=False) + '\n')
        metadata['colorbar']['units_as_read'] = layer.get('units_as_read', layer['units'])
        metadata['grid'].update({'projection': 'equirectangular', 'row_order': 'north to south',
                                  'column_order': 'west to east', 'cell_degrees': [360 / nx, 180 / ny]})
        intervals = set(np.diff(indices).tolist())
        sample_step = intervals.pop() if len(intervals) == 1 else None
        metadata['frames'].update({'sample_step_hours': sample_step, 'epoch_assumed': '2024-07-01 00:00',
                                    'clock_reference': 'unverified; no verified timezone assigned'})
        metadata['inversion']['base_status_note'] = (
            'Staticness test requires near-white cells across every input; an empty mask is not evidence of nonstatic shading. '
            'No verified static base for O3: retain chromaticity-only fallback.' if key == 'o3' else
            'PM2.5 treated as effectively unshaded by the existing batch estimator; not independently calibrated.')
        (directory / 'layer.json').write_text(json.dumps(metadata, indent=2, allow_nan=False) + '\n')
        print(f'{key}: regenerated {len(indices)} fine and containing-cell preset readings; grids unchanged', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='data/processed/full')
    parser.add_argument('--layers', default='o3,pm25')
    arguments = parser.parse_args()
    regenerate(ROOT / arguments.out, arguments.layers.split(','))
