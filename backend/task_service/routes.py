from flask import Blueprint, request, jsonify, abort
from datetime import datetime, timezone, timedelta
from models import db, Task, Tag
from sqlalchemy import func, or_, desc, asc, text, nulls_last
import os, requests
from werkzeug.exceptions import HTTPException
from shared.event_client import EventClient, Events
from dateutil.relativedelta import relativedelta  # for monthly repeat
from dateutil import parser
from config import Config

bp = Blueprint("tasks", __name__,  url_prefix="/api/v1")
PET_SERVICE_URL = f"{Config.API_GATEWAY_URL}/v1/pet-service"

PRIORITIES = {"low", "medium", "high"}
TAG_WHITELIST = {"feeding", "cleaning", "playing"}

# Initialize event client
event_client = EventClient()

def _truthy(v) -> bool:
    return str(v).lower() in {"1", "true", "yes", "y"}

def parse_iso(dt_str):
    if not dt_str:
        return None
    dt = datetime.fromisoformat(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def _utc_now():
    return datetime.now(timezone.utc)

def _utc_now_iso():
    return _utc_now().isoformat(timespec='milliseconds').replace('+00:00', 'Z')

def current_user_id():
    uid = request.headers.get("X-User-Id")
    if not uid:
        abort(401, "missing user id")
    return uid

def get_task_for_current_user(task_id, include_deleted=False):
    uid = current_user_id()
    q = Task.query.filter_by(id=task_id, user_id=uid)
    if not include_deleted:
        q = q.filter(Task.deleted_at.is_(None))
    t = q.first()
    if not t:
        abort(404)
    return t

@bp.app_errorhandler(HTTPException)
def handle_http_exc(e):
    return jsonify({"error": e.name, "message": e.description}), e.code


@bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Task Service is running', 'service': 'task_service'}), 200

@bp.route("/tasks", methods=["POST"])
def create_task():
    uid = current_user_id()
    data = request.get_json(force=True)
    print(f"inside create task = {data}")
    title = (data.get("title") or "").strip()
    if not title:
        abort(400, "title is required")

    priority = (data.get("priority") or "medium").lower()
    if priority not in PRIORITIES:
        abort(400, "invalid priority (low|medium|high)")

    # Parse due_at input
    due_at_input = data.get("due_at")
    if due_at_input:
        due_at = parser.parse(due_at_input)
        # if due_at <= _utc_now():
        #     abort(400, "due_at must be in the future (UTC)")
    else:
        # Default to tomorrow at midnight UTC
        tomorrow = _utc_now() + timedelta(days=1)
        due_at = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)

    raw_tags = data.get("tags") or []
    status = (data.get("status") or "").lower()
    if status == "completed" or status == "done":
        abort(400, "Task status cannot be set to completed.")

    if isinstance(raw_tags, str):
        raw_tags = [raw_tags]

    if len(raw_tags) > 1:
        abort(400, "only one tag is allowed per task")

    tags_to_save = []
    if len(raw_tags) == 1:
        tag = raw_tags[0]
        if tag not in TAG_WHITELIST:
            abort(400, f"invalid tag: {tag}; allowed: {sorted(TAG_WHITELIST)}")
        tags_to_save = [tag]

    repeat_every = data.get("repeat_every")  # None | 'daily' | 'weekly' | 'monthly'
    if repeat_every is not None:
        repeat_every = repeat_every.lower()
        if repeat_every not in {"daily", "weekly", "monthly"}:
            abort(400, "repeat_every must be daily|weekly|monthly")

    repeat_until = None
    if data.get("repeat_until"):
        repeat_until = parser.parse(data["repeat_until"])
        if repeat_until <= due_at:
            abort(400, "repeat_until must be after due_at")

    t = Task(
        user_id=uid,
        title=title,
        description=data.get("description"),
        priority=priority,
        due_at=due_at,
        tags=tags_to_save,
        points=int(data.get("points") or 0),
        status=status or "todo",

        repeat_every=None,
        is_recurring_template=False,
        repeat_until=None,
        next_occurrence_at=None,
    )
    db.session.add(t)
    db.session.flush()  

    if repeat_every and repeat_until:
        current_due = due_at

        while True:
  
            if repeat_every == "daily":
                current_due = current_due + timedelta(days=1)
            elif repeat_every == "weekly":
                current_due = current_due + timedelta(weeks=1)
            elif repeat_every == "monthly":
                current_due = current_due + relativedelta(months=1)


            if current_due > repeat_until:
                break

            clone = Task(
                user_id=uid,
                title=title,
                description=data.get("description"),
                priority=priority,
                due_at=current_due,
                tags=tags_to_save,
                points=int(data.get("points") or 0),
                status="todo",
                repeat_every=None,
                is_recurring_template=False,
                repeat_until=None,
                next_occurrence_at=None,
            )
            db.session.add(clone)

    db.session.commit()

    return jsonify(t.to_dict()), 201


