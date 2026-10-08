// All calls use relative URLs: Vite (dev), Nginx (container) or the Ingress (Kubernetes)
// forwards /api to the backend, so the browser never needs the backend hostname.
const TASKS_URL = "/api/tasks";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d) => d.msg).join(", ");
    } catch {
      // response had no JSON body (e.g. a 502 from the proxy) - keep the generic message
    }
    throw new Error(detail);
  }

  return response.status === 204 ? null : response.json();
}

export const getTasks = () => request(TASKS_URL);
export const getStats = () => request(`${TASKS_URL}/stats`);
export const createTask = (task) =>
  request(TASKS_URL, { method: "POST", body: JSON.stringify(task) });
export const updateTask = (id, changes) =>
  request(`${TASKS_URL}/${id}`, { method: "PUT", body: JSON.stringify(changes) });
export const deleteTask = (id) => request(`${TASKS_URL}/${id}`, { method: "DELETE" });
