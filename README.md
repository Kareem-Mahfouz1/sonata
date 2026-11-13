# Earth Jukebox

A React + TypeScript + Vite scaffold for turning NASA Earth Information Center visualizations into sound. The current app is intentionally a shell: it provides Scientific/Fun mode state, English/Arabic language switching with RTL support, an accessible test-tone player, an empty legend, and an empty voice panel.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The first play click creates/resumes the Web Audio context and plays one test tone.

## Build and lint

```bash
npm run build
npm run lint
```

Dependencies are pinned to exact versions in `package.json`.

## Add a layer and voice

1. Add static JSON to `public/data/` following `LayerData` in `src/data/types.ts`.
2. Load it through `src/data/loaders.ts` and document its source, units, resolution, and credit line.
3. Implement a `Voice` under `src/audio/voices/` and register it with the engine.
4. Add a mapping row to `docs/SPEC.md` before connecting a Scientific preset.
5. Add a Fun preset only when the artistic interpretation label and alternative voice style are defined.

The preprocessing pipeline is intentionally offline and remains a stub in `scripts/preprocess.py`; do not add large NASA frame sets to this repository.
