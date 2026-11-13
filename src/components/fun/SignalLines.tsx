import { useEffect, useRef } from 'react'
import type { ObservationElement } from '../../data/elements'

interface SignalLinesProps {
  active: ObservationElement[]
}

/** Dashed paths joining each selected bubble to its synthesis row. */
export function SignalLines({ active }: SignalLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const paths = useRef<Record<string, SVGPathElement | null>>({})
  const latest = useRef(active)
  const key = active.map((element) => element.id).join(',')

  useEffect(() => {
    latest.current = active
  })

  useEffect(() => {
    const svg = svgRef.current
    const field = svg?.parentElement
    if (!svg || !field) return

    let frame = 0
    const draw = () => {
      const fieldRect = field.getBoundingClientRect()
      for (const element of latest.current) {
        const path = paths.current[element.id]
        if (!path) continue
        const bubble = field.querySelector<HTMLElement>(`.bubble[data-id="${element.id}"]`)
        const row = field.querySelector<HTMLElement>(`.synth-row[data-id="${element.id}"] .synth-marker`)
        if (!bubble || !row) {
          path.style.display = 'none'
          continue
        }
        const bubbleRect = bubble.getBoundingClientRect()
        const rowRect = row.getBoundingClientRect()
        const x1 = bubbleRect.left + bubbleRect.width / 2 - fieldRect.left
        const y1 = bubbleRect.top + bubbleRect.height / 2 - fieldRect.top
        const x2 = rowRect.left + rowRect.width / 2 - fieldRect.left
        const y2 = rowRect.top + rowRect.height / 2 - fieldRect.top
        path.style.display = 'block'
        path.setAttribute('d', `M${x1} ${y1}C${x1 + 120} ${y1},${x2 - 140} ${y2},${x2} ${y2}`)
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [key])

  return (
    <svg className="signal-lines" ref={svgRef} aria-hidden="true">
      {active.map((element) => (
        <path
          key={element.id}
          data-line-id={element.id}
          stroke={element.color}
          ref={(node) => {
            paths.current[element.id] = node
          }}
        />
      ))}
    </svg>
  )
}
