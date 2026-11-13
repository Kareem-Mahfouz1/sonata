"""Bundle accepted fine presets and copy ignored lazy grid assets for Step 4.

Only the compact generated TS preset is tracked. Source PNGs and large global
binaries remain ignored. No values are rounded, filled, smoothed or excluded.
"""
from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
import re
import shutil

import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def bundle(keys):
    data = {}
    total = 0
    for key in keys:
        directory = ROOT/'data/processed'/('nox-full' if key=='nox' else 'full')/key
        metadata = json.loads((directory/'layer.json').read_text())
        series = json.loads((directory/'series.json').read_text())[0]
        points = series['points']
        assert metadata['frames']['indices'] == [p['frame'] for p in points]
        assert metadata['frames']['count'] == len(points)
        assert all((p['value'] is None)==(p['flag']!=0) for p in points)
        shape=(len(points),metadata['grid']['height'],metadata['grid']['width'])
        with gzip.open(directory/'values.uint8.bin.gz','rb') as stream:
            values=np.frombuffer(stream.read(),dtype=np.uint8).reshape(shape)
        with gzip.open(directory/'flags.uint8.bin.gz','rb') as stream:
            flags=np.frombuffer(stream.read(),dtype=np.uint8).reshape(shape)
        assert np.array_equal(values==255,flags!=0)
        compact={k:metadata[k] for k in ['layer','name','units','units_status','colorbar','grid','frames','quantization']}
        compact['confidence']='relative; not independently calibrated concentrations'
        data[key]={'latitude':series['lat'],'longitude':series['lon'],'metadata':compact,
                   'values':[p['value'] for p in points],'flags':[p['flag'] for p in points]}
        target=ROOT/'public/data/layers'/key
        target.mkdir(parents=True,exist_ok=True)
        for filename in ['layer.json','values.uint8.bin.gz','flags.uint8.bin.gz']:
            shutil.copy2(directory/filename,target/filename)
            total+=(target/filename).stat().st_size
        print(f'{key}: {len(points)} fine readings, {sum(p["value"] is None for p in points)} nulls; global shape {shape}',flush=True)
    literal=json.dumps(data,indent=2,ensure_ascii=False)
    def wrap_array(match):
        indentation,key,body=match.groups()
        items=json.loads('['+body+']')
        chunks=[json.dumps(items[i:i+12],ensure_ascii=False)[1:-1] for i in range(0,len(items),12)]
        content=(',\n').join(indentation+'  '+chunk for chunk in chunks)
        return indentation+'"'+key+'": [\n'+content+'\n'+indentation+']'
    literal=re.sub(r'(?m)^([ ]*)"(indices|values|flags)": \[(.*?)^\1\]',wrap_array,literal,flags=re.DOTALL)
    text='// Generated from accepted full-pass fine Cairo exports; never filled or smoothed.\n'
    text+='// Regenerate with tools/data/bundle_app.py. Raw source frames are not bundled.\n'
    text+='// Preserve Python float32 round-trip decimal spellings, not rounded display values.\n'
    text+='/* eslint-disable no-loss-of-precision */\n'
    text+='export const cairoPresetsData = '+literal+' as const\n'
    preset=ROOT/'src/data/airQuality/cairoPresets.ts'
    preset.parent.mkdir(parents=True,exist_ok=True)
    preset.write_text(text)
    print(f'Compact tracked preset: {preset.stat().st_size} bytes; ignored lazy assets: {total} bytes',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--layers',default='o3,pm25,nox')
    args=parser.parse_args()
    bundle(args.layers.split(','))
