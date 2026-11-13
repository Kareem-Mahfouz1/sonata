import type { CSSProperties } from 'react'
import type { Transport } from '../../hooks/useTransport'
import { formatTime } from '../../lib/selection'
import { Icon } from '../ui/Icon'
import { PlayButton } from '../ui/PlayButton'
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
    <div className="low-panel audio-panel" data-reveal style={{ '--i': 2 } as CSSProperties}>
      <p className="lbl mono">
        <span>Sonification</span>
        <span className="lbl-note">Prototype audio</span>
      </p>
      <Waveform
        seed={seed}
        duration={duration}
        progress={transport.progress}
        playing={transport.playing}
        onSeek={transport.seek}
      />
      <div className="ctl mono">
        <span className="ctl-time">
          {formatTime(transport.progress)} / {formatTime(duration)}
        </span>
        <button type="button" className="ico" aria-label="Restart playback" onClick={onRestart}>
          <Icon name="restart" />
        </button>
        <PlayButton
          playing={transport.playing}
          label={transport.playing ? 'Pause playback' : 'Play playback'}
          onClick={onToggle}
        />
        <VolumeControl volume={volume} onChange={onVolume} />
      </div>
    </div>
  )
}
