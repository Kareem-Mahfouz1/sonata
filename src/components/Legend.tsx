interface LegendProps {
  title: string
  emptyLabel: string
}

export function Legend({ title, emptyLabel }: LegendProps) {
  return <section className="panel legend-panel" aria-labelledby="legend-heading"><div className="panel-heading"><h2 id="legend-heading">{title}</h2><span className="legend-mark" aria-hidden="true">+</span></div><p className="empty-state">{emptyLabel}</p></section>
}
