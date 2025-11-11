# tests/test_routes_extra.py
API = "/api/v1"

def test_create_without_title(client):
    r = client.post(f"{API}/tasks", json={"description": "missing title"})
    assert r.status_code == 400

def test_partial_update(client):
    r = client.post(f"{API}/tasks", json={"title": "Do laundry"})
    assert r.status_code == 201
    tid = r.get_json()["id"]

    r = client.patch(f"{API}/tasks/{tid}", json={"description": "Use mild detergent"})
    assert r.status_code == 200
    assert r.get_json()["description"] == "Use mild detergent"

def test_filter_done_tasks(client):
    r = client.post(f"{API}/tasks", json={"title": "Finish report"})
    assert r.status_code == 201
    tid = r.get_json()["id"]

    client.post(f"{API}/tasks/{tid}/complete")

    r = client.get(f"{API}/tasks?status=done")
    assert r.status_code == 200
    assert any(item["id"] == tid for item in r.get_json()["items"])

def test_delete_and_get_404(client):
    r = client.post(f"{API}/tasks", json={"title": "Temp"})
    assert r.status_code == 201
    tid = r.get_json()["id"]

    r = client.delete(f"{API}/tasks/{tid}")
    assert r.status_code == 204

    r = client.get(f"{API}/tasks/{tid}")
    assert r.status_code == 404

def test_tags_crud(client):
    # create
    r = client.post("/api/v1/tags", json={"name":"ECE444"})
    assert r.status_code == 201
    # list
    r = client.get("/api/v1/tags")
    assert r.status_code == 200 and "ECE444" in r.get_json()["items"]
    # delete
    r = client.delete("/api/v1/tags/ECE444")
    assert r.status_code == 204

def test_list_filters_sort_pagination(client):
    # seed
    for i in range(15):
        client.post("/api/v1/tasks", json={
            "title": f"T{i}", "priority": "high" if i%2==0 else "low",
            "tags": ["work"] if i%3==0 else ["school"]
        })
    r = client.get("/api/v1/tasks?priority=high&tag=work&limit=5&page=1&sort=-created_at")
    data = r.get_json()
    assert r.status_code == 200 and data["page"] == 1 and data["limit"] == 5
    assert all(t["priority"] == "high" for t in data["items"])
    assert all("work" in (t["tags"] or []) for t in data["items"])

def test_complete_idempotent_and_event_flag(client, monkeypatch):
    # fake pet-service
    class FakeResp: ok=True
    calls = {"n": 0}
    def fake_post(*a, **k):
        calls["n"] += 1
        return FakeResp()
    import routes
    monkeypatch.setattr(routes.requests, "post", fake_post)

    r = client.post("/api/v1/tasks", json={"title":"X","points":10})
    tid = r.get_json()["id"]

    # first complete -> send event once
    r = client.post(f"/api/v1/tasks/{tid}/complete")
    assert r.status_code == 200
  
    r = client.post(f"/api/v1/tasks/{tid}/complete")
    assert r.status_code == 200
    assert calls["n"] == 1

