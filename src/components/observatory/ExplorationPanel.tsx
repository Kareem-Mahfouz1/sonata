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
    <section className="panel exploration-panel" aria-labelledby="exploration-heading">
      <h2 id="exploration-heading" className="panel-label">
        Exploration Mode
      </h2>
      <SegmentedControl
        label="Exploration mode"
        value={mode}
        options={options}
        onChange={onMode}
      />
      <div className="panel-slider">
        <Slider
          label={labels[mode].name}
          min={0.5}
          max={3}
          step={0.1}
          value={velocity}
          onChange={onVelocity}
        />
        <div className="range-meta">
          <span>{labels[mode].name}</span>
          <span className="mono">
            {velocity.toFixed(1)}
            {labels[mode].suffix}
          </span>
        </div>
      </div>
    </section>
  )
}
