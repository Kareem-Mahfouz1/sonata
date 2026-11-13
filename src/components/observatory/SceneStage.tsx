import { useEffect, useRef, useState } from 'react'
import type { EarthLayerId } from '../../audio/earthJukebox/config'
import type { SeriesResult } from '../../data/airQuality/types.ts'
import { getSeries } from '../../data/loaders.ts'
import { motionPolicy, type LayerSelection, type SceneConfig } from '../../visuals/scenes'
import type { MapPoint } from './AirQualityMap'

interface Props {
  point: MapPoint
  frame: number
  selection: LayerSelection
  playing: boolean
  reducedMotion: boolean
  scene: SceneConfig
}

const LAYERS: EarthLayerId[] = ['o3', 'pm25', 'nox']
const TAU = Math.PI * 2

function hash(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function hatch(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1
  for (let offset = -height; offset < width + height; offset += 9) {
    ctx.beginPath()
    ctx.moveTo(x + offset, y + height)
    ctx.lineTo(x + offset + height, y)
    ctx.stroke()
  }
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.7
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
  ctx.restore()
}

export function SceneStage({ point, frame, selection, playing, reducedMotion, scene }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [series, setSeries] = useState<Partial<Record<EarthLayerId, SeriesResult>>>({})
  const seriesRef = useRef(series)
  const frameRef = useRef(frame)
  const sceneRef = useRef(scene)
  const selectionRef = useRef(selection)
  const drawRef = useRef<(time: number) => void>(() => undefined)

  useEffect(() => {
    let cancelled = false
    Promise.all(LAYERS.map((layer) => getSeries(point.lat, point.lon, layer)))
      .then((results) => {
        if (cancelled) return
        const next: Partial<Record<EarthLayerId, SeriesResult>> = {}
        LAYERS.forEach((layer, index) => { next[layer] = results[index] })
        setSeries(next)
      })
      .catch(() => { if (!cancelled) setSeries({}) })
    return () => { cancelled = true }
  }, [point.lat, point.lon])

  const draw = (time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width < 2 || height < 2) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const targetWidth = Math.round(width * dpr)
    const targetHeight = Math.round(height * dpr)
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const activeScene = sceneRef.current
    const activeSelection = selectionRef.current
    const currentSeries = seriesRef.current
    const currentFrame = Math.min(frameRef.current, (currentSeries.pm25?.values.length ?? 301) - 1)
    const value = (layer: EarthLayerId) => currentSeries[layer]?.values[currentFrame] ?? null
    const live = motionPolicy(reducedMotion) === 'live' && playing
    const t = live ? time / 1000 : currentFrame * 0.09
    const cx = width * 0.56
    const cy = height * 0.47
    const span = Math.min(width, height)

    const background = ctx.createLinearGradient(0, 0, width, height)
    background.addColorStop(0, activeScene.palette[0])
    background.addColorStop(0.55, activeScene.palette[1])
    background.addColorStop(1, activeScene.palette[2])
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, span * 0.7)
    glow.addColorStop(0, `${activeScene.accent}22`)
    glow.addColorStop(0.55, `${activeScene.accent}09`)
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)

    const o3 = value('o3')
    const pm25 = value('pm25')
    const nox = value('nox')
    const drawO3 = activeSelection.o3 && activeScene.layers.includes('o3')
    const drawPm25 = activeSelection.pm25 && activeScene.layers.includes('pm25')
    const drawNox = activeSelection.nox && activeScene.layers.includes('nox')

    const drawRings = (alpha: number) => {
      if (!drawO3) return
      if (o3 === null) {
        ctx.save()
        ctx.strokeStyle = '#9aa9bc'
        ctx.globalAlpha = 0.55
        ctx.setLineDash([5, 6])
        for (let ring = 0; ring < 4; ring += 1) {
          ctx.beginPath()
          ctx.arc(cx, cy, span * (0.16 + ring * 0.085), 0, TAU)
          ctx.stroke()
        }
        ctx.restore()
        hatch(ctx, cx - span * 0.18, cy - 16, span * 0.36, 32, '#aab6c7')
        return
      }
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.06)
      for (let ring = 0; ring < 5; ring += 1) {
        const radius = span * (0.13 + ring * 0.075 + o3 * 0.02)
        ctx.beginPath()
        ctx.strokeStyle = ring % 2 === 0 ? activeScene.accent : '#8ff5ff'
        ctx.globalAlpha = alpha * (0.2 + o3 * 0.45)
        ctx.lineWidth = 1 + o3 * 1.5
        ctx.setLineDash([radius * 0.5, radius * 0.16])
        ctx.arc(0, 0, radius, 0, TAU)
        ctx.stroke()
      }
      ctx.restore()
    }

    const drawGrains = (alpha: number) => {
      if (!drawPm25) return
      if (pm25 === null) {
        hatch(ctx, width * 0.08, height * 0.62, width * 0.34, height * 0.2, '#aab6c7')
        return
      }
      ctx.save()
      for (let i = 0; i < 110; i += 1) {
        const seedX = hash(i, 1)
        const seedY = hash(i, 2)
        const drift = live ? t * (0.15 + pm25 * 0.45) : currentFrame * 0.02
        const x = ((seedX + drift * (0.4 + hash(i, 3))) % 1) * width
        const y = ((seedY + Math.sin(drift + i) * 0.02 + 1) % 1) * height
        const radius = 0.8 + pm25 * 2.6 * hash(i, 4)
        ctx.beginPath()
        ctx.fillStyle = i % 5 === 0 ? activeScene.accent : '#e0a458'
        ctx.globalAlpha = alpha * (0.12 + pm25 * 0.4)
        ctx.arc(x, y, radius, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    }

    const drawSpikes = (alpha: number) => {
      if (!drawNox) return
      if (nox === null) {
        ctx.save()
        ctx.strokeStyle = '#9aa9bc'
        ctx.globalAlpha = 0.6
        ctx.setLineDash([3, 7])
        ctx.beginPath()
        ctx.arc(cx, cy, span * 0.24, 0, TAU)
        ctx.stroke()
        ctx.restore()
        return
      }
      ctx.save()
      ctx.translate(cx, cy)
      const pulse = 0.5 + 0.5 * Math.sin(t * (1.4 + nox * 5))
      for (let i = 0; i < 24; i += 1) {
        const angle = (i / 24) * TAU + t * 0.08
        const inner = span * 0.17
        const outer = inner + span * (0.035 + nox * 0.12) * (0.45 + pulse * 0.55)
        ctx.beginPath()
        ctx.strokeStyle = i % 3 === 0 ? '#ff8ad8' : activeScene.accent
        ctx.globalAlpha = alpha * (0.18 + nox * 0.5)
        ctx.lineWidth = i % 4 === 0 ? 2 : 1
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        ctx.stroke()
      }
      ctx.restore()
    }

    const drawRibbons = (alpha: number) => {
      if (activeScene.motion !== 'interference') return
      ctx.save()
      for (let band = 0; band < 4; band += 1) {
        ctx.beginPath()
        ctx.strokeStyle = band % 2 === 0 ? '#8ff5ff' : '#ffc46b'
        ctx.globalAlpha = alpha * 0.25
        ctx.lineWidth = 1
        for (let x = 0; x <= width; x += 8) {
          const y = height * (0.28 + band * 0.13) + Math.sin(x * 0.012 + t * 0.7 + band) * 26
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    const drawLightning = (alpha: number) => {
      if (activeScene.motion !== 'lightning') return
      ctx.save()
      ctx.strokeStyle = activeScene.accent
      ctx.globalAlpha = alpha * 0.4
      for (let i = 0; i < 3; i += 1) {
        const phase = t * 0.8 + i * 2.1
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(phase) * span * 0.2, cy + Math.sin(phase) * span * 0.2)
        ctx.quadraticCurveTo(cx + Math.cos(phase + 0.6) * span * 0.38, cy + Math.sin(phase + 0.6) * span * 0.2, cx + Math.cos(phase + 1.2) * span * 0.3, cy + Math.sin(phase + 1.2) * span * 0.3)
        ctx.stroke()
      }
      ctx.restore()
    }

    const drawLattice = (alpha: number) => {
      if (activeScene.motion !== 'lattice') return
      ctx.save()
      ctx.strokeStyle = '#ffb070'
      ctx.globalAlpha = alpha * 0.18
      const step = span / 14
      for (let x = cx - span * 0.36; x < cx + span * 0.36; x += step) {
        ctx.beginPath(); ctx.moveTo(x, cy - span * 0.24); ctx.lineTo(x, cy + span * 0.24); ctx.stroke()
      }
      for (let y = cy - span * 0.24; y < cy + span * 0.24; y += step) {
        ctx.beginPath(); ctx.moveTo(cx - span * 0.36, y); ctx.lineTo(cx + span * 0.36, y); ctx.stroke()
      }
      ctx.restore()
    }

    const drawVortex = (alpha: number) => {
      if (activeScene.motion !== 'vortex') return
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.05)
      ctx.strokeStyle = activeScene.accent
      ctx.globalAlpha = alpha * 0.22
      for (let arm = 0; arm < 3; arm += 1) {
        ctx.beginPath()
        for (let i = 0; i < 90; i += 1) {
          const angle = (arm / 3) * TAU + i * 0.06
          const radius = span * (0.04 + i * 0.0035)
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.restore()
    }

    drawRibbons(0.8)
    drawLattice(0.8)
    drawRings(0.9)
    drawGrains(0.85)
    drawSpikes(0.9)
    drawLightning(0.8)
    drawVortex(0.8)
  }

  useEffect(() => {
    seriesRef.current = series
    frameRef.current = frame
    sceneRef.current = scene
    selectionRef.current = selection
    drawRef.current = draw
  })

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      drawRef.current(now)
      if (playing && !reducedMotion && !document.hidden) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(tick)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [playing, reducedMotion])

  useEffect(() => {
    if (!playing || reducedMotion) drawRef.current(performance.now())
  }, [frame, series, playing, reducedMotion, scene, selection])

  return <canvas ref={canvasRef} className="scene-stage" aria-hidden="true" />
}
