"""Post-run sanity checks: report only, never repair scientific anomalies.

Ordinal sample j maps to 6*(j mod 4) hours, equivalently source index % 24.
Reports both isolated two-sided >3x jumps and all adjacent >3x transitions.
Nulls remain null; no interpolation, smoothing or neighbour substitution.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from invert import FLAG_LEGEND, OK
from series import TIME_LABEL

ROOT = Path(__file__).resolve().parents[2]
PERCENTILES = [5, 25, 50, 75, 95, 99]


def stats(values):
    x = np.asarray(values, dtype=float)
    finite = x[np.isfinite(x)]
    out = {'n_frames': len(x), 'n_valid': len(finite), 'n_null': int((~np.isfinite(x)).sum())}
    out.update({key: None for key in ['min', 'max', 'mean', 'std'] + [f'p{p:02d}' for p in PERCENTILES]})
    if len(finite):
        out.update(min=float(finite.min()), max=float(finite.max()), mean=float(finite.mean()), std=float(finite.std()))
        out.update({f'p{p:02d}': float(np.percentile(finite, p)) for p in PERCENTILES})
    return out


def jump_checks(values, indices, factor=3):
    x = np.asarray(values, dtype=float)
    isolated, transitions = [], []
    for j in range(1, len(x)):
        if not np.all(np.isfinite(x[j-1:j+1])) or min(x[j-1:j+1]) <= 0:
            continue
        ratio = float(x[j] / x[j-1])
        if ratio > factor or ratio < 1/factor:
            transitions.append({'from_frame': indices[j-1], 'to_frame': indices[j],
                                'from_value': float(x[j-1]), 'to_value': float(x[j]), 'ratio_to_from': ratio})
    checked = 0
    for j in range(1, len(x)-1):
        if not np.all(np.isfinite(x[j-1:j+2])) or min(x[j-1:j+2]) <= 0:
            continue
        checked += 1
        before, after = float(x[j]/x[j-1]), float(x[j]/x[j+1])
        peak = before > factor and after > factor
        trough = before < 1/factor and after < 1/factor
        if peak or trough:
            isolated.append({'frame': indices[j], 'kind': 'peak' if peak else 'trough',
                             'value': float(x[j]), 'previous_frame': indices[j-1], 'next_frame': indices[j+1],
                             'neighbours': [float(x[j-1]), float(x[j+1])],
                             'ratios_to_neighbours': [before, after]})
    return {'criterion': 'strictly >3x or <1/3x; immediate sampled neighbours only; null neighbours are not bridged',
            'two_sided_checked_triples': checked, 'isolated_two_sided': isolated,
            'adjacent_transitions': transitions}


def write_csv(path, fieldnames, rows):
    with path.open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def analyze_layer(directory, figdir):
    meta = json.loads((directory/'layer.json').read_text())
    key = meta['layer']
    indices = meta['frames']['indices']
    nx, ny = meta['grid']['width'], meta['grid']['height']
    with gzip.open(directory/'values.uint8.bin.gz', 'rb') as stream:
        q = np.frombuffer(stream.read(), dtype=np.uint8).reshape(len(indices), ny, nx)
    with gzip.open(directory/'flags.uint8.bin.gz', 'rb') as stream:
        flags = np.frombuffer(stream.read(), dtype=np.uint8).reshape(q.shape)
    assert indices == list(range(0, 1801, 6))
    assert np.array_equal(q == 255, flags != OK), 'flagged global cells must be nodata, never filled'
    document = json.loads((directory/'series.json').read_text())[0]
    points = document['points']
    assert [p['frame'] for p in points] == indices
    for p in points:
        assert (p['value'] is None) == (p['flag'] != OK)
        assert (p['grid_value'] is None) == (p['grid_flag'] != OK)
    fine = np.array([np.nan if p['value'] is None else p['value'] for p in points])
    grid = np.array([np.nan if p['grid_value'] is None else p['grid_value'] for p in points])
    fractions = (flags != OK).mean(axis=(1, 2))
    hours = np.array([(j % 4) * 6 for j in range(len(indices))])
    assert np.array_equal(hours, np.array(indices) % 24)
    diurnal = {}
    for hour in (0, 6, 12, 18):
        selection = hours == hour
        s = stats(fine[selection])
        diurnal[str(hour)] = {'n_samples': s['n_frames'], 'n_valid': s['n_valid'],
                              'n_null': s['n_null'], 'mean': s['mean'], 'median': s['p50']}
    paired = []
    by_index = dict(zip(indices, fine))
    for midnight in range(0, 1800, 24):
        a, b = by_index[midnight], by_index[midnight+12]
        if np.isfinite(a) and np.isfinite(b):
            paired.append((a, b))
    paired_check = {'n_days': len(paired), 'fraction_noon_above_midnight': None,
                    'mean_noon_minus_midnight': None}
    if paired:
        pair = np.array(paired)
        paired_check.update(fraction_noon_above_midnight=float((pair[:,1] > pair[:,0]).mean()),
                            mean_noon_minus_midnight=float((pair[:,1] - pair[:,0]).mean()))
    d0, d12 = diurnal['0']['mean'], diurnal['12']['mean']
    afternoon_check = None if d0 is None or d12 is None else bool(d12 > d0)
    slope = float(np.polyfit(np.array(indices)/24, fractions*100, 1)[0])
    mask = np.isfinite(fine) & np.isfinite(grid)
    difference = fine-grid
    relative = np.divide(difference*100, grid, out=np.full_like(grid, np.nan), where=grid != 0)
    comparison = {'fine_minus_grid': stats(difference), 'fine_minus_grid_pct': stats(relative),
                  'valid_pairs': int(mask.sum()),
                  'mean_absolute_difference': float(np.abs(difference[mask]).mean()) if mask.any() else None,
                  'correlation': float(np.corrcoef(fine[mask], grid[mask])[0,1]) if mask.sum() > 1 else None}
    files = {p.name: p.stat().st_size for p in directory.iterdir() if p.is_file()}
    flagged_fine = [{'frame': p['frame'], 'hour_of_day': p['hour_of_day'], 'flag': p['flag'],
                     'reason': FLAG_LEGEND[p['flag']]} for p in points if p['flag'] != OK]
    flagged_grid = [{'frame': p['frame'], 'flag': p['grid_flag'],
                     'reason': FLAG_LEGEND[p['grid_flag']]} for p in points if p['grid_flag'] != OK]
    fraction_rows = []
    for j, index in enumerate(indices):
        row = {'frame': index, 'hour_index': index, 'assumed_hour_of_day': int(hours[j]),
               'flagged_fraction': float(fractions[j])}
        row.update({f'flag_{code}_cells': int((flags[j] == code).sum()) for code in FLAG_LEGEND})
        fraction_rows.append(row)
    write_csv(figdir/f'flagged_fraction_{key}.csv', list(fraction_rows[0]), fraction_rows)
    series_rows = [{k: p[k] for k in ['sample_index', 'frame', 'hour_index', 'hour_of_day', 'value', 'flag',
                                     'grid_value', 'grid_flag', 'fine_minus_grid', 'fine_minus_grid_pct', 'chroma_dist']}
                   for p in points]
    write_csv(figdir/f'cairo_{key}.csv', list(series_rows[0]), series_rows)
    result = {
        'units': meta['colorbar']['units'], 'colorbar_min': meta['colorbar']['min'],
        'colorbar_max': meta['colorbar']['max'], 'axis_verified': meta['colorbar']['axis_verified'],
        'confidence': document['confidence'], 'frames': len(indices), 'timing': TIME_LABEL,
        'diurnal_assumed_clock': diurnal, 'noon_above_overnight': afternoon_check,
        'paired_day_check': paired_check,
        'flagged_fraction': {'mean': float(fractions.mean()), 'min': float(fractions.min()),
            'min_frame': indices[int(fractions.argmin())], 'max': float(fractions.max()),
            'max_frame': indices[int(fractions.argmax())], 'first': float(fractions[0]),
            'last': float(fractions[-1]), 'trend_percentage_points_per_day': slope,
            'first_week_mean': float(fractions[np.array(indices)<168].mean()),
            'last_week_mean': float(fractions[np.array(indices)>1632].mean())},
        'cairo_flagged_frames': {'fine_count': len(flagged_fine), 'grid_count': len(flagged_grid),
                                'fine': flagged_fine, 'grid': flagged_grid},
        'cairo_fine_stats': stats(fine), 'cairo_grid_stats': stats(grid), 'extraction': document['extraction'],
        'cairo_comparison': comparison, 'fine_jumps_over_3x': jump_checks(fine, indices),
        'grid_jumps_over_3x': jump_checks(grid, indices), 'output_files_bytes': files,
        'output_bytes': sum(files.values()), 'shading': meta['inversion']['shading'],
        'integrity': {'grid_shape': list(q.shape), 'all_flagged_grid_cells_are_nodata': True,
                       'all_flagged_series_values_are_null': True},
    }
    fig, axes = plt.subplots(3, 1, figsize=(11, 9), constrained_layout=True)
    hs = [0, 6, 12, 18]
    means = [diurnal[str(h)]['mean'] or np.nan for h in hs]
    bars = axes[0].bar([f'{h:02d}:00' for h in hs], means, color='#496f99', width=.6)
    for bar, h in zip(bars, hs):
        if np.isfinite(bar.get_height()):
            axes[0].annotate(f"{bar.get_height():.2f}\nn={diurnal[str(h)]['n_valid']}",
                             (bar.get_x()+bar.get_width()/2, bar.get_height()), ha='center',
                             va='bottom', fontsize=9, xytext=(0,4), textcoords='offset points')
    axes[0].set_ylim(0, max([m for m in means if np.isfinite(m)] or [1])*1.3)
    axes[0].set_ylabel(f"Colourbar units ({meta['units']})")
    axes[0].set_title(f'{key.upper()} · Cairo mean diurnal profile — assumed, unverified clock', loc='left')
    axes[1].plot(np.array(indices)/24, fractions*100, color='#a45448', linewidth=.8)
    axes[1].set_title(f'Global flagged cells — linear trend {slope:+.3f} percentage points/day', loc='left')
    axes[1].set_ylabel('Flagged cells (%)'); axes[1].set_xlabel('Assumed days since 2024-07-01 00:00')
    axes[2].plot(np.array(indices)/24, grid, color='#d99944', linewidth=1, alpha=.8, label='Containing 2° grid cell')
    axes[2].plot(np.array(indices)/24, fine, color='#496f99', linewidth=1, label='5×5 full-resolution median (~0.88°)')
    axes[2].set_title('Cairo time series — nulls are gaps, not filled', loc='left')
    axes[2].set_ylabel(f"Colourbar units ({meta['units']})"); axes[2].set_xlabel('Assumed day index')
    axes[2].legend(loc='upper right', fontsize=9)
    for ax in axes:
        ax.grid(axis='y', alpha=.18); ax.spines[['top','right']].set_visible(False)
    fig.savefig(figdir/f'sanity_{key}.png', dpi=150)
    plt.close(fig)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', default='data/processed/full')
    parser.add_argument('--layers', default='o3,pm25')
    parser.add_argument('--runtime', type=float, default=None, help='total active seconds, including interrupted attempt')
    parser.add_argument('--wall-runtime', type=float, default=None, help='wall seconds from initial launch to finish')
    parser.add_argument('--figdir', default='data/preview')
    args = parser.parse_args()
    figdir = ROOT/args.figdir
    figdir.mkdir(parents=True, exist_ok=True)
    report = {'timing': TIME_LABEL, 'runtime_seconds': args.runtime, 'wall_runtime_seconds': args.wall_runtime,
              'anomaly_policy': 'report only; no values interpolated, smoothed, or anomaly-corrected', 'layers': {}}
    for key in args.layers.split(','):
        report['layers'][key] = analyze_layer(ROOT/args.out/key, figdir)
    report['output_bytes'] = sum(layer['output_bytes'] for layer in report['layers'].values())
    report['output_mib'] = report['output_bytes']/1048576
    (figdir/'sanity_report.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
