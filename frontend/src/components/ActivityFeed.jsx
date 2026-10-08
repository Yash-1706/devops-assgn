import { timeAgo } from "../utils.js";

function describe(task) {
  if (task.status === "done") return "completed";
  const edited = new Date(task.updated_at) - new Date(task.created_at) > 1000;
  return edited ? "updated" : "created";
}

export default function ActivityFeed({ tasks }) {
  const recent = [...tasks]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  return (
    <section className="panel" aria-labelledby="activity-heading">
      <h2 id="activity-heading">Recent activity</h2>
      {recent.length === 0 ? (
        <p className="muted">Nothing has happened yet.</p>
      ) : (
        <ul className="activity-list">
          {recent.map((task) => (
            <li key={task.id}>
              <span className={`activity-dot dot-${task.status}`} aria-hidden="true" />
              <div>
                <p>
                  <strong>{task.assignee || "Someone"}</strong> {describe(task)} “{task.title}”
                </p>
                <span className="muted">{timeAgo(task.updated_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
