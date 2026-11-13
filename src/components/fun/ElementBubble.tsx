import type { CSSProperties } from 'react'
import type { ObservationElement } from '../../data/elements'
import { Icon } from '../ui/Icon'

interface ElementBubbleProps {
  element: ObservationElement
  selected: boolean
  playing: boolean
  onToggle: (id: string) => void
}

function BubbleGlyph({ kind }: { kind: ObservationElement['kind'] }) {
  switch (kind) {
    case 'chlorophyll':
      return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
          <path d="M6 30c6-8 12 8 18 0s12 8 18 0" strokeLinecap="round" />
          <path d="M6 20c6-8 12 8 18 0s12 8 18 0" strokeLinecap="round" opacity=".6" />
          <circle cx="24" cy="24" r="3.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'aerosol':
      return (
        <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
          <circle cx="15" cy="17" r="2.4" />
          <circle cx="26" cy="12" r="1.8" />
          <circle cx="34" cy="21" r="2.6" />
          <circle cx="20" cy="28" r="1.6" />
          <circle cx="31" cy="32" r="2.2" />
          <circle cx="12" cy="34" r="1.4" />
          <circle cx="39" cy="29" r="1.2" />
        </svg>
      )
    case 'thermal':
      return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
          <circle cx="24" cy="24" r="5" />
          <path d="M24 11a13 13 0 0 1 13 13" strokeLinecap="round" opacity=".8" />
          <path d="M24 5a19 19 0 0 1 19 19" strokeLinecap="round" opacity=".45" />
          <path d="M11 24a13 13 0 0 1 13-13" strokeLinecap="round" opacity=".5" />
        </svg>
      )
    case 'oxygen':
      return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
          <circle cx="18" cy="30" r="6" />
          <circle cx="31" cy="21" r="4" opacity=".8" />
          <circle cx="34" cy="33" r="2.5" opacity=".6" />
          <circle cx="13" cy="17" r="2" opacity=".5" />
        </svg>
      )
    case 'vegetation':
      return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
          <path d="M24 40V12M24 22l-8-7M24 30l9-8M24 17l7-5" strokeLinecap="round" />
          <path d="M16 15c-3-4-2-7 2-7 2 0 3 3 3 5" opacity=".7" />
          <path d="M32 21c4-1 6 1 5 4-1 2-4 2-6 1" opacity=".7" />
        </svg>
      )
  }
}

export function ElementBubble({ element, selected, playing, onToggle }: ElementBubbleProps) {
  const style = {
    left: element.left,
    top: element.top,
    '--size': `${element.size}px`,
    '--drift-x': element.driftX,
    '--drift-y': element.driftY,
    '--float-duration': element.floatDuration,
    '--float-delay': element.floatDelay,
    '--tone': element.color,
    '--tone-light': element.light,
  } as CSSProperties

  return (
    <button
      type="button"
      className={`bubble bubble--${element.kind} ${selected ? 'is-selected' : ''} ${playing ? 'is-playing' : ''}`}
      style={style}
      aria-pressed={selected}
      aria-label={`${element.name} — ${element.category}`}
      title={`${element.name} · ${element.category}`}
      onClick={() => onToggle(element.id)}
    >
      <span className="bubble-aura" aria-hidden="true" />
      <span className="bubble-orbit" aria-hidden="true" />
      <span className="bubble-body">
        <span className="bubble-texture" aria-hidden="true" />
        <span className="bubble-glyph" aria-hidden="true">
          <BubbleGlyph kind={element.kind} />
        </span>
        <span className="bubble-shine" aria-hidden="true" />
      </span>
      <span className="bubble-name">{element.name}</span>
      {selected ? (
        <span className="bubble-check" aria-hidden="true">
          <Icon name="check" size={11} />
        </span>
      ) : null}
    </button>
  )
}
