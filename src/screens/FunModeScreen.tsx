import type { ObservationElement } from '../data/elements'
import type { Transport } from '../hooks/useTransport'
import { MAX_ELEMENTS } from '../lib/selection'
import { CombinedSonification } from '../components/fun/CombinedSonification'
import { ElementBubble } from '../components/fun/ElementBubble'
import { SynthesisPanel } from '../components/fun/SynthesisPanel'

interface FunModeScreenProps {
  elements: ObservationElement[]
  selected: ObservationElement[]
  transport: Transport
  duration: number
  volume: number
  onToggleElement: (id: string) => void
  onClear: () => void
  onVolume: (value: number) => void
  onPlayToggle: () => void
  onRestart: () => void
}

export function FunModeScreen({
  elements,
  selected,
  transport,
  duration,
  volume,
  onToggleElement,
  onClear,
  onVolume,
  onPlayToggle,
  onRestart,
}: FunModeScreenProps) {
  return (
    <main className="fun">
      <aside className="fun-aside" aria-label="Discovery mode and active synthesis">
        <div className="fun-head">
          <p className="eyebrow">Discovery Mode</p>
          <p className="fun-source mono">Aqua Satellite // MODIS</p>
          <h1>Discover the elements.</h1>
          <p className="lead">
            Explore individual components of this planetary observation. Select up to {MAX_ELEMENTS}{' '}
            elements to map their physical properties into a combined auditory experience.
          </p>
          <span
            className="live-field"
            title="Interface state for the prototype; no live NASA feed is connected."
          >
            <span className="status-dot" aria-hidden="true" />
            Live Observation Field
            <em className="live-field-tag mono">demo</em>
          </span>
        </div>

        <SynthesisPanel selected={selected} onRemove={onToggleElement} onClear={onClear} />
      </aside>

      <div className="fun-stage">
        <div className="stage-inner">
          <span className="stage-stars" aria-hidden="true" />
          <span className="stage-orbit stage-orbit--a" aria-hidden="true" />
          <span className="stage-orbit stage-orbit--b" aria-hidden="true" />
          <span className="earth-glow" aria-hidden="true" />
          <div
            className="earth"
            role="img"
            aria-label="Earth photographed in natural colour from space"
          >
            <img src="/images/earth-globe.jpg" alt="" />
            <span className="earth-limb" aria-hidden="true" />
          </div>

          {elements.map((element) => {
            const isSelected = selected.some((item) => item.id === element.id)
            return (
              <ElementBubble
                key={element.id}
                element={element}
                selected={isSelected}
                playing={transport.playing && isSelected}
                onToggle={onToggleElement}
              />
            )
          })}

          <p className="stage-credit mono">Earth imagery · NASA / Apollo 17 · public domain</p>
        </div>

        <CombinedSonification
          transport={transport}
          duration={duration}
          volume={volume}
          ready={selected.length > 0}
          selectedCount={selected.length}
          onVolume={onVolume}
          onToggle={onPlayToggle}
          onRestart={onRestart}
        />

        <p className="fun-note">
          Component categories and mappings are provisional design placeholders. Motion is an artistic
          interpretation, not a scientific process.
        </p>
      </div>
    </main>
  )
}
