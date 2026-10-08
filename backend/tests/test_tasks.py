def test_list_tasks_starts_empty(client):
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == []


def test_create_task_applies_defaults(client):
    response = client.post("/api/tasks", json={"title": "Set up CI"})
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["title"] == "Set up CI"
    assert body["status"] == "todo"
    assert body["priority"] == "medium"
    assert body["description"] == ""
    assert body["assignee"] is None


def test_create_task_rejects_empty_title(client):
    response = client.post("/api/tasks", json={"title": ""})
    assert response.status_code == 422


def test_create_task_rejects_invalid_status(client):
    response = client.post("/api/tasks", json={"title": "x", "status": "blocked"})
    assert response.status_code == 422


def test_get_task_by_id(client, make_task):
    created = make_task(title="Read me")
    response = client.get(f"/api/tasks/{created['id']}")
    assert response.status_code == 200
    assert response.json()["title"] == "Read me"


def test_get_missing_task_returns_404(client):
    response = client.get("/api/tasks/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


def test_list_returns_newest_first(client, make_task):
    first = make_task(title="first")
    second = make_task(title="second")
    ids = [t["id"] for t in client.get("/api/tasks").json()]
    assert ids == [second["id"], first["id"]]


def test_list_can_filter_by_status(client, make_task):
    make_task(title="a", status="todo")
    make_task(title="b", status="done")
    response = client.get("/api/tasks", params={"status": "done"})
    assert response.status_code == 200
    assert [t["title"] for t in response.json()] == ["b"]


def test_update_task_changes_only_sent_fields(client, make_task):
    created = make_task(title="Original", priority="low")
    response = client.put(f"/api/tasks/{created['id']}", json={"status": "in_progress"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["title"] == "Original"
    assert body["priority"] == "low"


def test_update_task_ignores_null_for_required_fields(client, make_task):
    created = make_task(title="Keep me")
    response = client.put(f"/api/tasks/{created['id']}", json={"title": None})
    assert response.status_code == 200
    assert response.json()["title"] == "Keep me"


def test_update_missing_task_returns_404(client):
    response = client.put("/api/tasks/9999", json={"status": "done"})
    assert response.status_code == 404


def test_delete_task(client, make_task):
    created = make_task()
    response = client.delete(f"/api/tasks/{created['id']}")
    assert response.status_code == 204
    assert client.get(f"/api/tasks/{created['id']}").status_code == 404


def test_delete_missing_task_returns_404(client):
    assert client.delete("/api/tasks/9999").status_code == 404


def test_stats_counts_by_status_and_open_high_priority(client, make_task):
    make_task(status="todo", priority="high")
    make_task(status="in_progress", priority="medium")
    make_task(status="done", priority="high")  # done tasks don't count as high priority
    make_task(status="done", priority="low")
    response = client.get("/api/tasks/stats")
    assert response.status_code == 200
    assert response.json() == {
        "total": 4,
        "todo": 1,
        "in_progress": 1,
        "done": 2,
        "high_priority": 1,
    }


def test_stats_on_empty_database(client):
    assert client.get("/api/tasks/stats").json() == {
        "total": 0,
        "todo": 0,
        "in_progress": 0,
        "done": 0,
        "high_priority": 0,
    }
