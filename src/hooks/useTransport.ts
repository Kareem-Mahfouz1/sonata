import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '../lib/selection'

export interface Transport {
  progress: number
  playing: boolean
  toggle: () => void
  pause: () => void
  restart: () => void
  seek: (seconds: number) => void
}

/** Representative transport for the prototype; it is not driven by audio analysis. */
export function useTransport(duration: number, initial = 0): Transport {
  const [progress, setProgress] = useState(initial)
  const [playing, setPlaying] = useState(false)
  const progressRef = useRef(initial)

  const update = useCallback((value: number) => {
    const next = clamp(value, 0, duration)
    progressRef.current = next
    setProgress(next)
  }, [duration])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = (now - last) / 1000
      last = now
      const next = Math.min(duration, progressRef.current + delta)
      progressRef.current = next
      setProgress(next)
      if (next >= duration) {
        setPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, duration])

  const pause = useCallback(() => setPlaying(false), [])

  const toggle = useCallback(() => {
    if (!playing && progressRef.current >= duration) update(0)
    setPlaying(!playing)
  }, [playing, duration, update])

  const restart = useCallback(() => {
    update(0)
    setPlaying(true)
  }, [update])

  const seek = useCallback((seconds: number) => update(seconds), [update])

  return { progress, playing, toggle, pause, restart, seek }
}
