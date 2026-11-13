"""Four-day hourly Cairo diagnostic; report only, unchanged inverter/base.

Sources 0000..0095 for O3/PM2.5; all PNGs streamed, fine 5x5 medians cached,
then PNGs deleted. A shared lock enforces four HTTP requests across all jobs.
No filling, smoothing, threshold changes, or bin exclusions.
"""
from __future__ import annotations

import csv
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import shutil
import time
import urllib.request

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image

from colorbar import Inverter, load_bar, luminance
from download_limit import request_slot
from invert import FLAG_LEGEND, OK, invert_point, saturation
from layers import DEFAULTS, LAYERS
from preprocess import frame_name, frame_url, preset_pixel
from series import TIME_LABEL

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'data/processed/hourly'
RAW = ROOT/'data/raw/hourly'


def stream_frame(key, index, deadline):
    layer = LAYERS[key]
    path = RAW/key/frame_name(layer,index)
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary = path.with_suffix('.png.part')
    for attempt in range(3):
        try:
            with request_slot():
                remaining = deadline-time.monotonic()
                if remaining <= 0:
                    raise TimeoutError('diagnostic time box reached')
                with urllib.request.urlopen(frame_url(layer,index),timeout=min(30,remaining)) as response, temporary.open('wb') as stream:
                    shutil.copyfileobj(response,stream)
            temporary.replace(path)
            with Image.open(path) as image:
                rgb = np.asarray(image.convert('RGB'),dtype=np.float32)
            color = preset_pixel(rgb,30.04,31.24,5)
            return color
        except Exception:
            if attempt == 2 or time.monotonic() >= deadline:
                raise
            time.sleep(min(2**attempt, max(0,deadline-time.monotonic())))
        finally:
            path.unlink(missing_ok=True)
            temporary.unlink(missing_ok=True)
    raise RuntimeError('unreachable')


def runs(indices):
    result=[]
    for index in indices:
        if result and index == result[-1][-1]+1:
            result[-1].append(index)
        else:
            result.append([index])
    return result


