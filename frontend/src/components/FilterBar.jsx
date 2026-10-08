import { STATUS_LABELS } from "../utils.js";

const FILTERS = [{ id: "all", label: "All" }, ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }))];

export default function FilterBar({ active, counts, onChange }) {
  return (
    <div className="filter-bar" role="tablist" aria-label="Filter tasks by status">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          role="tab"
          aria-selected={active === filter.id}
          className={active === filter.id ? "filter active" : "filter"}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
          <span className="filter-count">{counts[filter.id] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
