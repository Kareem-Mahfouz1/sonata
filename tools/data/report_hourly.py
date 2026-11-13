"""Human-readable hourly checkpoint, generated only after diagnostics finish."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'data/processed/hourly'


def number(value, precision=3):
    return 'null' if value is None else f'{value:.{precision}f}'


def main():
    report=json.loads((OUT/'hourly_report.json').read_text())
    lines=['# Cairo four-day hourly diagnostic', '',
           'Timing: **hour index since 2024-07-01 00:00, assumed hourly, unverified**. The clock is not presented as Cairo local time.', '',
           f"Runtime: {report['runtime_seconds']:.1f} seconds. Fine extraction is the same 5×5 full-resolution RGB median and inverter as the accepted full pass. No data were filled, smoothed, retuned, or excluded.", '',
           'O3 retains chromaticity-only inversion; PM2.5 uses the same estimated base as the accepted full pass. These are relative colorbar-derived readings, not calibrated units. Source PNGs were deleted after processing; diagnostic RGB medians and CSV evidence remain.', '']
    lines += ['## Checkpoint conclusions', '',
              '**PM2.5: broad multi-hour nighttime peaks, not isolated midnight-frame spikes.** All four days retain elevated readings over multiple hours around midnight. For the three fully bracketed midnight frames (24, 48, 72), none exceeds both immediate hourly neighbors by 3×. The six-hour sampling had hidden the width of these peaks. Abrupt drops near assumed hour 05 remain visible and unaltered. This resolves the single-frame-spike question for these four days, but is not independent atmospheric calibration or proof for every day in the full run.', '',
              '**O3: a contiguous nighttime missing stretch, with low-end/grey-like chromaticity.** Frames 46–51 are six consecutive flagged hours across assumed 22:00–03:00. Frame 95 is also flagged at 23:00 and is right-censored by the diagnostic boundary. Their raw median colors are blue-grey (for example 163/162/181 at frame 48), not literally white. Chromaticity distances to the low colorbar end are about 0.012–0.029, versus 0.013–0.030 to neutral grey; observed luminance is about 63–72% of low-end colorbar luminance. The slight blue tint favors the low-end rendering but does not uniquely separate low O3 from grey shading/background. The low-end hypothesis is supported, not verified; no concentration is assigned to these nulls.', '',
              'The overnight-mean selection concern remains. Neither this check nor the broad PM2.5 curve verifies frame timing, UTC, or Cairo local time. Do not call a null “low”; use “no reliable reading”. No clock bin has been excluded.', '']
    for key in ['pm25','o3']:
        layer=report['layers'][key]
        rows=layer['hourly_rows']
        lines += [f"## {key.upper()}: {layer['completed_frames']}/96 source frames; {layer['flagged_count']} flagged readings", '']
        if key=='pm25':
            lines += ['### Midnight transition windows', '',
                      'These use source indices 24, 48 and 72, where both neighboring days are available. Frame 0 has no preceding frame in this diagnostic, so it cannot establish a two-sided spike.', '',
                      '| Midnight source index | Peak / previous hour | Peak / next hour | >3× both immediate neighbors? |',
                      '|---:|---:|---:|---|']
            for w in layer['midnight_windows']:
                ratios=w['neighbour_ratios']
                lines += [f"| {w['midnight_frame']:04d} | {number(ratios[0]) if ratios else 'unverified'} | {number(ratios[1]) if ratios else 'unverified'} | {w['single_frame_over_3x_both_sides']} |"]
            for w in layer['midnight_windows']:
                lines += ['',f"#### Around source frame {w['midnight_frame']:04d}",'',
                          '| Frame | Assumed hour | Fine reading | Flag |','|---:|---:|---:|---:|']
                for row in w['window']:
                    lines.append(f"| {row['frame']:04d} | {row['assumed_hour']:02d}:00 | {number(row['value'])} | {row['flag']} |")
        else:
            lines += ['### Flagged stretches', '',
                      'Contiguous source-index runs, with no gap bridging:', '',
                      '| Source-index stretch | Assumed clock hours | Number flagged |','|---|---|---:|']
            for run in layer['flagged_stretches']:
                lines.append(f"| {run[0]:04d}–{run[-1]:04d} | {run[0]%24:02d}:00–{run[-1]%24:02d}:00 | {len(run)} |")
            low=layer['low_end_colorbar']
            lines += ['', '### Actual observed colors at flagged fine readings', '',
                      f"Low-end O3 colorbar RGB: {low['rgb']}; chromaticity: {[round(x,6) for x in low['chromaticity']]}; normalized Rec.709 luminance: {low['luminance_0_1']:.6f}.", '',
                      'The RGB below is the observed per-channel median of the 25 source pixels, before shading correction. Distances are Euclidean RGB-sum-normalized chromaticity distances. Neutral grey has chromaticity (1/3,1/3,1/3) at **any** luminance; a grey chosen at the observed luminance therefore has the same luminance. Brightness alone does not distinguish a low colorbar value from grey shading/background.', '',
                      '| Frame | RGB median | Chromaticity r/g/b | Saturation | Luminance [0,1] | L / low-end L | Distance to low end | Distance to neutral grey |',
                      '|---:|---|---|---:|---:|---:|---:|---:|']
            for row in layer['flagged_pixel_diagnostics']:
                rgb='/'.join(number(row[f'rgb_{c}'],1) for c in 'rgb')
                chroma='/'.join(number(row[f'chroma_{c}'],5) for c in 'rgb')
                lines.append(f"| {row['frame']:04d} | {rgb} | {chroma} | {row['saturation']:.5f} | {row['luminance_0_1']:.5f} | {row['luminance_ratio_to_low_end']:.5f} | {row['distance_to_low_end_chroma']:.5f} | {row['distance_to_neutral_grey_chroma']:.5f} |")
        lines += ['', '### Hourly readings for days 1–4', '',
                  f"Units as read: {layer['units']} (relative). Null entries display their flag code, not a low/zero value.", '',
                  '| Assumed hour | Day 1, frames 0–23 | Day 2, frames 24–47 | Day 3, frames 48–71 | Day 4, frames 72–95 |',
                  '|---:|---:|---:|---:|---:|']
        by_index={row['frame']:row for row in rows}
        for hour in range(24):
            cells=[]
            for day in range(4):
                row=by_index.get(day*24+hour)
                cells.append('unverified / missing source' if row is None else
                             number(row['value']) if row['value'] is not None else f"null (flag {row['flag']})")
            lines.append(f"| {hour:02d}:00 | {' | '.join(cells)} |")
        lines += ['',f"![{key.upper()} hourly curves](hourly_{key}.png)",'']
    lines += ['## No automatic scientific changes', '',
              'These diagnostics support a review decision; they do not authorize deletion of a clock bin or replacement of flagged readings. The loader uses the existing masks and returns null plus a reason. Null UI wording is **“no reliable reading”**. A silent/resting voice is the future audio mapping for nulls, not a zero or low-value note.', '',
              'Complete source-color diagnostics are in `cairo_hourly_o3.csv`, `cairo_hourly_pm25.csv`, and `hourly_report.json`.']
    (OUT/'REPORT.md').write_text('\n'.join(lines)+'\n')
    print(OUT/'REPORT.md')


if __name__=='__main__':
    main()
