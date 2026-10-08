const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "tasks", label: "My tasks", icon: "✓" },
  { id: "projects", label: "Projects", icon: "❖" },
  { id: "reports", label: "Reports", icon: "▤" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">✓</span>
        <span className="brand-name">TaskBoard</span>
      </div>

      <div className="workspace">
        <span className="workspace-label">Workspace</span>
        <strong>Platform Team</strong>
      </div>

      <nav aria-label="Main">
        <ul className="nav-list">
          {NAV_ITEMS.map((item, index) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={index === 0 ? "nav-link active" : "nav-link"}
                aria-current={index === 0 ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <span className="build-tag" title="Git commit this image was built from">
          build {import.meta.env.VITE_COMMIT_SHA?.slice(0, 7) || "local"}
        </span>
      </div>
    </aside>
  );
}
