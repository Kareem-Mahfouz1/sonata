# Preprocessing plan

`preprocess.py` is a stub for the offline data preparation step. Later it will:

1. Read unlabeled PNG frames from NASA SVS sources, preferring PNG sequences over compressed video.
2. Downsample each frame to a documented grid size.
3. Decode pixel colors into values using the source layer's colorbar image.
4. Emit compact JSON under `public/data/` containing each cell's time series and per-frame summaries.

Do not commit raw frame sets or other large NASA assets. Record source URLs, licenses, colorbar assumptions, grid size, and conversion units alongside each generated layer.
