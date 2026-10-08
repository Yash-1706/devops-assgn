import { PRIORITY_LABELS, STATUS_LABELS, initials, timeAgo } from "../utils.js";

export default function TaskTable({ tasks, busyId, onStatusChange, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <strong>No tasks here yet</strong>
        <p>Create a task or pick a different filter.</p>
      </div>
    );
  }

  return (
    <table className="task-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Assignee</th>
          <th>Created</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id} className={busyId === task.id ? "row-busy" : undefined}>
            <td data-label="Task">
              <span className="task-title">{task.title}</span>
              {task.description && <span className="task-desc">{task.description}</span>}
            </td>
            <td data-label="Status">
              <select
                className={`status-select status-${task.status}`}
                value={task.status}
                disabled={busyId === task.id}
                aria-label={`Status of ${task.title}`}
                onChange={(event) => onStatusChange(task, event.target.value)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </td>
            <td data-label="Priority">
              <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
            </td>
            <td data-label="Assignee">
              {task.assignee ? (
                <span className="assignee">
                  <span className="avatar" aria-hidden="true">
                    {initials(task.assignee)}
                  </span>
                  {task.assignee}
                </span>
              ) : (
                <span className="muted">Unassigned</span>
              )}
            </td>
            <td data-label="Created" className="muted">
              {timeAgo(task.created_at)}
            </td>
            <td className="actions-cell">
              <button
                className="icon-button"
                disabled={busyId === task.id}
                onClick={() => onDelete(task)}
                aria-label={`Delete ${task.title}`}
                title="Delete task"
              >
                ✕
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
