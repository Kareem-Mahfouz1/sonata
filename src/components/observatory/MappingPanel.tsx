import type { Mapping } from '../../data/observations'
import { Icon } from '../ui/Icon'

interface MappingPanelProps {
  mappings: Mapping[]
}

export function MappingPanel({ mappings }: MappingPanelProps) {
  return (
    <section className="panel mapping-panel" aria-labelledby="mapping-heading">
      <div className="panel-head">
        <h2 id="mapping-heading" className="panel-label">
          Data Mapping
        </h2>
        <Icon name="sliders" size={15} />
      </div>
      <ul className="mapping-list">
        {mappings.map((mapping) => (
          <li key={mapping.variable} className="mapping-row">
            <span className="mapping-dot" style={{ background: mapping.color }} aria-hidden="true" />
            <span className="mapping-variable">{mapping.variable}</span>
            <span className="mapping-arrow" aria-hidden="true">
              <Icon name="arrow" size={14} />
            </span>
            <span className="mapping-destination">{mapping.destination}</span>
          </li>
        ))}
      </ul>
      <p className="panel-note">Mappings are illustrative until the sonification spec is approved.</p>
    </section>
  )
}
