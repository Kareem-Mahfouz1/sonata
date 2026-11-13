import { useMemo, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { ObservationDataset } from '../../data/observations'
import { burst } from '../../lib/fx'
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

  function tilt(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const ry = ((event.clientX - rect.left) / rect.width - 0.5) * 10
    const rx = -((event.clientY - rect.top) / rect.height - 0.5) * 10
    event.currentTarget.style.setProperty('--ry', `${ry}deg`)
    event.currentTarget.style.setProperty('--rx', `${rx}deg`)
  }

  function resetTilt(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.setProperty('--rx', '0deg')
    event.currentTarget.style.setProperty('--ry', '0deg')
  }

  return (
    <aside className="sidebar" aria-label="Dataset discovery">
      <h1 className="sidebar-title hd" data-reveal style={{ '--i': 0 } as CSSProperties}>
        Earth Signals
      </h1>
      <p className="sidebar-lead" data-reveal style={{ '--i': 1 } as CSSProperties}>
        Discover patterns in planetary data through sound. Select an observation dataset to begin
        sonification.
      </p>

      <label className="search" data-reveal style={{ '--i': 2 } as CSSProperties}>
        <Icon name="search" size={15} />
        <input
          type="search"
          value={query}
          placeholder="Search datasets, coords..."
          aria-label="Search datasets"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <p className="section-label mono" data-reveal style={{ '--i': 3 } as CSSProperties}>
        Active Observations
      </p>

      <div className="cards">
        {visible.map((dataset, index) => {
          const selected = dataset.id === selectedId
          return (
            <button
              key={dataset.id}
              type="button"
              className={`card ${selected ? 'is-selected' : ''}`}
              aria-pressed={selected}
              data-reveal
              style={{ '--i': 4 + index } as CSSProperties}
              onPointerMove={tilt}
              onPointerLeave={resetTilt}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                burst(rect.left + rect.width / 2, rect.top + 52, '#729BCB', 14)
                onSelect(dataset.id)
              }}
            >
              <span className="card-thumb">
                <img src={dataset.image} alt="" loading="lazy" draggable={false} />
                {dataset.live ? <span className="card-live mono">● Live Feed</span> : null}
              </span>
              <b>{dataset.name}</b>
              <small>{dataset.subtitle}</small>
            </button>
          )
        })}
        {visible.length === 0 ? <p className="cards-empty">No datasets match that search.</p> : null}
      </div>

      <p className="sidebar-note mono">
        Design prototype · placeholder observations · NASA imagery
      </p>
    </aside>
  )
}
