import { useEffect, useRef, useState } from "react";
import { PRIORITY_LABELS, STATUS_LABELS } from "../utils.js";

const EMPTY_FORM = { title: "", description: "", status: "todo", priority: "medium", assignee: "" };

export default function TaskModal({ onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const setField = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        assignee: form.assignee.trim() || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={handleSubmit}>
        <h2 id="modal-title">New task</h2>

        <label>
          Title
          <input ref={titleRef} value={form.title} onChange={setField("title")} maxLength={200} required />
        </label>

        <label>
          Description
          <textarea value={form.description} onChange={setField("description")} rows={3} maxLength={2000} />
        </label>

        <div className="form-row">
          <label>
            Status
            <select value={form.status} onChange={setField("status")}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={setField("priority")}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Assignee
          <input value={form.assignee} onChange={setField("assignee")} maxLength={100} placeholder="Optional" />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={saving || !form.title.trim()}>
            {saving ? "Creating…" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
