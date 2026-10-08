const CARDS = [
  { key: "total", label: "Total tasks", tone: "neutral" },
  { key: "in_progress", label: "In progress", tone: "info" },
  { key: "done", label: "Completed", tone: "success" },
  { key: "high_priority", label: "Open high priority", tone: "danger" },
];

export default function StatCards({ stats }) {
  return (
    <section className="kpi-grid" aria-label="Key numbers">
      {CARDS.map((card) => (
        <article key={card.key} className={`kpi-card kpi-${card.tone}`}>
          <span className="kpi-label">{card.label}</span>
          <strong className="kpi-value">{stats ? stats[card.key] : "–"}</strong>
        </article>
      ))}
    </section>
  );
}
