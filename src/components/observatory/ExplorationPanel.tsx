import type { CSSProperties } from 'react'
import type { ExplorationMode } from '../../data/observations'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Slider } from '../ui/Slider'

interface ExplorationPanelProps {
  mode: ExplorationMode
  velocity: number
  onMode: (mode: ExplorationMode) => void
  onVelocity: (value: number) => void
}

const options: { value: ExplorationMode; label: string }[] = [
  { value: 'probe', label: 'Probe' },
  { value: 'scan', label: 'Scan' },
  { value: 'time', label: 'Time' },
]

const labels: Record<ExplorationMode, { name: string; suffix: string }> = {
  probe: { name: 'Probe Dwell', suffix: 's' },
  scan: { name: 'Scan Velocity', suffix: 'x' },
  time: { name: 'Time Rate', suffix: 'x' },
}

export function ExplorationPanel({ mode, velocity, onMode, onVelocity }: ExplorationPanelProps) {
  return (
    <div className="low-panel" data-reveal style={{ '--i': 0 } as CSSProperties}>
      <p className="lbl mono">Exploration Mode</p>
      <SegmentedControl label="Exploration mode" value={mode} options={options} onChange={onMode} />
      <div className="low-spacer" />
      <div className="lbl mono">
        <span>{labels[mode].name}</span>
        <span className="lbl-value">
          {velocity.toFixed(1)}
          {labels[mode].suffix}
        </span>
      </div>
      <Slider
        label={labels[mode].name}
        min={0.5}
        max={3}
        step={0.1}
        value={velocity}
        onChange={onVelocity}
      />
    </div>
  )
}
