import { Icon } from './ui/Icon'
import type { Screen } from '../lib/screens'

interface NavRailProps {
  screen: Screen
  playing: boolean
  canListen: boolean
  onNavigate: (screen: Screen) => void
  onListen: () => void
}

const destinations: { screen: Screen; icon: 'orbit' | 'activity'; label: string }[] = [
  { screen: 'observatory', icon: 'orbit', label: 'Earth Signals' },
  { screen: 'fun', icon: 'activity', label: 'Discover the elements' },
]

export function NavRail({ screen, playing, canListen, onNavigate, onListen }: NavRailProps) {
  return (
    <nav className="rail" aria-label="Primary">
      <button
        type="button"
        className="rail-brand"
        aria-label="Earth Jukebox home"
        onClick={() => onNavigate('observatory')}
      >
        <span className="rail-brand-dot" aria-hidden="true" />
      </button>

      <div className="rail-items">
        {destinations.map((destination) => (
          <button
            key={destination.screen}
            type="button"
            className={`rail-item ${screen === destination.screen ? 'is-active' : ''}`}
            aria-label={destination.label}
            aria-current={screen === destination.screen ? 'page' : undefined}
            data-tip={destination.label}
            onClick={() => onNavigate(destination.screen)}
          >
            <Icon name={destination.icon} size={19} />
          </button>
        ))}
        <button
          type="button"
          className={`rail-item rail-listen ${playing ? 'is-playing' : ''}`}
          aria-label={playing ? 'Pause combined sonification' : 'Listen to sonification'}
          aria-pressed={playing}
          disabled={!canListen}
          data-tip={canListen ? 'Listen' : 'Select elements to listen'}
          onClick={onListen}
        >
          <Icon name="headphones" size={19} />
        </button>
      </div>

      <div className="rail-foot">
        <span className="rail-tag" aria-hidden="true">SYNTH // v4.6</span>
        <button type="button" className="rail-avatar" aria-label="Account">
          <img src="/images/earth-globe.jpg" alt="" />
        </button>
      </div>
    </nav>
  )
}
