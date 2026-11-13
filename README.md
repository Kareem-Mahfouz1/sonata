# Earth Jukebox

A React + TypeScript + Vite product prototype for turning NASA Earth observation imagery into sound. "Hear the planet differently."

Two screens, both desktop-first at the reference size of 1670 × 892:

- **Earth Signals — Observatory Workspace** (`/`)
- **Fun Mode — Discover the Elements** (`/?screen=fun`)

## Run

```bash
npm install
npm run dev
```

## Build, lint, test

```bash
npm run build
npm run lint
npm test
```

`npm test` covers the selection cap, time formatting and range maths in `src/lib/selection.ts`.

## What is real and what is a prototype

- **Audio is generated in the browser.** A small Web Audio pad stands in for sonification and is labelled "prototype" in the UI. It is not driven by data, and the waveform/equaliser are representative, not analysed from the audio.
- **No live NASA feed is connected.** "Live Feed" and "Live Observation Field" describe interface state and are marked demo.
- **Dataset names, coordinates, resolutions, mappings and component categories are design placeholders** for a future data and sonification pipeline. They are not validated NASA integrations or confirmed chemical composition.
- **Motion is an artistic interpretation.** Bubble movement, scan sweeps and time offsets do not represent real scientific processes.

## Imagery

Public-domain NASA imagery in `public/images/`:

- `earth-globe.jpg` — Earth, Apollo 17 (NASA).
- `ocean-clouds.jpg`, `atlantic-clouds.jpg` — cloud imagery, NASA Earth Observatory.
- `earth-iss.jpg` — night-side Earth, ISS Crew Earth Observations (NASA).

NASA does not endorse this prototype; the NASA logo is not used.

## Structure

- `src/App.tsx` — screen routing, selection cap, transport and audio lifecycle, live announcements.
- `src/screens/` — `ObservatoryScreen`, `FunModeScreen`.
- `src/components/observatory/` — dataset list, observation viewer (scan/probe/time overlays), exploration, mapping, audio panel, waveform.
- `src/components/fun/` — element bubbles, active synthesis, combined sonification.
- `src/components/ui/` — icon set, slider, volume, segmented control.
- `src/data/observations.ts`, `src/data/elements.ts` — placeholder content and provisional mappings.
- `src/hooks/useTransport.ts` — representative playback clock.
- `src/audio/ambient.ts` — generated prototype pad, created only after a user gesture.
- `src/styles/tokens.css`, `src/index.css`, `src/App.css` — tokens, reset, layout, states and motion.
- `docs/SPEC.md` — original scaffold spec for the scientific/artistic audio architecture.

## Accessibility

Semantic buttons and labels, visible focus rings, `aria-pressed`/`aria-current` states, live-region announcements, no autoplay, mute and pause controls, meanings never carried by colour alone (labels, check marks, categories), and a global `prefers-reduced-motion` override.

## Known gaps

- The Fun Mode reference screenshot was never supplied, so that screen follows the written brief and is an assumption-based composition.
- No Figma file was produced or edited; this repository is the deliverable.
- The scaffold's English/Arabic switcher is not wired into the new screens; its i18n modules remain in `src/i18n/` for the next pass.
- Export to WAV, real dataset loading and real sonification remain unimplemented, as described in `docs/SPEC.md`.
