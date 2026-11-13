import type { Transport } from '../../hooks/useTransport'
import { formatTime } from '../../lib/selection'
import { Icon } from '../ui/Icon'
import { VolumeControl } from '../ui/VolumeControl'
import { Waveform } from './Waveform'

interface AudioPanelProps {
  transport: Transport
  duration: number
  seed: number
  volume: number
  onVolume: (value: number) => void
  onToggle: () => void
  onRestart: () => void
}

export function AudioPanel({
  transport,
  duration,
  seed,
  volume,
  onVolume,
  onToggle,
  onRestart,
}: AudioPanelProps) {
  return (
    <section className="panel audio-panel" aria-labelledby="audio-heading">
      <h2 id="audio-heading" className="sr-only">
        Audio signal and playback
      </h2>
      <span className="panel-tag">Prototype</span>
      <Waveform
        seed={seed}
        progress={transport.progress}
        playing={transport.playing}
        duration={duration}
        onSeek={transport.seek}
      />
      <div className="transport">
        <div className="timecode" aria-label={`${formatTime(transport.progress)} of ${formatTime(duration)}`}>
          <span>{formatTime(transport.progress)}</span>
          <span className="timecode-total">/ {formatTime(duration)}</span>
        </div>
        <button
          type="button"
          className="icon-button transport-restart"
          aria-label="Restart playback"
          onClick={onRestart}
        >
          <Icon name="restart" size={17} />
        </button>
        <button
          type="button"
          className="play-button"
          aria-label={transport.playing ? 'Pause' : 'Play'}
          aria-pressed={transport.playing}
          onClick={onToggle}
        >
          <Icon name={transport.playing ? 'pause' : 'play'} size={22} />
        </button>
        <VolumeControl volume={volume} onChange={onVolume} />
      </div>
    </section>
  )
}
