import { useCallback, useEffect, useMemo, useState } from "react";
import { createTask, deleteTask, getStats, getTasks, updateTask } from "./api.js";
import ActivityFeed from "./components/ActivityFeed.jsx";
import FilterBar from "./components/FilterBar.jsx";
import PipelineIndicator from "./components/PipelineIndicator.jsx";
import Sidebar from "./components/Sidebar.jsx";
import StatCards from "./components/StatCards.jsx";
import TaskModal from "./components/TaskModal.jsx";
import TaskTable from "./components/TaskTable.jsx";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [taskList, statList] = await Promise.all([getTasks(), getStats()]);
      setTasks(taskList);
      setStats(statList);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks],
  );

  const visibleTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleCreate(payload) {
    await createTask(payload);
    setModalOpen(false);
    await load();
  }

  async function handleStatusChange(task, status) {
    setBusyId(task.id);
    setActionError("");
    try {
      await updateTask(task.id, { status });
      await load();
    } catch (err) {
      setActionError(`Could not update “${task.title}”: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    setBusyId(task.id);
    setActionError("");
    try {
      await deleteTask(task.id);
      await load();
    } catch (err) {
      setActionError(`Could not delete “${task.title}”: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">Track what the team is working on.</p>
          </div>
          <button className="button primary" onClick={() => setModalOpen(true)}>
            + New task
          </button>
        </header>

        {loading && (
          <div className="state-card" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading tasks…
          </div>
        )}

        {!loading && loadError && (
          <div className="state-card error" role="alert">
            <strong>We couldn’t reach the TaskBoard API.</strong>
            <p>{loadError}</p>
            <button className="button secondary" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            <StatCards stats={stats} />

            {actionError && (
              <div className="banner error" role="alert">
                {actionError}
                <button className="icon-button" onClick={() => setActionError("")} aria-label="Dismiss">
                  ✕
                </button>
              </div>
            )}

            <div className="content-grid">
              <section className="panel table-panel" aria-labelledby="tasks-heading">
                <div className="panel-header">
                  <h2 id="tasks-heading">Tasks</h2>
                  <FilterBar active={filter} counts={counts} onChange={setFilter} />
                </div>
                <TaskTable
                  tasks={visibleTasks}
                  busyId={busyId}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              </section>

              <div className="side-column">
                <ActivityFeed tasks={tasks} />
                <PipelineIndicator />
              </div>
            </div>
          </>
        )}
      </main>

      {modalOpen && <TaskModal onClose={() => setModalOpen(false)} onSubmit={handleCreate} />}
    </div>
  );
}
