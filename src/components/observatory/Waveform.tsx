import { useMemo } from 'react'
import { clamp } from '../../lib/selection'

interface WaveformProps {
  seed: number
  progress: number
  playing: boolean
  duration: number
  onSeek: (seconds: number) => void
}

function generateBars(seed: number, count: number): number[] {
  let state = seed
  return Array.from({ length: count }, (_, index) => {
    state = (state * 1664525 + 1013904223) >>> 0
    const noise = state / 4294967296
    const envelope = 0.4 + 0.6 * Math.abs(Math.sin((index / count) * Math.PI * 2.4 + seed))
    return Math.max(12, Math.round((0.22 + noise * 0.78) * envelope * 100))
  })
}

export function Waveform({ seed, progress, playing, duration, onSeek }: WaveformProps) {
  const bars = useMemo(() => generateBars(seed, 84), [seed])
  const percent = Math.round(progress * 100)

  function seekFromPointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const next = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    onSeek(next * duration)
  }

  return (
    <div
      className={`waveform ${playing ? 'is-playing' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      onPointerDown={seekFromPointer}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onSeek(clamp(progress - duration * 0.05, 0, duration))
        if (event.key === 'ArrowRight') onSeek(clamp(progress + duration * 0.05, 0, duration))
        if (event.key === 'Home') onSeek(0)
        if (event.key === 'End') onSeek(duration)
      }}
    >
      <span className="waveform-bars" aria-hidden="true">
        {bars.map((height, index) => (
          <span
            key={index}
            className={`waveform-bar ${index / bars.length <= progress ? 'is-played' : ''}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </span>
      <span
        className="waveform-playhead"
        aria-hidden="true"
        style={{ left: `${progress * 100}%` }}
      />
    </div>
  )
}
