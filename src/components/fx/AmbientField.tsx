import { useEffect, useRef } from 'react'
import { getSonification } from '../../audio/sonification'
import { prefersReducedMotion } from '../../lib/motion'

interface Star {
  x: number
  y: number
  z: number
  p: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface Ripple {
  x: number
  y: number
  r: number
  life: number
  color: string
}

interface EventDetail {
  x: number
  y: number
  color: string
  count?: number
}

/** Ambient starfield, cursor light and particle feedback. Decorative only. */
export function AmbientField() {
  const bgRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return

    const bg = bgRef.current
    const fx = fxRef.current
    const bgCtx = bg?.getContext('2d')
    const fxCtx = fx?.getContext('2d')
    if (!bg || !fx || !bgCtx || !fxCtx) return

    let width = 0
    let height = 0
    let frame = 0
    let stars: Star[] = []
    let particles: Particle[] = []
    let rings: Ripple[] = []
    let shooting: { x: number; y: number; life: number } | null = null
    let targetX = 0
    let targetY = 0
    let smoothX = 0
    let smoothY = 0
    let pointerX = window.innerWidth / 2
    let pointerY = window.innerHeight * 0.4
    let glowX = pointerX
    let glowY = pointerY
    let lastMarker: number[] = [0, 0, 0, 0, 0, 0]

    const root = document.documentElement

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      for (const canvas of [bg, fx]) {
        if (!canvas) continue
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      const count = Math.min(240, Math.floor((width * height) / 5500))
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 0.9 + 0.1,
        p: Math.random() * 6,
      }))
    }

    function addRipple(x: number, y: number, color: string) {
      rings.push({ x, y, r: 6, life: 1, color })
    }

    function addBurst(detail: EventDetail) {
      const count = detail.count ?? 20
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3.5
        particles.push({
          x: detail.x,
          y: detail.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: detail.color,
        })
      }
      addRipple(detail.x, detail.y, detail.color)
    }

    function onPointerMove(event: PointerEvent) {
      pointerX = event.clientX
      pointerY = event.clientY
      targetX = (pointerX / width) * 2 - 1
      targetY = (pointerY / height) * 2 - 1
    }

    function onPointerDown(event: PointerEvent) {
      addRipple(event.clientX, event.clientY, '#729BCB')
    }

    const onBurst = (event: Event) => addBurst((event as CustomEvent<EventDetail>).detail)
    const onRipple = (event: Event) => {
      const detail = (event as CustomEvent<EventDetail>).detail
      addRipple(detail.x, detail.y, detail.color)
    }
    const onFlash = () => {
      flashRef.current?.animate([{ opacity: 0.3 }, { opacity: 0 }], {
        duration: 520,
        easing: 'ease-out',
      })
    }

    function draw(now: number) {
      smoothX += (targetX - smoothX) * 0.06
      smoothY += (targetY - smoothY) * 0.06
      glowX += (pointerX - glowX) * 0.12
      glowY += (pointerY - glowY) * 0.12

      // The sun marker in the field pulses on the same clock as the audio level.
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${glowX}px, ${glowY}px)`
      }
      root.style.setProperty('--sx', smoothX.toFixed(3))
      root.style.setProperty('--sy', smoothY.toFixed(3))
      root.style.setProperty('--level', getSonification().level().toFixed(3))

      if (!bgCtx || !fxCtx) return
      bgCtx.clearRect(0, 0, width, height)
      for (const star of stars) {
        const alpha = 0.35 + 0.45 * Math.sin(now / 900 + star.p)
        bgCtx.globalAlpha = alpha * star.z
        bgCtx.fillStyle = '#cfe0ff'
        const x = (star.x + smoothX * star.z * 28 + width) % width
        const y = (star.y + smoothY * star.z * 18 + height) % height
        bgCtx.fillRect(x, y, star.z * 1.8, star.z * 1.8)
      }

      if (!shooting && Math.random() < 0.003) {
        shooting = { x: Math.random() * width, y: Math.random() * height * 0.4, life: 1 }
      }
      if (shooting) {
        bgCtx.globalAlpha = shooting.life
        bgCtx.strokeStyle = '#cfe0ff'
        bgCtx.beginPath()
        bgCtx.moveTo(shooting.x, shooting.y)
        bgCtx.lineTo(shooting.x - 70, shooting.y - 30)
        bgCtx.stroke()
        shooting.x += 14
        shooting.y += 6
        shooting.life -= 0.02
        if (shooting.life <= 0) shooting = null
      }

      fxCtx.clearRect(0, 0, width, height)
      fxCtx.globalCompositeOperation = 'lighter'
      particles = particles.filter((particle) => particle.life > 0)
      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vx *= 0.96
        particle.vy *= 0.96
        particle.life -= 0.022
        fxCtx.globalAlpha = Math.max(particle.life, 0)
        fxCtx.fillStyle = particle.color
        fxCtx.beginPath()
        fxCtx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
        fxCtx.fill()
      }
      rings = rings.filter((ring) => ring.life > 0)
      for (const ring of rings) {
        ring.r += 5 * ring.life + 1
        ring.life -= 0.025
        fxCtx.globalAlpha = Math.max(ring.life, 0)
        fxCtx.strokeStyle = ring.color
        fxCtx.lineWidth = 2 * ring.life
        fxCtx.beginPath()
        fxCtx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
        fxCtx.stroke()
      }
      fxCtx.globalCompositeOperation = 'source-over'

      // Keep the marker loop honest without slowing the field.
      void lastMarker

      frame = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('ej:burst', onBurst)
    window.addEventListener('ej:ripple', onRipple)
    window.addEventListener('ej:flash', onFlash)
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('ej:burst', onBurst)
      window.removeEventListener('ej:ripple', onRipple)
      window.removeEventListener('ej:flash', onFlash)
      root.style.removeProperty('--sx')
      root.style.removeProperty('--sy')
      root.style.removeProperty('--level')
    }
  }, [])

  return (
    <>
      <canvas ref={bgRef} className="ambient-stars" aria-hidden="true" />
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <canvas ref={fxRef} className="ambient-fx" aria-hidden="true" />
      <div ref={flashRef} className="ambient-flash" aria-hidden="true" />
    </>
  )
}
