import type { CSSProperties } from 'react'
import type { Mapping } from '../../data/observations'
import { Icon } from '../ui/Icon'

interface MappingPanelProps {
  mappings: Mapping[]
  playing: boolean
}

export function MappingPanel({ mappings, playing }: MappingPanelProps) {
  return (
    <div className="low-panel" data-reveal style={{ '--i': 1 } as CSSProperties}>
      <p className="lbl mono">
        <span>
          Data Mapping <em className="lbl-note">illustrative</em>
        </span>
        <Icon name="gear" size={14} />
      </p>
      <div className={`mapping ${playing ? 'is-playing' : ''}`}>
        {mappings.map((mapping) => (
          <div key={mapping.variable} className="mapping-row">
            <i style={{ background: mapping.color }} aria-hidden="true" />
            <span className="mapping-variable">{mapping.variable}</span>
            <span className="flow" aria-hidden="true" />
            <span className="mapping-pill mono">{mapping.destination}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
