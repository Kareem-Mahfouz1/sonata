import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cities, nearestCity } from '../../data/cities'
import type { City } from '../../data/cities'
import { loadLayer } from '../../data/loaders.ts'
import type { DecodedLayer } from '../../data/airQuality/types.ts'

export interface MapPoint { lat: number; lon: number; label: string }

interface Props {
  frame: number
  point: MapPoint
  onPoint: (point: MapPoint) => void
  onAnnounce: (message: string) => void
}

const W = 180
const H = 90
const STOPS: [number, [number, number, number]][] = [
  [0, [43, 58, 85]], [0.35, [63, 127, 140]], [0.6, [217, 180, 74]], [0.8, [217, 122, 58]], [1, [178, 58, 58]],
]

function palette(value: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i += 1) {
    if (value <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1]
      const [b, cb] = STOPS[i]
      const t = (value - a) / (b - a)
      return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export function AirQualityMap({ frame, point, onPoint, onAnnounce }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [layer, setLayer] = useState<DecodedLayer | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    loadLayer('pm25').then((data) => { if (!cancelled) setLayer(data) }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Map data unavailable')
    })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return cities.filter((city) => `${city.name} ${city.country}`.toLowerCase().includes(term)).slice(0, 6)
  }, [query])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layer) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scale = canvas.width / W
    const image = ctx.createImageData(W, H)
    const index = Math.min(layer.metadata.frames.count - 1, frame)
    const size = W * H
    for (let cell = 0; cell < size; cell += 1) {
      const byte = layer.values[index * size + cell]
      const flag = layer.flags[index * size + cell]
      const nullCell = flag !== 0 || byte === 255
      const color = nullCell ? [58, 66, 78] : palette(byte / 254)
      const offset = cell * 4
      image.data[offset] = color[0]; image.data[offset + 1] = color[1]; image.data[offset + 2] = color[2]
      // Data cells stay legible; the scene stage glows faintly through ocean and null areas.
      image.data[offset + 3] = nullCell ? 246 : 222
    }
    const off = document.createElement('canvas')
    off.width = W; off.height = H
    off.getContext('2d')?.putImageData(image, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.strokeStyle = '#aab6c7'
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 1
    for (let cell = 0; cell < size; cell += 1) {
      const byte = layer.values[index * size + cell]
      const flag = layer.flags[index * size + cell]
      if (flag === 0 && byte !== 255) continue
      const x = (cell % W) * scale
      const y = Math.floor(cell / W) * scale
      ctx.beginPath()
      ctx.moveTo(x, y + scale); ctx.lineTo(x + scale, y)
      ctx.moveTo(x + scale / 2, y + scale); ctx.lineTo(x + scale, y + scale / 2)
      ctx.stroke()
    }
    ctx.restore()
    const px = ((point.lon + 180) / 360) * canvas.width
    const py = ((90 - point.lat) / 180) * canvas.height
    ctx.strokeStyle = '#f3f6fb'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px + 10, py); ctx.moveTo(px, py - 10); ctx.lineTo(px, py + 10); ctx.stroke()
  }, [layer, frame, point])

  function announcePoint(lat: number, lon: number) {
    const city = nearestCity(lat, lon)
    onAnnounce(`Latitude ${lat.toFixed(1)}, longitude ${lon.toFixed(1)}. Nearest city: ${city.name}, ${city.country}. Press Enter to play.`)
  }

  function choose(next: MapPoint) {
    onPoint(next)
    const city = nearestCity(next.lat, next.lon)
    onAnnounce(`Playing ${next.label}. Nearest city: ${city.name}.`)
  }

  function key(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = 2
    let lat = point.lat
    let lon = point.lon
    if (event.key === 'ArrowUp') lat = Math.min(88, lat + step)
    else if (event.key === 'ArrowDown') lat = Math.max(-88, lat - step)
    else if (event.key === 'ArrowLeft') lon = ((lon - step + 540) % 360) - 180
    else if (event.key === 'ArrowRight') lon = ((lon + step + 540) % 360) - 180
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(point); return }
    else return
    event.preventDefault()
    const city = nearestCity(lat, lon)
    onPoint({ lat, lon, label: `${city.name} (${lat.toFixed(1)}, ${lon.toFixed(1)})` })
    announcePoint(lat, lon)
  }

  return (
    <div className="map-view">
      <div className="map-tools">
        <label className="map-search">
          <span className="sr-only">Search for a city</span>
          <input type="search" placeholder="Search a city…" value={query} onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && filtered[0]) {
                event.preventDefault()
                const city: City = filtered[0]
                setQuery('')
                choose({ lat: city.lat, lon: city.lon, label: `${city.name}, ${city.country}` })
              }
            }} />
        </label>
        {filtered.length > 0 ? (
          <ul className="map-results" aria-label="City search results">
            {filtered.map((city) => (
              <li key={`${city.name}-${city.lon}`}>
                <button type="button" onClick={() => { setQuery(''); choose({ lat: city.lat, lon: city.lon, label: `${city.name}, ${city.country}` }) }}>
                  {city.name}<small>{city.country}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <span className="map-source mono">PM2.5 · frame {frame + 1}/{layer?.metadata.frames.count ?? 301}</span>
      </div>
      <canvas ref={canvasRef} width={720} height={360} className="map-canvas" tabIndex={0}
        role="application" aria-label={`Equirectangular particulate matter map, current frame ${frame + 1}. Selected ${point.label}. Use arrow keys to move two degrees, Enter to play.`}
        onKeyDown={key} onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const lat = 90 - ((event.clientY - rect.top) / rect.height) * 180
          const lon = ((event.clientX - rect.left) / rect.width) * 360 - 180
          const city = nearestCity(lat, lon)
          choose({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, label: `${city.name} area (${lat.toFixed(1)}, ${lon.toFixed(1)})` })
        }} />
      <div className="map-foot mono">
        <span className="map-legend"><i className="map-swatch" /> No reliable reading (hatched)</span>
        <span>Selected: {point.label}</span>
        <span>{error || 'Relative scale · no physical units'}</span>
      </div>
    </div>
  )
}
