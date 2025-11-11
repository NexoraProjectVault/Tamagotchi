# tests/test_tasks_api_v1.py
import pytest

API = "/api/v1"

def test_health(client):
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    assert r.get_json()["service"] == "task_service"

def test_create_ok_and_detail(client):
    body = {
        "title": "Write report",
        "description": "M2",
        "priority": "high",
        "due_at": "2030-01-01T12:00:00Z",
        "tags": ["school", "urgent"],
        "points": 5,
    }
    r = client.post(f"{API}/tasks", json=body)
    assert r.status_code == 201
    task = r.get_json()
    assert task["status"] == "todo"
    tid = task["id"]

    r = client.get(f"{API}/tasks/{tid}")
    assert r.status_code == 200
    got = r.get_json()
    assert got["priority"] == "high"
    assert got["tags"] == ["school", "urgent"]
    assert got["points"] == 5
    assert got["due_at"].startswith("2030-01-01T12:00:00")

def test_create_validation(client):

    r = client.post(f"{API}/tasks", json={"priority": "low"})
    assert r.status_code == 400
 
    r = client.post(f"{API}/tasks", json={"title": "x", "priority": "URG"})
    assert r.status_code == 400

def test_patch_partial_and_forbid_status(client):
   
    r = client.post(f"{API}/tasks", json={"title": "Edit me"})
    tid = r.get_json()["id"]

  
    r = client.patch(f"{API}/tasks/{tid}", json={
        "title": "Edited",
        "priority": "normal",
        "tags": ["t1","t2"],
        "points": 8,
        "due_at": "2031-05-01T00:00:00+00:00"
    })
    assert r.status_code == 200
    j = r.get_json()
    assert j["title"] == "Edited"
    assert j["priority"] == "normal"
    assert j["tags"] == ["t1","t2"]
    assert j["points"] == 8
    assert j["due_at"].startswith("2031-05-01T00:00:00")

   
    r = client.patch(f"{API}/tasks/{tid}", json={"status": "done"})
    assert r.status_code == 400

def test_start_and_complete_with_rules(client):
    r = client.post(f"{API}/tasks", json={"title": "Flow"})
    tid = r.get_json()["id"]

    
    r = client.post(f"{API}/tasks/{tid}/start")
    assert r.status_code == 200
    assert r.get_json()["status"] == "in_progress"

   
    r = client.post(f"{API}/tasks/{tid}/start")
    assert r.status_code == 400

   
    r = client.post(f"{API}/tasks/{tid}/complete")
    assert r.status_code == 200
    assert r.get_json()["status"] == "done"

def test_list_filter_and_soft_delete_restore(client):

    t1 = client.post(f"{API}/tasks", json={"title": "A"}).get_json()["id"]
    t2 = client.post(f"{API}/tasks", json={"title": "B"}).get_json()["id"]


    client.post(f"{API}/tasks/{t2}/complete")

    r = client.get(f"{API}/tasks?status=done")
    assert r.status_code == 200
    ids = [i["id"] for i in r.get_json()["items"]]
    assert t2 in ids and t1 not in ids


    r = client.delete(f"{API}/tasks/{t2}")
    assert r.status_code == 204


    r = client.get(f"{API}/tasks")
    ids = [i["id"] for i in r.get_json()["items"]]
    assert t2 not in ids and t1 in ids

   
    r = client.post(f"{API}/tasks/{t2}/restore")
    assert r.status_code == 200
    r = client.get(f"{API}/tasks")
    ids = [i["id"] for i in r.get_json()["items"]]
    assert t2 in ids
