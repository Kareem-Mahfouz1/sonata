import type { CSSProperties } from 'react'
import type { ObservationElement } from '../data/elements'
import { MAX_ELEMENTS } from '../lib/selection'
import { ElementBubble } from '../components/fun/ElementBubble'
import { SignalLines } from '../components/fun/SignalLines'
import { SynthesisPanel } from '../components/fun/SynthesisPanel'

interface FunModeScreenProps {
  elements: ObservationElement[]
  selected: ObservationElement[]
  playing: boolean
  progress: number
  duration: number
  volume: number
  shake: number
  onToggleElement: (id: string) => void
  onClear: () => void
  onVolume: (value: number) => void
  onPlayToggle: () => void
}

const title = 'Discover the elements.'

export function FunModeScreen({
  elements,
  selected,
  playing,
  progress,
  duration,
  volume,
  shake,
  onToggleElement,
  onClear,
  onVolume,
  onPlayToggle,
}: FunModeScreenProps) {
  return (
    <section className="screen fun" aria-label="Discovery Mode">
      <div className="fun-head" data-reveal>
        <div className="fun-meta">
          <span className="badge mono">Discovery Mode</span>
          <span className="fun-source mono">AQUA SATELLITE // MODIS</span>
        </div>
        <h2 className="fun-title hd" aria-label={title}>
          {title.split(' ').map((word, index) => (
            <span key={word} style={{ '--i': index } as CSSProperties} aria-hidden="true">
              {word}
            </span>
          ))}
        </h2>
        <p className="fun-lead">
          Explore individual components of this planetary observation. Select up to {MAX_ELEMENTS}{' '}
          elements to map their physical properties into a combined auditory experience.
        </p>
      </div>

      <div className="live-field mono" data-reveal style={{ '--i': 1 } as CSSProperties}>
        <i aria-hidden="true" />
        Live Observation Field
        <em className="live-tag mono">demo</em>
      </div>

      <div
        className="earth"
        role="img"
        aria-label="Earth photographed in natural colour from space"
      >
        <img src="/images/earth-globe.jpg" alt="" draggable={false} />
        <span className="earth-clouds" aria-hidden="true" />
        <span className="earth-limb" aria-hidden="true" />
      </div>

      <SignalLines active={selected} />

      <div className="bubble-field">
        {elements.map((element, index) => (
          <ElementBubble
            key={element.id}
            element={element}
            index={index}
            selected={selected.some((item) => item.id === element.id)}
            playing={playing}
            onToggle={onToggleElement}
          />
        ))}
      </div>

      <SynthesisPanel
        selected={selected}
        playing={playing}
        progress={progress}
        duration={duration}
        volume={volume}
        shake={shake}
        onRemove={onToggleElement}
        onClear={onClear}
        onPlay={onPlayToggle}
        onVolume={onVolume}
      />

      <p className="fun-note mono">
        Component labels are illustrative placeholders, not processed observation results. Audio is a
        synthesized prototype. Earth imagery: NASA / Apollo 17.
      </p>
    </section>
  )
}
