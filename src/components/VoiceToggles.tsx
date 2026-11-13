interface VoiceTogglesProps {
  emptyLabel: string
}

export function VoiceToggles({ emptyLabel }: VoiceTogglesProps) {
  return <section className="panel" aria-labelledby="voices-heading"><div className="panel-heading"><h2 id="voices-heading">Voices</h2><span className="count">0 / 4</span></div><p className="empty-state">{emptyLabel}</p></section>
}
