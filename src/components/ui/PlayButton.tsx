import { Icon } from './Icon'

interface PlayButtonProps {
  playing: boolean
  label: string
  onClick: () => void
  disabled?: boolean
}

export function PlayButton({ playing, label, onClick, disabled = false }: PlayButtonProps) {
  return (
    <button
      type="button"
      className={`play ${playing ? 'is-playing' : ''}`}
      aria-label={label}
      aria-pressed={playing}
      disabled={disabled}
      onClick={onClick}
      onPointerMove={(event) => {
        if (disabled) return
        const rect = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.translate = `${
          (event.clientX - rect.left - rect.width / 2) * 0.3
        }px ${(event.clientY - rect.top - rect.height / 2) * 0.3}px`
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.translate = '0 0'
      }}
    >
      <Icon name={playing ? 'pause' : 'play'} size={20} />
    </button>
  )
}
