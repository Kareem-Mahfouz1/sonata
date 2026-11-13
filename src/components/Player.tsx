interface PlayerProps {
  isPlaying: boolean
  label: string
  onToggle: () => void
}

export function Player({ isPlaying, label, onToggle }: PlayerProps) {
  return <button className="play-button" type="button" onClick={onToggle} aria-pressed={isPlaying}>{isPlaying ? '||' : '>'} <span>{label}</span></button>
}
