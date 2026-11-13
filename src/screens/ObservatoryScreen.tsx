import { useEffect, useMemo, useState } from 'react'
import { earthJukeboxConfig, type EarthLayerId } from '../audio/earthJukebox/config'
import { AirQualityMap, type MapPoint } from '../components/observatory/AirQualityMap'
import { CairoSonification } from '../components/observatory/CairoSonification'
import { SceneStage } from '../components/observatory/SceneStage'
import { prefersReducedMotion } from '../lib/motion'
import { sceneForSelection, type LayerSelection } from '../visuals/scenes'

interface ObservatoryScreenProps {
  volume: number
  onVolume: (value: number) => void
  onProbe: (message: string) => void
  onRestart: () => void
}

function defaultSelection(): LayerSelection {
  return Object.fromEntries(
    earthJukeboxConfig.voices.map((voice) => [voice.id, voice.enabledByDefault]),
  ) as Record<EarthLayerId, boolean>
}

export function ObservatoryScreen({ volume, onVolume, onProbe, onRestart }: ObservatoryScreenProps) {
  const [point, setPoint] = useState<MapPoint>({ lat: 30.04, lon: 31.24, label: 'Cairo' })
  const [frame, setFrame] = useState(0)
  const [playRequest, setPlayRequest] = useState(0)
  const [selection, setSelection] = useState<LayerSelection>(defaultSelection)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion())
  const scene = useMemo(() => sceneForSelection(selection), [selection])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const onPlaying = (event: Event) => setPlaying(Boolean((event as CustomEvent<boolean>).detail))
    window.addEventListener('earth-jukebox:cairo-playing', onPlaying)
    return () => window.removeEventListener('earth-jukebox:cairo-playing', onPlaying)
  }, [])

  function choosePoint(next: MapPoint) {
    setPoint(next)
    setPlayRequest((value) => value + 1)
  }

  return (
    <section className={`screen observatory map-screen scene-${scene.key.replaceAll('+', '-')}`} aria-label="Air quality map and sonification">
      <SceneStage point={point} frame={frame} selection={selection} playing={playing}
        reducedMotion={reducedMotion} scene={scene} />
      <div className="scene-hud">
        <p className="scene-kicker mono">LIVE SCENE{scene.experimental ? ' · EXPERIMENTAL' : ''}</p>
        <h2 className="scene-name">{scene.name}</h2>
        <p className="scene-description">{scene.description}</p>
        <details className="scene-about">
          <summary>About this scene</summary>
          <p>Artistic rendering of the selected layers. Combinations are visual blends, not a scientific result. NOx is experimental and its night readings are unreliable. Null frames show the hatched no-data treatment.</p>
        </details>
      </div>
      <div className="map-workspace">
        <AirQualityMap frame={frame} point={point} onPoint={choosePoint} onAnnounce={onProbe} />
        <CairoSonification point={point} onPoint={choosePoint} onFrame={setFrame} playRequest={playRequest} onAnnounce={onProbe}
          volume={volume} onVolume={onVolume} onRestart={onRestart}
          selection={selection} onSelection={setSelection} />
      </div>
    </section>
  )
}
