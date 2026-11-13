import { useEffect, useRef, useState } from 'react'
import type { CairoAudio } from '../../audio/earthJukebox/engine'
import { earthJukeboxConfig, type EarthLayerId } from '../../audio/earthJukebox/config'
import { describeState, TIMING_LABEL } from '../../audio/earthJukebox/state'
import type { SeriesResult } from '../../data/airQuality/types.ts'
import { getSeries } from '../../data/loaders.ts'
import { presetPoints, type PresetPoint } from '../../data/airQuality/presetList'
import type { MapPoint } from './AirQualityMap'
import { Icon } from '../ui/Icon'
import { PlayButton } from '../ui/PlayButton'
import { VolumeControl } from '../ui/VolumeControl'

const LAYERS: EarthLayerId[] = ['o3', 'pm25', 'nox']
const STORY_SECONDS = 20

interface Props {
  point: MapPoint
  onPoint: (point: MapPoint) => void
  onFrame: (frame: number) => void
  playRequest: number
  onAnnounce: (message: string) => void
  volume: number
  onVolume: (value: number) => void
  onRestart: () => void
}

export function CairoSonification({ point, onPoint, onFrame, playRequest, onAnnounce, volume, onVolume, onRestart }: Props) {
  const [series, setSeries] = useState<Partial<Record<EarthLayerId, SeriesResult>>>({})
  const [playing, setPlaying] = useState(false)
  const [story, setStory] = useState(false)
  const [frame, setFrame] = useState(0)
  const [speed, setSpeed] = useState(earthJukeboxConfig.speed.default)
  const [enabled, setEnabled] = useState<Record<EarthLayerId, boolean>>(() => Object.fromEntries(
    earthJukeboxConfig.voices.map((voice) => [voice.id, voice.enabledByDefault]),
  ) as Record<EarthLayerId, boolean>)
  const audioRef = useRef<CairoAudio | null>(null)
  const clockRef = useRef({ start: 0, frame: 0 })
  const storyToken = useRef(0)
  const storyDriven = useRef(false)
  const pendingPlay = useRef(false)
  const pointRef = useRef(point)
  pointRef.current = point
  const total = series.pm25?.values.length ?? 301
  const states = Object.fromEntries(LAYERS.map((id) => [id, series[id]?.values[frame] ?? null])) as Record<EarthLayerId, number | null>

  async function load(point: MapPoint) {
    const results = await Promise.all(LAYERS.map((id) => getSeries(point.lat, point.lon, id)))
    const next: Partial<Record<EarthLayerId, SeriesResult>> = {}
    LAYERS.forEach((id, index) => { next[id] = results[index] })
    return next
  }

  useEffect(() => {
    let cancelled = false
    if (storyDriven.current) {
      storyDriven.current = false
      load(point).then((next) => { if (!cancelled) setSeries(next) })
      return () => { cancelled = true }
    }
    storyToken.current += 1
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new location resets transport state
    setStory(false)
    audioRef.current?.dispose(); audioRef.current = null
    setPlaying(false); setFrame(0); onFrame(0)
    load(point).then((next) => {
      if (cancelled) return
      setSeries(next)
      if (pendingPlay.current) { pendingPlay.current = false; void startAt(0, next) }
    }).catch(() => { if (!cancelled) onAnnounce('Data unavailable for this location.') })
    return () => { cancelled = true }
  }, [point.lat, point.lon]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => audioRef.current?.dispose(), [])

  useEffect(() => {
    if (playRequest <= 0) return
    if (series.pm25) { pendingPlay.current = false; void startAt(0) }
    else pendingPlay.current = true
  }, [playRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureAudio(nextSeries = series): Promise<CairoAudio> {
    if (audioRef.current) return audioRef.current
    const { createAudio } = await import('../../audio/earthJukebox/engine')
    const next = await createAudio(nextSeries)
    audioRef.current = next
    next.setVolume(volume)
    LAYERS.forEach((id) => next.setEnabled(id, enabled[id]))
    return next
  }

  async function startAt(nextFrame: number, nextSeries = series, at = nextFrame) {
    const next = await ensureAudio(nextSeries)
    clockRef.current = { start: performance.now(), frame: at }
    next.seek(at); setFrame(at); onFrame(at)
    await next.play(); setPlaying(true)
    window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: true }))
  }

  async function toggle() {
    if (playing) {
      stopStory()
      onAnnounce('Sonification paused.')
      return
    }
    await startAt(frame)
    onAnnounce('Sonification playing.')
  }

  function stopStory() {
    storyToken.current += 1
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new location resets transport state
    setStory(false)
    audioRef.current?.pause(); setPlaying(false)
    window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: false }))
  }

  async function playStory() {
    stopStory()
    pendingPlay.current = false
    const token = ++storyToken.current
    setStory(true)
    for (const preset of presetPoints) {
      if (storyToken.current !== token) return
      const nextPoint: MapPoint = { lat: preset.lat, lon: preset.lon, label: preset.label }
      storyDriven.current = true
      onPoint(nextPoint)
      onAnnounce(`Story: ${preset.label}. ${preset.evidence}`)
      const nextSeries = await load(nextPoint)
      if (storyToken.current !== token) return
      setSeries(nextSeries)
      audioRef.current?.dispose(); audioRef.current = null
      await startAt(0, nextSeries)
      await new Promise((resolve) => setTimeout(resolve, STORY_SECONDS * 1000))
      if (storyToken.current !== token) return
    }
    audioRef.current?.pause(); setPlaying(false); setStory(false)
    window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: false }))
    onAnnounce('Story finished. Cairo, Fort Nelson, Aswan.')
  }

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      const elapsed = (performance.now() - clockRef.current.start) / 1000
      const next = clockRef.current.frame + elapsed / (earthJukeboxConfig.sweepSeconds / speed) * total
      if (next >= total - 1) {
        setFrame(total - 1); onFrame(total - 1); audioRef.current?.seek(total - 1)
        audioRef.current?.pause(); setPlaying(false)
        window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: false }))
        return
      }
      const nextFrame = Math.floor(next)
      setFrame(nextFrame); onFrame(nextFrame); audioRef.current?.seek(nextFrame)
    }, 50)
    return () => clearInterval(interval)
  }, [playing, speed, total, onFrame])

  useEffect(() => {
    const stop = () => { stopStory() }
    const toggleEvent = () => { if (playing) stopStory(); else void toggle() }
    const restart = () => { seek(0); onRestart() }
    window.addEventListener('earth-jukebox:cairo-stop', stop)
    window.addEventListener('earth-jukebox:cairo-toggle', toggleEvent)
    window.addEventListener('earth-jukebox:cairo-restart', restart)
    return () => {
      window.removeEventListener('earth-jukebox:cairo-stop', stop)
      window.removeEventListener('earth-jukebox:cairo-toggle', toggleEvent)
      window.removeEventListener('earth-jukebox:cairo-restart', restart)
    }
  })

  function seek(nextFrame: number) {
    if (playing && !story) clockRef.current = { start: performance.now(), frame: nextFrame }
    setFrame(nextFrame); onFrame(nextFrame); audioRef.current?.seek(nextFrame)
  }

  function selectPreset(preset: PresetPoint) {
    stopStory()
    onPoint({ lat: preset.lat, lon: preset.lon, label: preset.label })
  }

  function toggleLayer(id: EarthLayerId) {
    const next = !enabled[id]
    setEnabled((current) => ({ ...current, [id]: next }))
    audioRef.current?.setEnabled(id, next)
    const voice = earthJukeboxConfig.voices.find((item) => item.id === id)!
    onAnnounce(`${voice.label} ${next ? 'on' : 'off'}${id === 'nox' ? ' (experimental)' : ''}.`)
  }

  const currentPreset = presetPoints.find((preset) => Math.abs(preset.lat - point.lat) < 1e-9 && Math.abs(preset.lon - point.lon) < 1e-9)

  return (
    <div className="low-panel audio-panel cairo-audio" aria-label="Air-quality sonification">
      <p className="lbl mono"><span>Sonification</span><span className="lbl-note">F{frame + 1} · {series.pm25?.source === 'detailed' ? 'fine PM2.5' : 'regional'}</span></p>
      <div className="preset-row" role="group" aria-label="Preset locations">
        {presetPoints.map((preset) => (
          <button key={preset.id} type="button" className={`preset-btn ${currentPreset?.id === preset.id ? 'is-active' : ''}`}
            aria-pressed={currentPreset?.id === preset.id} title={preset.evidence} onClick={() => selectPreset(preset)}>
            {preset.label}
          </button>
        ))}
        <button type="button" className={`preset-btn story-btn ${story ? 'is-active' : ''}`} aria-pressed={story}
          onClick={() => { if (story) stopStory(); else void playStory() }}>Play story</button>
      </div>
      <div className="cairo-voices">
        {earthJukeboxConfig.voices.map((voice) => {
          const value = states[voice.id]
          const source = series[voice.id]?.source
          return (
            <button key={voice.id} type="button" className={`cairo-voice ${enabled[voice.id] ? 'is-on' : ''} ${value === null ? 'is-null' : ''}`}
              aria-pressed={enabled[voice.id]} aria-label={`${voice.label} ${voice.id === 'nox' ? 'experimental ' : ''}voice ${enabled[voice.id] ? 'on' : 'off'}`}
              onClick={() => toggleLayer(voice.id)}>
              <b>{voice.shortLabel}{voice.id === 'nox' ? ' · exp' : ''}</b>
              <span>{value === null ? 'No reading' : source === 'detailed' ? 'Detailed' : 'Regional'}</span>
            </button>
          )
        })}
      </div>
      <label className="cairo-scrub mono">
        <input className="slider" type="range" min={0} max={total - 1} step={1} value={frame}
          aria-label="Scrub time series" onChange={(event) => seek(Number(event.target.value))} />
      </label>
      <div className="ctl mono">
        <button type="button" className="ico" aria-label="Restart playback" onClick={() => { seek(0); onRestart() }}><Icon name="restart" /></button>
        <label className="cairo-speed">Speed
          <input type="range" className="slider" min={earthJukeboxConfig.speed.min} max={earthJukeboxConfig.speed.max}
            step={earthJukeboxConfig.speed.step} value={speed} aria-label="Playback speed"
            onChange={(event) => { const value = Number(event.target.value); setSpeed(value); clockRef.current = { start: performance.now(), frame } }} />
          {speed}×
        </label>
        <span className="low-spacer" />
        <PlayButton playing={playing} label={playing ? 'Pause sonification' : 'Play sonification'} onClick={() => void toggle()} />
        <VolumeControl volume={volume} onChange={(value) => { onVolume(value); audioRef.current?.setVolume(value) }} />
      </div>
      <p className="cairo-timing mono">{TIMING_LABEL}</p>
      <p className="live-region" role="status" aria-live="polite">{describeState(states)}</p>
    </div>
  )
}