def main():
    started=time.monotonic()
    deadline=started+600
    OUT.mkdir(parents=True,exist_ok=True)
    cache=OUT/'.cache'
    cache.mkdir(exist_ok=True)
    print('Hourly diagnostic START: 192 source frames, 2 workers, 600-second download time box',flush=True)
    def task(key,index):
        target=cache/f'{key}_{index:04d}.json'
        if target.exists():
            return key,index,json.loads(target.read_text())
        color=stream_frame(key,index,deadline)
        target.write_text(json.dumps(color.tolist())+'\n')
        return key,index,color.tolist()
    medians={'o3':{},'pm25':{}}
    errors=[]
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures={pool.submit(task,key,index):(key,index) for index in range(96) for key in medians}
        done=0
        for future in as_completed(futures):
            key,index=futures[future]
            try:
                k,i,color=future.result();medians[k][i]=color
            except Exception as error:
                errors.append({'layer':key,'frame':index,'error':str(error)})
            done+=1
            if done%16==0:
                print(f'Hourly {done}/192 tasks; usable source medians {sum(len(v) for v in medians.values())}; elapsed {time.monotonic()-started:.1f}s',flush=True)
    report={'timing':TIME_LABEL,'clock_timezone':'unverified; not Cairo local time',
            'policy':'report only; no interpolation, smoothing, threshold retuning or exclusions',
            'runtime_seconds':time.monotonic()-started,'errors':errors,'layers':{}}
    plt.rcParams.update({'font.size':10})
    for key,colors in medians.items():
        layer=LAYERS[key]
        bar=load_bar(str(ROOT/'data/raw/colorbars'/layer['colorbar']))
        inv=Inverter(layer,bar)
        meta=json.loads((ROOT/'data/processed/full'/key/'layer.json').read_text())
        base=None
        if meta['inversion']['shading'].get('static'):
            with np.load(ROOT/'data/processed/full/.cache'/key/'results/0000.npz') as cache_frame:
                base=float(cache_frame['base_used'][29,105])
        low_rgb=inv.colors[0]
        low_chroma=low_rgb/low_rgb.sum()
        low_luminance=float(luminance(low_rgb)/255)
        neutral=np.array([1/3]*3)
        rows=[]
        for index in range(96):
            if index not in colors:
                continue
            color=np.array(colors[index],dtype=np.float32)
            value,flag,distance=invert_point(inv,color,base,DEFAULTS)
            chroma=color/max(float(color.sum()),1e-9)
            lum=float(luminance(color)/255)
            row={'frame':index,'day':index//24+1,'assumed_hour':index%24,
                 'value':value if flag==OK else None,'flag':flag,'reason':FLAG_LEGEND[flag],
                 'rgb_r':float(color[0]),'rgb_g':float(color[1]),'rgb_b':float(color[2]),
                 'chroma_r':float(chroma[0]),'chroma_g':float(chroma[1]),'chroma_b':float(chroma[2]),
                 'saturation':float(saturation(color.reshape(1,3))[0]),'luminance_0_1':lum,
                 'distance_to_low_end_chroma':float(np.linalg.norm(chroma-low_chroma)),
                 'distance_to_neutral_grey_chroma':float(np.linalg.norm(chroma-neutral)),
                 'luminance_ratio_to_low_end':lum/low_luminance,'match_distance':distance,
                 'base_used':base}
            rows.append(row)
        with (OUT/f'cairo_hourly_{key}.csv').open('w',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=list(rows[0]) if rows else ['frame']);writer.writeheader();writer.writerows(rows)
        flagged=[row for row in rows if row['flag']!=OK]
        by_index={row['frame']:row for row in rows}
        pm_windows=[]
        if key=='pm25':
            for midnight in [24,48,72]:
                window=[by_index.get(i) for i in range(midnight-5,midnight+6)]
                before=by_index.get(midnight-1);after=by_index.get(midnight+1);peak=by_index.get(midnight)
                ratios=None
                if peak and peak['value'] is not None and before and after and before['value'] is not None and after['value'] is not None:
                    ratios=[peak['value']/before['value'],peak['value']/after['value']]
                pm_windows.append({'midnight_frame':midnight,'neighbour_ratios':ratios,
                                   'single_frame_over_3x_both_sides':None if ratios is None else bool(min(ratios)>3),
                                   'window':[{k:row[k] for k in ['frame','assumed_hour','value','flag']} for row in window if row]})
        report['layers'][key]={'completed_frames':len(rows),'expected_frames':96,'units':layer['units'],
            'base_used':base,'unchanged_thresholds':DEFAULTS,'flagged_count':len(flagged),
            'flagged_stretches':runs([row['frame'] for row in flagged]),
            'low_end_colorbar':{'rgb':low_rgb.tolist(),'chromaticity':low_chroma.tolist(),'luminance_0_1':low_luminance},
            'neutral_grey':{'chromaticity':[1/3,1/3,1/3],
                            'luminance_note':'a neutral grey can have any luminance; grey at observed luminance has exactly the same luminance'},
            'flagged_pixel_diagnostics':flagged,'midnight_windows':pm_windows,'hourly_rows':rows}
        fig,axes=plt.subplots(4,1,figsize=(11,10),constrained_layout=True,sharex=True)
        for day in range(1,5):
            day_rows=[row for row in rows if row['day']==day]
            ax=axes[day-1]
            hours=[row['assumed_hour'] for row in day_rows]
            values=[np.nan if row['value'] is None else row['value'] for row in day_rows]
            ax.plot(hours,values,'o-',markersize=4,color='#496f99',linewidth=1.2)
            missing=[row['assumed_hour'] for row in day_rows if row['value'] is None]
            if missing:
                ax.scatter(missing,[0]*len(missing),marker='x',color='#a45448',label='flagged / null (marker at 0, not a value)')
            ax.set_title(f'{key.upper()} — day {day}, source indices {(day-1)*24:04d}–{day*24-1:04d}',loc='left')
            ax.set_ylabel(layer['units']+' (relative)');ax.grid(alpha=.2);ax.set_xticks(range(24))
            if missing:ax.legend(fontsize=8)
        axes[-1].set_xlabel('Assumed frame-clock hour — unverified, not Cairo local time')
        fig.savefig(OUT/f'hourly_{key}.png',dpi=140);plt.close(fig)
    report['runtime_seconds']=time.monotonic()-started
    (OUT/'hourly_report.json').write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
    print('Hourly diagnostic FINISHED',report['runtime_seconds'],'s',flush=True)
    print(json.dumps({k:{'completed':v['completed_frames'],'flagged':v['flagged_count'],'stretches':v['flagged_stretches']} for k,v in report['layers'].items()}),flush=True)


if __name__=='__main__':
    main()
