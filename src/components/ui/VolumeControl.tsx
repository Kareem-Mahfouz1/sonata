import { Icon } from './Icon'
import { Slider } from './Slider'

interface VolumeControlProps {
  volume: number
  onChange: (value: number) => void
}

export function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return (
    <div className="volume">
      <button
        type="button"
        className="icon-button"
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        aria-pressed={volume === 0}
        onClick={() => onChange(volume === 0 ? 0.7 : 0)}
      >
        <Icon name={volume === 0 ? 'volume-x' : 'volume'} size={18} />
      </button>
      <div className="volume-pop">
        <Slider
          label="Volume"
          min={0}
          max={100}
          step={1}
          value={Math.round(volume * 100)}
          onChange={(value) => onChange(value / 100)}
        />
      </div>
    </div>
  )
}
