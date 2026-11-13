import type { CSSProperties } from 'react'
import { ratio } from '../../lib/selection'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  onChange: (value: number) => void
}

export function Slider({ value, min, max, step = 0.1, label, onChange }: SliderProps) {
  const fill = ratio(value, min, max) * 100
  return (
    <input
      className="slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      style={{ '--fill': `${fill}%` } as CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}
