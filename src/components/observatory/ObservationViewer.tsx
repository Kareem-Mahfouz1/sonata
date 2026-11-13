import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { ExplorationMode, ObservationDataset } from '../../data/observations'

interface ObservationViewerProps {
  dataset: ObservationDataset
  mode: ExplorationMode
  velocity: number
  onProbe: (label: string) => void
}

interface ProbeTarget {
  x: number
  y: number
  label: string
}

export function ObservationViewer({ dataset, mode, velocity, onProbe }: ObservationViewerProps) {
  const [target, setTarget] = useState<ProbeTarget | null>(null)
  const [timeIndex, setTimeIndex] = useState(6)

  function probeAt(x: number, y: number, label: string) {
    setTarget({ x, y, label })
    onProbe(label)
  }

  return (
    <div className="viewer">
      <div
        className="viewer-media"
        onPointerDown={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest('.marker')) return
          const rect = event.currentTarget.getBoundingClientRect()
          const x = ((event.clientX - rect.left) / rect.width) * 100
          const y = ((event.clientY - rect.top) / rect.height) * 100
          probeAt(
            x,
            y,
            `Manual probe · ${x.toFixed(1)}% across, ${y.toFixed(1)}% down`,
          )
        }}
      >
        <img className="viewer-image" src={dataset.image} alt={dataset.imageAlt} />
        <span className="viewer-vignette" aria-hidden="true" />
        <span className="viewer-grid" aria-hidden="true" />

        {mode === 'scan' ? (
          <span
            className="scan-beam"
            aria-hidden="true"
            style={{ '--scan-duration': `${(9 / velocity).toFixed(2)}s` } as CSSProperties}
          >
            <span className="scan-trail" />
          </span>
        ) : null}

        {mode === 'probe' && target ? (
          <span
            className="probe-lock"
            aria-hidden="true"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
          >
            <span className="probe-ring" />
            <span className="probe-ring probe-ring--delayed" />
            <span className="probe-core" />
          </span>
        ) : null}

        <span className="markers">
          {dataset.markers.map((marker) => (
            <button
              key={marker.label}
              type="button"
              className="marker"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              aria-label={`Inspect ${marker.label}`}
              onClick={(event) => {
                event.stopPropagation()
                probeAt(marker.x, marker.y, marker.label)
              }}
            >
              <span className="marker-dot" />
              <span className="marker-ring" />
            </button>
          ))}
        </span>

        {mode === 'time' ? (
          <div className="time-rail">
            <span className="time-rail-label">T−{String(timeIndex).padStart(2, '0')}H</span>
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={timeIndex}
              aria-label="Observation time offset in hours"
              onChange={(event) => setTimeIndex(Number(event.target.value))}
            />
          </div>
        ) : null}

        <span className="viewer-meta">
          <span>RESOLUTION: {dataset.resolution}</span>
          <span>PROJECTION: {dataset.projection}</span>
        </span>
        <span className="viewer-credit">{dataset.credit} · imagery, not sonified data</span>
      </div>
    </div>
  )
}