@bp.route("/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    t = get_task_for_current_user(task_id)
    return jsonify(t.to_dict())

@bp.route("/tasks", methods=["GET"])
def list_tasks():
    uid = current_user_id()
    q = Task.query.filter_by(user_id=uid)

    only_deleted = _truthy(request.args.get("only_deleted"))
    include_deleted = _truthy(request.args.get("include_deleted"))
    if only_deleted:
        q = q.filter(Task.deleted_at.isnot(None))
    elif not include_deleted:
        q = q.filter(Task.deleted_at.is_(None))

    status = request.args.get("status")
    if status:
        q = q.filter(Task.status == status)

    priority = request.args.get("priority")
    if priority:
        q = q.filter(Task.priority == priority)

    tag = request.args.get("tag")
    if tag:
        tag = tag.strip()
        q = q.filter(Task.tags.isnot(None), Task.tags.contains([tag]))

    query_text = request.args.get("query")
    if query_text:
        like = f"%{query_text}%"
        q = q.filter(or_(Task.title.ilike(like), Task.description.ilike(like)))

    # sort
    sort = request.args.get("sort", "-id")
    def apply_sort(q, key):
        direction = desc if key.startswith("-") else asc
        col = key.lstrip("-")
        mapping = {
            "id": Task.id,
            "title": Task.title,
            "status": Task.status,
            "priority": Task.priority,
            "due_at": Task.due_at,
            "created_at": Task.created_at,
        }
        if col in mapping:
            return q.order_by(nulls_last(direction(mapping[col])))
        return q
    for part in sort.split(","):
        q = apply_sort(q, part.strip())

    # pagination
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(max(int(request.args.get("limit", 50)), 1), 100)
    items = q.limit(limit).offset((page-1)*limit).all()
    total = q.order_by(None).count()

    response = {
        "items": [t.to_dict() for t in items],
        "page": page,
        "limit": limit,
        "total": total,
    }
        
    return jsonify(response), 200

@bp.route("/tasks/<int:task_id>/events/retry", methods=["POST"])
def retry_complete_event(task_id):
    uid = current_user_id()
    t = Task.query.filter_by(id=task_id).first_or_404()
    if t.status != "completed" or t.status != 'done':
        abort(400, "task not completed")
    if t.completed_event_emitted_at:
        return t.to_dict(), 200

@bp.route("/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    uid = current_user_id()
    t = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    data = request.get_json(force=True)
    print(f'Task to update to the given params: {data}')

    if "status" in data:
        if data["status"] == "done":
            t.status = "completed"
        else:
            t.status = data["status"]

    if "title" in data:
        new_title = (data["title"] or "").strip()
        if not new_title:
            abort(400, "title cannot be empty")
        t.title = new_title

    if "description" in data:
        t.description = data["description"]

    if "priority" in data:
        p = (data["priority"] or "").lower()
        if p and p not in PRIORITIES:
            abort(400, "invalid priority (low|medium|high)")
        if p:
            t.priority = p

    if "due_at" in data:
        new_due = parse_iso(data["due_at"])
        new_due = new_due.replace(hour=23, minute=59, second=59)
        t.due_at = new_due


    if "tags" in data:
        incoming = data["tags"] or [] 
        if len(incoming) > 1:
            abort(400, "only one tag is allowed per task")
        if incoming:
            tag = incoming[0]
            if tag not in TAG_WHITELIST:
                abort(400, f"invalid tag: {tag}; allowed={sorted(TAG_WHITELIST)}")
            t.tags = [tag]
        else:
            t.tags = []

    if "points" in data:
        t.points = int(data["points"] or 0)

    if "repeat_every" in data:
        val = data["repeat_every"]
        if val is None or val == "":
            t.repeat_every = None
            t.next_occurrence_at = None
        else:
            val = val.lower()
            if val not in {"daily", "weekly", "monthly"}:
                abort(400, "repeat_every must be daily|weekly|monthly")
            t.repeat_every = val

    if "next_occurrence_at" in data:
        nxt = parse_iso(data["next_occurrence_at"])
        t.next_occurrence_at = nxt

    if "repeat_until" in data:
        val = data["repeat_until"]
        if not val:
            t.repeat_until = None
        else:
            end_dt = parser.parse(val)
            if t.due_at and end_dt <= t.due_at:
                abort(400, "repeat_until must be after due_at")
            t.repeat_until = end_dt


    db.session.commit()

    return jsonify(t.to_dict()), 200

@bp.route("/tasks/<int:task_id>/start", methods=["POST"])
def start_task(task_id):
    uid = current_user_id()
    t = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    if t.status != "todo":
        abort(400, "can only start from 'todo'")
    t.status = "in_progress"
    db.session.commit()

    return jsonify(t.to_dict()), 200

@bp.route("/tasks/<int:task_id>/complete", methods=["POST"])
def complete_task(task_id):
    uid = current_user_id()
    t = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    if t.status != "completed":
        t.status = "completed"
        t.completed_at = t.completed_at or datetime.now(timezone.utc)

    print(f'Task-{task_id} is set to completed successfully.')
    
    if t.completed_event_emitted_at is None:
        payload = {
            "type": "TASK_COMPLETED",
            "source": "task_service",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "idempotency_key": f"task:{t.id}:completed",
            "user_id": t.user_id,  
            "task_id": t.id,
            "points": int(t.points or 0),
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "metadata": {"priority": t.priority, "tags": t.tags or []},
        }
        try:
            r = requests.post(f"{Config.API_GATEWAY_URL}/v1/pet-service/events", json=payload, timeout=3)
            if r.ok:
                t.completed_event_emitted_at = datetime.now(timezone.utc)
           
        except Exception:
            pass

    db.session.commit() 
    return jsonify(t.to_dict()), 200

# soft delete
@bp.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    uid = current_user_id()
    t = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    t.deleted_at = datetime.now(timezone.utc)
    db.session.commit()

    # Emit event to API Gateway
    event_client.emit(Events.TASK_DELETED, {
        "task_id": t.id,
        "title": t.title,
        "user_id": t.user_id,
    })
    return "", 204

# restore
@bp.route("/tasks/<int:task_id>/restore", methods=["POST"])
def restore_task(task_id):
    uid = current_user_id()
    t = Task.query.filter_by(id=task_id, user_id=uid).first_or_404()
    if not t.deleted_at:
        abort(400, description="task is not deleted")
    t.deleted_at = None
    db.session.commit()
    
    return jsonify(t.to_dict()), 200

@bp.route("/tags", methods=["GET"])
def list_tags():
    return {"items": sorted(TAG_WHITELIST)}, 200

@bp.route("/tags", methods=["POST"])
def create_tag():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        abort(400, "name is required")
    if name not in TAG_WHITELIST:
        abort(400, f"invalid tag: {name}; allowed={sorted(TAG_WHITELIST)}")
    if Tag.query.filter_by(name=name).first():
        abort(409, "tag already exists")
    db.session.add(Tag(name=name))
    db.session.commit()
    return jsonify({"name": name}), 201

@bp.route("/tags/<string:name>", methods=["DELETE"])
def delete_tag(name):
    t = Tag.query.filter_by(name=name).first()
    if not t:
        abort(404, "tag not found")
    db.session.delete(t)
    db.session.commit()
    return "", 204

@bp.route("/tasks/<int:task_id>/tags", methods=["POST"])
def attach_tag(task_id):
    t = get_task_for_current_user(task_id)
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        abort(400, "name is required")
    
    if name not in TAG_WHITELIST:
        abort(400, f"invalid tag: {name}; allowed={sorted(TAG_WHITELIST)}")

    tags = set(t.tags or [])
    tags.add(name)
    t.tags = sorted(tags)
    db.session.commit()
    return jsonify(t.to_dict()), 200

@bp.route("/tasks/<int:task_id>/tags/<string:name>", methods=["DELETE"])
def detach_tag(task_id, name):
    t = get_task_for_current_user(task_id)
    tags = set(t.tags or [])
    if name in tags:
        tags.remove(name)
        t.tags = sorted(tags)
        db.session.commit()
    return t.to_dict(), 200  # idempotent

@bp.route("/tasks/recurring/run", methods=["POST"])
def run_recurring():
    now = _utc_now()

    to_spawn = Task.query.filter(
        Task.repeat_every.isnot(None),
        Task.next_occurrence_at.isnot(None),
        Task.next_occurrence_at <= now,
        Task.deleted_at.is_(None)
    ).all()

    spawned = []
    for tmpl in to_spawn:
        if tmpl.repeat_until and tmpl.next_occurrence_at > tmpl.repeat_until:
            tmpl.repeat_every = None
            tmpl.next_occurrence_at = None
            continue

        new_task = Task(
            user_id=tmpl.user_id,
            title=tmpl.title,
            description=tmpl.description,
            priority=tmpl.priority,
            due_at=tmpl.next_occurrence_at, 
            tags=tmpl.tags,
            points=tmpl.points,
            status="todo",
        )
        db.session.add(new_task)
        spawned.append(new_task)

        if tmpl.repeat_every == "daily":
            tmpl.next_occurrence_at = tmpl.next_occurrence_at + timedelta(days=1)
        elif tmpl.repeat_every == "weekly":
            tmpl.next_occurrence_at = tmpl.next_occurrence_at + timedelta(weeks=1)
        elif tmpl.repeat_every == "monthly":
            tmpl.next_occurrence_at = tmpl.next_occurrence_at + timedelta(days=30)

    db.session.commit()
    return {
        "spawned": [t.to_dict() for t in spawned],
        "count": len(spawned),
    }, 200