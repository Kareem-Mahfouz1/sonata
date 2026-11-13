import { useEffect, useMemo, useRef } from 'react'
import type { PointerEvent } from 'react'
import { getSonification } from '../../audio/sonification'
import { clamp } from '../../lib/selection'

interface WaveformProps {
  seed: number
  duration: number
  progress: number
  playing: boolean
  onSeek: (seconds: number) => void
}

const BAR_COUNT = 21

function generateBars(seed: number): number[] {
  let state = seed
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    state = (state * 1664525 + 1013904223) >>> 0
    const noise = state / 4294967296
    const envelope = 0.45 + 0.55 * Math.abs(Math.sin((index / BAR_COUNT) * Math.PI * 2.2 + seed))
    return Math.round((0.22 + noise * 0.78) * envelope * 100)
  })
}

export function Waveform({ seed, duration, progress, playing, onSeek }: WaveformProps) {
  const bars = useMemo(() => generateBars(seed), [seed])
  const barRefs = useRef<(HTMLElement | null)[]>([])
  const current = Math.min(BAR_COUNT - 1, Math.floor((progress / duration) * BAR_COUNT))

  useEffect(() => {
    const nodes = barRefs.current
    const paint = (value: number, index: number) => {
      const node = nodes[index]
      if (node) node.style.transform = `scaleY(${Math.min(1, Math.max(0.06, value)).toFixed(3)})`
    }

    if (!playing) {
      bars.forEach((height, index) => paint(height / 100, index))
      return
    }

    let frame = 0
    const tick = () => {
      const data = getSonification().spectrum()
      bars.forEach((height, index) => {
        paint((height / 100) * (0.45 + (data[index % 32] / 255) * 1.3), index)
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [bars, playing])

  function seek(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    onSeek(clamp((event.clientX - rect.left) / rect.width, 0, 1) * duration)
  }

  return (
    <div
      className="wave"
      role="slider"
      tabIndex={0}
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((progress / duration) * 100)}
      aria-valuetext={`${Math.round((progress / duration) * 100)} percent`}
      onPointerDown={seek}
      onKeyDown={(event) => {
        const step = duration * 0.05
        if (event.key === 'ArrowLeft') onSeek(clamp(progress - step, 0, duration))
        if (event.key === 'ArrowRight') onSeek(clamp(progress + step, 0, duration))
        if (event.key === 'Home') onSeek(0)
        if (event.key === 'End') onSeek(duration)
      }}
    >
      {bars.map((height, index) => (
        <i
          key={index}
          ref={(node) => {
            barRefs.current[index] = node
          }}
          className={index === current ? 'is-current' : ''}
          style={{ transform: `scaleY(${height / 100})` }}
        />
      ))}
    </div>
  )
}
