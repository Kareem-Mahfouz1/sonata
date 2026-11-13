import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

interface AppIntroProps {
  onDone: () => void
}

const TITLE = 'EARTH JUKEBOX'

export function AppIntro({ onDone }: AppIntroProps) {
  const [leaving, setLeaving] = useState(false)
  const finished = useRef(false)
  const exitTimer = useRef(0)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setLeaving(true)
    exitTimer.current = window.setTimeout(onDone, 700)
  }, [onDone])

  useEffect(() => {
    const timer = window.setTimeout(finish, 2400)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(exitTimer.current)
    }
  }, [finish])

  return (
    <div
      className={`intro ${leaving ? 'is-leaving' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Enter the Earth Jukebox observatory"
      onClick={finish}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
          event.preventDefault()
          finish()
        }
      }}
    >
      <svg className="intro-rings" viewBox="-110 -110 220 220" aria-hidden="true">
        <circle r="100" fill="none" stroke="#29394D" />
        <g className="intro-orbit">
          <circle r="84" fill="none" stroke="#729BCB88" strokeDasharray="3 9" />
          <circle cx="84" r="5" fill="#78B9BC" />
        </g>
        <g className="intro-orbit intro-orbit--reverse">
          <circle r="62" fill="none" stroke="#A39BCB66" strokeDasharray="1 6" />
          <circle cy="-62" r="4" fill="#A39BCB" />
        </g>
        <circle r="30" fill="#729BCB" opacity=".9" />
        <circle className="intro-beacon" r="30" fill="none" stroke="#729BCB" strokeWidth="2" />
      </svg>

      <h1 className="intro-title hd" aria-label={TITLE}>
        {[...TITLE].map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            style={{ '--i': index } as CSSProperties}
            aria-hidden="true"
          >
            {letter === ' ' ? '\u00a0' : letter}
          </span>
        ))}
      </h1>
      <p className="mono">OBSERVATORY // SONIFICATION ENGINE</p>
      <small className="mono">click to skip</small>
    </div>
  )
}
