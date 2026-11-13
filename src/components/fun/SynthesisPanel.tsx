import type { ObservationElement } from '../../data/elements'
import { MAX_ELEMENTS } from '../../lib/selection'
import { Icon } from '../ui/Icon'

interface SynthesisPanelProps {
  selected: ObservationElement[]
  onRemove: (id: string) => void
  onClear: () => void
}

export function SynthesisPanel({ selected, onRemove, onClear }: SynthesisPanelProps) {
  return (
    <section className="synthesis" aria-labelledby="synthesis-heading">
      <header className="synthesis-head">
        <div>
          <h2 id="synthesis-heading" className="panel-label">
            Active Synthesis
          </h2>
          <p className="synthesis-count mono">
            {selected.length} / {MAX_ELEMENTS} Elements selected
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={onClear}
          disabled={selected.length === 0}
        >
          Clear All
        </button>
      </header>

      {selected.length === 0 ? (
        <p className="synthesis-empty">
          Select an element orbiting Earth to add its signal. Up to {MAX_ELEMENTS} can be combined.
        </p>
      ) : (
        <ul className="synthesis-list">
          {selected.map((element) => (
            <li key={element.id} className="synthesis-row">
              <span
                className="synthesis-dot"
                style={{ background: element.color, color: element.light }}
                aria-hidden="true"
              />
              <span className="synthesis-copy">
                <span className="synthesis-name">{element.name}</span>
                <span className="synthesis-meta mono">{element.descriptor}</span>
              </span>
              <button
                type="button"
                className="icon-button synthesis-remove"
                aria-label={`Remove ${element.name}`}
                onClick={() => onRemove(element.id)}
              >
                <Icon name="close" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="panel-note">
        Provisional mappings · component names and categories are design placeholders, not verified
        chemical composition.
      </p>
    </section>
  )
}
