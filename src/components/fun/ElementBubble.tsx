import type { CSSProperties } from 'react'
import type { ObservationElement } from '../../data/elements'
import { burst } from '../../lib/fx'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

interface ElementBubbleProps {
  element: ObservationElement
  index: number
  selected: boolean
  playing: boolean
  onToggle: (id: string) => void
}

const glyphs: Record<ObservationElement['kind'], IconName> = {
  chlorophyll: 'drop',
  aerosol: 'dust',
  thermal: 'thermometer',
  ozone: 'dust',
  vegetation: 'leaf',
  dust: 'dust',
}

export function ElementBubble({ element, index, selected, playing, onToggle }: ElementBubbleProps) {
  const style = {
    left: `calc(${element.x}% - ${element.size / 2}px)`,
    top: `calc(${element.y}% - ${element.size / 2}px)`,
    width: `${element.size}px`,
    height: `${element.size}px`,
    '--tone': element.color,
    '--depth': element.size / 176,
    '--float': `${4 + index * 0.7}s`,
    '--delay': `${index * -0.6}s`,
  } as CSSProperties

  return (
    <button
      type="button"
      className={`bubble ${selected ? 'is-selected' : ''} ${playing && selected ? 'is-playing' : ''}`}
      style={style}
      data-id={element.id}
      aria-pressed={selected}
      aria-label={`${element.name} — ${element.category}`}
      title={`${element.name} · ${element.category}`}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        burst(rect.left + rect.width / 2, rect.top + rect.height / 2, element.color, selected ? 10 : 26)
        onToggle(element.id)
      }}
    >
      <span className="bubble-core">
        <span className="bubble-glyph" aria-hidden="true">
          {element.glyph ? (
            <b className="mono">{element.glyph}</b>
          ) : (
            <Icon name={glyphs[element.kind]} size={40} />
          )}
        </span>
      </span>
      <i className="bubble-ring" aria-hidden="true" />
      <i className="bubble-ring bubble-ring--late" aria-hidden="true" />
      <span className="bubble-tag mono">{element.name}</span>
    </button>
  )
}
