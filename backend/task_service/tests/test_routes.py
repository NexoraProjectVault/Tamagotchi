from models import db, Task

API = "/api/v1"

def test_health(client):
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    assert r.get_json()["service"] == "task_service"

def test_create_validation(client):
    r = client.post(f"{API}/tasks", json={"priority": "low"})
    assert r.status_code == 400
    r = client.post(f"{API}/tasks", json={"title": "x", "priority": "bad"})
    assert r.status_code == 400

def test_crud_flow(client):
    r = client.post(f"{API}/tasks", json={"title": "Read spec", "description": "Milestone 2"})
    assert r.status_code == 201
    tid = r.get_json()["id"]

    r = client.get(f"{API}/tasks/{tid}")
    assert r.status_code == 200
    assert r.get_json()["title"] == "Read spec"

    r = client.patch(f"{API}/tasks/{tid}", json={"priority": "low"})
    assert r.status_code == 200
    assert r.get_json()["priority"] == "low"

    r = client.post(f"{API}/tasks/{tid}/complete")
    assert r.status_code == 200
    assert r.get_json()["status"] == "done"

    r = client.get(f"{API}/tasks?status=done")
    assert r.status_code == 200
    assert any(item["id"] == tid for item in r.get_json()["items"])

    r = client.delete(f"{API}/tasks/{tid}")
    assert r.status_code == 204
