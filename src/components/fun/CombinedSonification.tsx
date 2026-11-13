import type { CSSProperties } from 'react'
import type { Transport } from '../../hooks/useTransport'
import { formatTime } from '../../lib/selection'
import { Icon } from '../ui/Icon'
import { VolumeControl } from '../ui/VolumeControl'

interface CombinedSonificationProps {
  transport: Transport
  duration: number
  volume: number
  ready: boolean
  selectedCount: number
  onVolume: (value: number) => void
  onToggle: () => void
  onRestart: () => void
}

export function CombinedSonification({
  transport,
  duration,
  volume,
  ready,
  selectedCount,
  onVolume,
  onToggle,
  onRestart,
}: CombinedSonificationProps) {
  return (
    <section className="combined" aria-labelledby="combined-heading">
      <button
        type="button"
        className="combined-play"
        aria-label={transport.playing ? 'Pause combined sonification' : 'Play combined sonification'}
        aria-pressed={transport.playing}
        disabled={!ready}
        onClick={onToggle}
      >
        <Icon name={transport.playing ? 'pause' : 'play'} size={20} />
      </button>

      <div className="combined-copy">
        <h2 id="combined-heading" className="combined-title">
          Combined Sonification
        </h2>
        <p className="combined-sub mono">
          {ready
            ? `${selectedCount} signal${selectedCount === 1 ? '' : 's'} · prototype pad, not data sonification`
            : 'Select an element to begin'}
        </p>
      </div>

      <span className="combined-time mono" aria-label={`${formatTime(transport.progress)} of ${formatTime(duration)}`}>
        {formatTime(transport.progress)}
        <span className="combined-time-total"> / {formatTime(duration)}</span>
      </span>

      <span className={`equalizer ${transport.playing ? 'is-playing' : ''}`} aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            style={
              {
                '--eq-index': index,
                height: `${25 + ((index * 37) % 65)}%`,
              } as CSSProperties
            }
          />
        ))}
      </span>

      <button
        type="button"
        className="icon-button combined-restart"
        aria-label="Restart combined sonification"
        onClick={onRestart}
        disabled={!ready}
      >
        <Icon name="restart" size={16} />
      </button>

      <VolumeControl volume={volume} onChange={onVolume} />
    </section>
  )
}
