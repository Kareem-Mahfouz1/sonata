import { useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent } from 'react'
import type { ExplorationMode, ObservationDataset } from '../../data/observations'
import { formatCoords } from '../../data/observations'
import { burst } from '../../lib/fx'
import { Icon } from '../ui/Icon'

interface ObservationViewProps {
  dataset: ObservationDataset
  mode: ExplorationMode
  velocity: number
  progress: number
  duration: number
  onProbe: (label: string) => void
}

export function ObservationView({
  dataset,
  mode,
  velocity,
  progress,
  duration,
  onProbe,
}: ObservationViewProps) {
  const [focus, setFocus] = useState(false)
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null)
  const [coords, setCoords] = useState(() => formatCoords(dataset.lat, dataset.lng))

  function probe(event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>, announce: boolean) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const lat = 90 - (y / 100) * 180
    const lng = (x / 100) * 360 - 180
    setTarget({ x, y })
    setCoords(formatCoords(lat, lng))
    if (announce) burst(event.clientX, event.clientY, '#78B9BC', 16)
    return { x, y }
  }

  return (
    <div className={`view ${focus ? 'is-focus' : ''}`}>
      <div className="view-chips">
        <span className="chip mono" data-reveal style={{ '--i': 0 } as CSSProperties}>
          <span className="chip-glyph" aria-hidden="true">
            ▤
          </span>
          {dataset.code}
        </span>
        <span
          className="view-coords mono"
          data-reveal
          style={{ '--i': 1 } as CSSProperties}
          aria-live="off"
        >
          {coords}
        </span>
        <button
          type="button"
          className={`chip chip-button mono ${focus ? 'is-active' : ''}`}
          aria-pressed={focus}
          data-reveal
          style={{ '--i': 2 } as CSSProperties}
          onClick={() => {
            setFocus((current) => !current)
            onProbe(focus ? 'Focus Mode off.' : 'Focus Mode on. Observation field expanded.')
          }}
        >
          <Icon name="focus" size={14} />
          Focus Mode
        </button>
      </div>

      <div
        className="obs-frame"
        role="group"
        aria-label={`${dataset.name} observation viewport`}
        onPointerMove={(event) => {
          if (mode === 'probe') probe(event, false)
        }}
        onClick={(event) => {
          if (mode !== 'probe') return
          if (event.target instanceof HTMLElement && event.target.closest('.marker')) return
          const point = probe(event, true)
          onProbe(
            `Probe locked at ${point.x.toFixed(1)} percent across, ${point.y.toFixed(1)} percent down.`,
          )
        }}
      >
        <img
          className="obs-image"
          src={dataset.image}
          alt={dataset.imageAlt}
          draggable={false}
        />
        <span className="obs-vignette" aria-hidden="true" />
        <span className="obs-grid" aria-hidden="true" />

        {mode === 'scan' ? (
          <i
            className="beam"
            aria-hidden="true"
            style={{ animationDuration: `${(9 / velocity).toFixed(2)}s` }}
          />
        ) : null}
        {mode === 'time' ? (
          <i
            className="beam beam--time"
            aria-hidden="true"
            style={{ left: `${Math.min(100, (progress / duration) * 100)}%` }}
          />
        ) : null}

        {mode === 'probe' && target ? (
          <span
            className="crosshair"
            aria-hidden="true"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
          >
            <span className="crosshair-ring" />
            <span className="crosshair-ring crosshair-ring--late" />
          </span>
        ) : null}

        {dataset.markers.map((marker) => (
          <button
            key={marker.label}
            type="button"
            className="marker"
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            aria-label={`Inspect ${marker.label}`}
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              setTarget({ x: marker.x, y: marker.y })
              burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#78B9BC', 16)
              onProbe(`${marker.label} inspected.`)
            }}
          >
            <span className="marker-dot" />
          </button>
        ))}

        <span className="obs-credit mono">{dataset.credit} · imagery, not sonified data</span>
        <span className="obs-meta mono">
          <span>RESOLUTION: {dataset.resolution}</span>
          <span>PROJECTION: {dataset.projection}</span>
        </span>
      </div>
    </div>
  )
}
