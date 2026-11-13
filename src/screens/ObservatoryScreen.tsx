import { useState } from 'react'
import { announce } from '../a11y/liveRegion'
import type { ExplorationMode, ObservationDataset } from '../data/observations'
import type { Transport } from '../hooks/useTransport'
import { Icon } from '../components/ui/Icon'
import { AudioPanel } from '../components/observatory/AudioPanel'
import { DatasetList } from '../components/observatory/DatasetList'
import { ExplorationPanel } from '../components/observatory/ExplorationPanel'
import { MappingPanel } from '../components/observatory/MappingPanel'
import { ObservationViewer } from '../components/observatory/ObservationViewer'

interface ObservatoryScreenProps {
  datasets: ObservationDataset[]
  dataset: ObservationDataset
  mode: ExplorationMode
  velocity: number
  transport: Transport
  volume: number
  onDataset: (id: string) => void
  onMode: (mode: ExplorationMode) => void
  onVelocity: (value: number) => void
  onVolume: (value: number) => void
  onPlayToggle: () => void
  onRestart: () => void
}

export function ObservatoryScreen({
  datasets,
  dataset,
  mode,
  velocity,
  transport,
  volume,
  onDataset,
  onMode,
  onVelocity,
  onVolume,
  onPlayToggle,
  onRestart,
}: ObservatoryScreenProps) {
  const [focus, setFocus] = useState(false)

  return (
    <div className={`observatory ${focus ? 'is-focus' : ''}`}>
      <aside className="sidebar" aria-label="Dataset discovery">
        <DatasetList datasets={datasets} selectedId={dataset.id} onSelect={onDataset} />
      </aside>

      <section className="workspace" aria-label="Observation workspace">
        <header className="topbar">
          <div className="topbar-left">
            <span className="code-pill">
              <Icon name="database" size={13} />
              {dataset.code}
            </span>
            <span className="coords mono">
              LAT: {dataset.lat} <span className="coords-sep">·</span> LNG: {dataset.lng}
            </span>
          </div>
          <button
            type="button"
            className={`ghost-button focus-button ${focus ? 'is-active' : ''}`}
            aria-pressed={focus}
            onClick={() => {
              setFocus((current) => !current)
              announce(focus ? 'Focus Mode off. Dataset list restored.' : 'Focus Mode on. Dataset list hidden.')
            }}
          >
            <Icon name="maximize" size={14} />
            Focus Mode
          </button>
        </header>

        <div className="stage">
          <ObservationViewer
            key={dataset.id}
            dataset={dataset}
            mode={mode}
            velocity={velocity}
            onProbe={(label) => announce(`Probe locked. ${label}`)}
          />
        </div>

        <div className="panels">
          <ExplorationPanel
            mode={mode}
            velocity={velocity}
            onMode={onMode}
            onVelocity={onVelocity}
          />
          <MappingPanel mappings={dataset.mappings} />
          <AudioPanel
            transport={transport}
            duration={dataset.duration}
            seed={dataset.waveSeed}
            volume={volume}
            onVolume={onVolume}
            onToggle={onPlayToggle}
            onRestart={onRestart}
          />
        </div>
      </section>
    </div>
  )
}
