import { useEffect, useRef } from 'react'
import { getSonification } from '../../audio/sonification'
import type { ObservationElement } from '../../data/elements'
import { formatShort, MAX_ELEMENTS } from '../../lib/selection'
import { Icon } from '../ui/Icon'
import { PlayButton } from '../ui/PlayButton'
import { Slider } from '../ui/Slider'

interface SynthesisPanelProps {
  selected: ObservationElement[]
  playing: boolean
  progress: number
  duration: number
  volume: number
  shake: number
  onRemove: (id: string) => void
  onClear: () => void
  onPlay: () => void
  onVolume: (value: number) => void
}

function Equalizer({ playing }: { playing: boolean }) {
  const bars = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const nodes = bars.current
    if (!playing) {
      nodes.forEach((node) => {
        if (node) node.style.transform = 'scaleY(0.3)'
      })
      return
    }
    let frame = 0
    const tick = () => {
      const data = getSonification().spectrum()
      nodes.forEach((node, index) => {
        if (node) node.style.transform = `scaleY(${Math.max(0.2, (data[index * 3] / 255) * 1.1)})`
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  return (
    <span className="eq" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <i
          key={index}
          ref={(node) => {
            bars.current[index] = node
          }}
          style={{ transform: 'scaleY(0.3)' }}
        />
      ))}
    </span>
  )
}

export function SynthesisPanel({
  selected,
  playing,
  progress,
  duration,
  volume,
  shake,
  onRemove,
  onClear,
  onPlay,
  onVolume,
}: SynthesisPanelProps) {
  return (
    <section className="synth-panel" aria-labelledby="synthesis-heading" data-reveal>
      <header className="synth-top">
        <div>
          <p id="synthesis-heading" className="lbl mono">
            Active Synthesis
          </p>
          <div className={`synth-count hd ${shake > 0 ? 'is-shaking' : ''}`} key={shake}>
            <b>
              {selected.length} / {MAX_ELEMENTS}
            </b>{' '}
            Elements selected
          </div>
        </div>
        <button
          type="button"
          className="synth-clear mono"
          disabled={selected.length === 0}
          onClick={onClear}
        >
          Clear All
        </button>
      </header>

      <ul className="synth-items" aria-live="polite">
        {selected.length === 0 ? (
          <li className="synth-empty">Select up to 3 elements in the field.</li>
        ) : (
          selected.map((element) => (
            <li key={element.id} className="synth-row" data-id={element.id}>
              <i className="synth-marker" style={{ color: element.color }} aria-hidden="true">
                <s />
              </i>
              <div className="synth-copy">
                <b className="hd">{element.name}</b>
                <small className="mono">{element.descriptor}</small>
              </div>
              <button
                type="button"
                className="synth-remove"
                aria-label={`Remove ${element.name}`}
                onClick={() => onRemove(element.id)}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="synth-bot">
        <PlayButton
          playing={playing}
          disabled={selected.length === 0}
          label={playing ? 'Pause combined sonification' : 'Play combined sonification'}
          onClick={onPlay}
        />
        <div className="synth-bot-copy">
          <b className="hd">Combined Sonification</b>
          <span className="mono">
            {formatShort(progress)} / {formatShort(duration)}
          </span>
        </div>
        <Equalizer playing={playing} />
        <div className="synth-vol">
          <Slider
            label="Combined volume"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(value) => onVolume(value / 100)}
          />
        </div>
      </div>
    </section>
  )
}
