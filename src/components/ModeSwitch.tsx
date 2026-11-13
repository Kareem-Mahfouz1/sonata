import type { AudioMode } from '../audio/presets/types'

interface ModeSwitchProps {
  mode: AudioMode
  onChange: (mode: AudioMode) => void
  labels: { scientific: string; fun: string }
}

export function ModeSwitch({ mode, onChange, labels }: ModeSwitchProps) {
  return (
    <div className="segmented-control" aria-label="Playback mode">
      {(['scientific', 'fun'] as const).map((option) => (
        <button key={option} className={mode === option ? 'is-selected' : ''} type="button" aria-pressed={mode === option} onClick={() => onChange(option)}>
          {labels[option]}
        </button>
      ))}
    </div>
  )
}
