import type { CSSProperties } from 'react'

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div className="seg" role="group" aria-label={label} style={{ '--index': index } as CSSProperties}>
      <span className="seg-pill" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'is-selected' : ''}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
