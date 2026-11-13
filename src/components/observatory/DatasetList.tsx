import { useMemo, useState } from 'react'
import type { ObservationDataset } from '../../data/observations'
import { Icon } from '../ui/Icon'

interface DatasetListProps {
  datasets: ObservationDataset[]
  selectedId: string
  onSelect: (id: string) => void
}

export function DatasetList({ datasets, selectedId, onSelect }: DatasetListProps) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return datasets
    return datasets.filter(
      (dataset) =>
        dataset.name.toLowerCase().includes(needle) ||
        dataset.subtitle.toLowerCase().includes(needle) ||
        dataset.code.toLowerCase().includes(needle),
    )
  }, [datasets, query])

  return (
    <>
      <header className="sidebar-head">
        <h1>Earth Signals</h1>
        <p>
          Discover patterns in planetary data through sound. Select an observation dataset to begin
          sonification.
        </p>
      </header>

      <label className="search">
        <Icon name="search" size={16} />
        <input
          type="search"
          value={query}
          placeholder="Search datasets, coords..."
          aria-label="Search datasets"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <section className="dataset-section" aria-labelledby="active-observations">
        <h2 id="active-observations" className="section-label">
          Active Observations
        </h2>
        <div className="dataset-list">
          {visible.map((dataset) => {
            const selected = dataset.id === selectedId
            return (
              <button
                key={dataset.id}
                type="button"
                className={`dataset-card ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => onSelect(dataset.id)}
              >
                <span className="dataset-media">
                  <img src={dataset.image} alt="" loading="lazy" />
                  <span className="dataset-media-shade" aria-hidden="true" />
                  {dataset.live ? (
                    <span className="live-pill">
                      <span className="status-dot" aria-hidden="true" />
                      Live Feed
                    </span>
                  ) : null}
                </span>
                <span className="dataset-body">
                  <span className="dataset-title-row">
                    <span className="dataset-title">{dataset.name}</span>
                    {selected ? (
                      <span className="dataset-signal" aria-hidden="true">
                        <Icon name="waveform" size={16} />
                      </span>
                    ) : null}
                  </span>
                  <span className="dataset-subtitle">{dataset.subtitle}</span>
                </span>
              </button>
            )
          })}
          {visible.length === 0 ? <p className="dataset-empty">No datasets match that search.</p> : null}
        </div>
      </section>

      <p className="sidebar-note">Design prototype · placeholder observations · NASA imagery</p>
    </>
  )
}
