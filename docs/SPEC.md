# Earth Jukebox scaffold specification

Earth Jukebox is a static React application for NASA Space Apps Challenge 2026: The Earth Information Jukebox. It pairs NASA Earth Information Center visualizations with sonification. The app uses images and video frames, not raw scientific data, and should remain simple enough to complete during a 48-hour hackathon.

## Product modes

- **Scientific** is the default mode. It uses fixed, documented mappings.
- **Fun** allows swappable presets, creative tuning, and different instruments. Its output must be labeled **artistic interpretation**.
- Each data layer is a voice. The target is a maximum of three to four simultaneous voices.
- A live legend explains each active voice: metric, units, instrument, pitch and tempo meaning, and whether the layer is observed or modeled.
- Point mode plays a selected pixel's series over time. Sweep mode scans across a frame.
- Minimum export is offline rendering to WAV.
- Audio context creation must happen after a user gesture.

## Accessibility and localization

Use semantic HTML, visible focus, keyboard controls, an ARIA live region, and information that does not depend on color alone. English and Arabic are included from the beginning, with `dir` switching for LTR and RTL layouts.

## Mapping table

Fill one row per voice before implementing real mappings.

| Metric | Source layer | Instrument | Pitch range | Tempo/rhythm rule | Stereo position |
| ------ | ------------ | ---------- | ----------- | ----------------- | --------------- |
|        |              |            |             |                   |                 |
|        |              |            |             |                   |                 |
|        |              |            |             |                   |                 |
|        |              |            |             |                   |                 |

## Data contract

`LayerMeta` identifies a source layer, its units, kind, source, time range, spatial resolution, and credit. `LayerData` adds a grid, bounding box, frame count, and per-cell time series. The current `public/data/sample.json` is intentionally placeholder data.

## Planned implementation boundary

Tone.js owns synthesis, scheduling, and offline rendering. Canvas owns frame display. Static JSON is bundled under `public/data`; there is no backend. NASA frame preprocessing remains an offline Python task documented in `scripts/README.md`.
