import type { ExplorationMode, ObservationDataset } from '../data/observations'
import type { Transport } from '../hooks/useTransport'
import { AudioPanel } from '../components/observatory/AudioPanel'
import { DatasetList } from '../components/observatory/DatasetList'
import { ExplorationPanel } from '../components/observatory/ExplorationPanel'
import { MappingPanel } from '../components/observatory/MappingPanel'
import { ObservationView } from '../components/observatory/ObservationView'

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
  onProbe: (message: string) => void
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
  onProbe,
}: ObservatoryScreenProps) {
  return (
    <section className="screen observatory" aria-label="Earth Signals observation workspace">
      <DatasetList datasets={datasets} selectedId={dataset.id} onSelect={onDataset} />

      <div className="workspace">
        <ObservationView
          key={dataset.id}
          dataset={dataset}
          mode={mode}
          velocity={velocity}
          progress={transport.progress}
          duration={dataset.duration}
          onProbe={onProbe}
        />

        <div className="low">
          <ExplorationPanel
            mode={mode}
            velocity={velocity}
            onMode={onMode}
            onVelocity={onVelocity}
          />
          <MappingPanel mappings={dataset.mappings} playing={transport.playing} />
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
      </div>
    </section>
  )
}
