import { useLayoutEffect, useRef, useState } from 'react'
import { Icon } from './ui/Icon'
import type { IconName } from './ui/Icon'
import type { Screen } from '../lib/screens'

interface NavRailProps {
  screen: Screen
  playing: boolean
  canListen: boolean
  onNavigate: (screen: Screen) => void
  onListen: () => void
}

const routes: { screen: Screen; icon: IconName; label: string }[] = [
  { screen: 'observatory', icon: 'planet', label: 'Earth Signals' },
  { screen: 'fun', icon: 'orbits', label: 'Fun Mode' },
]

export function NavRail({ screen, playing, canListen, onNavigate, onListen }: NavRailProps) {
  const itemsRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState(0)

  useLayoutEffect(() => {
    const active = itemsRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    if (active) setIndicator(active.offsetTop)
  }, [screen])

  useLayoutEffect(() => {
    const reposition = () => {
      const active = itemsRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
      if (active) setIndicator(active.offsetTop)
    }
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [])

  return (
    <nav className="rail" aria-label="Primary">
      <span className="rail-indicator" style={{ translate: `0 ${indicator}px` }} aria-hidden="true" />

      <button
        type="button"
        className="rail-brand"
        aria-label="Earth Jukebox home"
        onClick={() => onNavigate('observatory')}
      >
        <i className="rail-brand-core" />
        <b className="rail-brand-orbit" />
      </button>

      <div className="rail-items" ref={itemsRef}>
        {routes.map((route) => (
          <button
            key={route.screen}
            type="button"
            className={`rail-item ${screen === route.screen ? 'is-active' : ''}`}
            aria-label={route.label}
            aria-current={screen === route.screen ? 'page' : undefined}
            title={route.label}
            onClick={() => onNavigate(route.screen)}
          >
            <Icon name={route.icon} />
          </button>
        ))}

        <button
          type="button"
          className={`rail-item ${playing ? 'is-playing' : ''}`}
          aria-label={playing ? 'Pause sonification' : 'Listen to sonification'}
          aria-pressed={playing}
          title={canListen ? 'Listen' : 'Select an element to listen'}
          disabled={!canListen}
          onClick={onListen}
        >
          <Icon name="headphones" />
        </button>

        <button type="button" className="rail-item" aria-label="Signal" title="Signal" disabled>
          <Icon name="signal" />
        </button>
      </div>

      <div className="rail-foot">
        <span className="rail-tag mono" aria-hidden="true">
          SYS_ONLINE // V.1.04
        </span>
        <button type="button" className="rail-avatar" aria-label="Account">
          <img src="/images/earth-globe.jpg" alt="" />
        </button>
      </div>
    </nav>
  )
}
