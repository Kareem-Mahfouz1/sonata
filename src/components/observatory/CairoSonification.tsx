import { useEffect, useRef, useState } from 'react'
import type { CairoAudio } from '../../audio/earthJukebox/engine'
import { earthJukeboxConfig, type EarthLayerId } from '../../audio/earthJukebox/config'
import { describeState, TIMING_LABEL, type LayerState } from '../../audio/earthJukebox/state'
import { Icon } from '../ui/Icon'
import { PlayButton } from '../ui/PlayButton'
import { VolumeControl } from '../ui/VolumeControl'

const TOTAL_FRAMES = 301

export function CairoSonification({ onAnnounce, volume, onVolume, onRestart }: { onAnnounce: (message: string) => void; volume: number; onVolume: (value: number) => void; onRestart: () => void }) {
  const [audio, setAudio] = useState<CairoAudio | null>(null)
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(0)
  const [speed, setSpeed] = useState(earthJukeboxConfig.speed.default)
  const [states, setStates] = useState<LayerState>({ o3: null, pm25: null, nox: null })
  const [enabled, setEnabled] = useState<Record<EarthLayerId, boolean>>(() => Object.fromEntries(
    earthJukeboxConfig.voices.map((voice) => [voice.id, voice.enabledByDefault]),
  ) as Record<EarthLayerId, boolean>)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<CairoAudio | null>(null)
  const clockRef = useRef({ start: 0, frame: 0 })

  const toggleRef = useRef<() => void>(() => undefined)
  useEffect(() => { toggleRef.current = () => { void toggle() } })

  useEffect(() => {
    const toggle = () => toggleRef.current()
    const stop = () => { audioRef.current?.pause(); setPlaying(false); window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: false })) }
    const restart = () => { clockRef.current = { start: performance.now(), frame: 0 }; audioRef.current?.seek(0); setFrame(0); setStates(audioRef.current?.states() ?? states) }
    window.addEventListener('earth-jukebox:cairo-toggle', toggle)
    window.addEventListener('earth-jukebox:cairo-stop', stop)
    window.addEventListener('earth-jukebox:cairo-restart', restart)
    return () => {
      window.removeEventListener('earth-jukebox:cairo-toggle', toggle)
      window.removeEventListener('earth-jukebox:cairo-stop', stop)
      window.removeEventListener('earth-jukebox:cairo-restart', restart)
    }
  }, [states])

  useEffect(() => () => audioRef.current?.dispose(), [])

  async function ensureAudio(): Promise<CairoAudio> {
    if (audioRef.current) return audioRef.current
    setLoading(true)
    try {
      const { createCairoAudio } = await import('../../audio/earthJukebox/engine')
      const next = await createCairoAudio()
      audioRef.current = next
      next.seek(frame)
      next.setVolume(volume)
      next.subscribe((nextStates) => { setStates(nextStates); setFrame(next.frame()) })
      setAudio(next)
      return next
    } finally { setLoading(false) }
  }

  async function toggle() {
    const next = await ensureAudio()
    if (playing) { next.pause(); setPlaying(false); onAnnounce('Cairo sonification paused.'); window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: false })) }
    else { clockRef.current = { start: performance.now(), frame }; next.seek(frame); await next.play(); setPlaying(true); setStates(next.states()); onAnnounce('Cairo sonification playing.'); window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: true })) }
  }

  function seek(nextFrame: number) {
    if (playing) clockRef.current = { start: performance.now(), frame: nextFrame }
    setFrame(nextFrame)
    audioRef.current?.seek(nextFrame)
    if (audioRef.current) setStates(audioRef.current.states())
  }

  function toggleLayer(id: EarthLayerId) {
    const next = !enabled[id]
    setEnabled((current) => ({ ...current, [id]: next }))
    audio?.setEnabled(id, next)
    const voice = earthJukeboxConfig.voices.find((item) => item.id === id)!
    onAnnounce(`${voice.label} ${next ? 'on' : 'off'}.`)
  }

  useEffect(() => {
    if (!audio || !playing) return
    const interval = setInterval(() => {
      const elapsed = (performance.now() - clockRef.current.start) / 1000
      const next = clockRef.current.frame + elapsed / (earthJukeboxConfig.sweepSeconds / speed) * TOTAL_FRAMES
      if (next >= TOTAL_FRAMES - 1) {
        setFrame(TOTAL_FRAMES - 1); audio.seek(TOTAL_FRAMES - 1); setStates(audio.states())
        audio.pause(); setPlaying(false)
        window.dispatchEvent(new CustomEvent('earth-jukebox:cairo-playing', { detail: false }))
        return
      }
      const nextFrame = Math.floor(next)
      setFrame(nextFrame); audio.seek(nextFrame); setStates(audio.states())
    }, 50)
    return () => clearInterval(interval)
  }, [audio, playing, speed])

  return (
    <div className="low-panel audio-panel cairo-audio" aria-label="Cairo air-quality sonification">
      <p className="lbl mono"><span>Cairo air quality</span><span className="lbl-note">Frame {frame + 1}/{TOTAL_FRAMES}</span></p>
      <div className="cairo-voices">
        {earthJukeboxConfig.voices.map((voice) => {
          const value = states[voice.id]
          return (
            <button key={voice.id} type="button" className={`cairo-voice ${enabled[voice.id] ? 'is-on' : ''} ${value === null ? 'is-null' : ''}`}
              aria-pressed={enabled[voice.id]} aria-label={`${voice.label} voice ${enabled[voice.id] ? 'on' : 'off'}`}
              onClick={() => toggleLayer(voice.id)}>
              <b>{voice.shortLabel}</b>
              <span>{value === null ? 'No reading' : 'Level'}</span>
            </button>
          )
        })}
      </div>
      <label className="cairo-scrub mono">
        <input className="slider" type="range" min={0} max={TOTAL_FRAMES - 1} step={1} value={frame}
          aria-label="Scrub Cairo time series" onChange={(event) => seek(Number(event.target.value))} />
      </label>
      <div className="ctl mono">
        <button type="button" className="ico" aria-label="Restart Cairo playback" onClick={() => { seek(0); onRestart() }}><Icon name="restart" /></button>
        <label className="cairo-speed">
          Speed
          <input type="range" className="slider" min={earthJukeboxConfig.speed.min} max={earthJukeboxConfig.speed.max}
            step={earthJukeboxConfig.speed.step} value={speed} aria-label="Playback speed"
            onChange={(event) => { const value = Number(event.target.value); setSpeed(value); clockRef.current = { start: performance.now(), frame } }} />
          {speed}×
        </label>
        <span className="low-spacer" />
        <PlayButton playing={playing} disabled={loading} label={playing ? 'Pause Cairo sonification' : 'Play Cairo sonification'} onClick={() => void toggle()} />
        <VolumeControl volume={volume} onChange={(value) => { onVolume(value); audioRef.current?.setVolume(value) }} />
      </div>
      <p className="cairo-timing mono">{TIMING_LABEL}</p>
      <p className="live-region" role="status" aria-live="polite">{describeState(states)}</p>
    </div>
  )
}
