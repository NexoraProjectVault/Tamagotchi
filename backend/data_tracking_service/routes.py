from flask import Blueprint, request, jsonify, abort
from datetime import datetime, timezone
from models import db, Roadmap
import os, requests
from werkzeug.exceptions import HTTPException
from shared.event_client import EventClient, Events
from config import Config

data_tracking_bp = Blueprint("data-tracking-service", __name__,  url_prefix="/api/v1")

# Initialize event client
event_client = EventClient()

@data_tracking_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Data_Tracking Service is running', 'service': 'data_tracking_service'}), 200

def _utc_now():
    return datetime.now(timezone.utc)

def current_user_id():
    # e.g., from auth middleware; fallback to header for now
    uid = request.headers.get("X-User-Id")
    if not uid:
        abort(401, "missing user id")
    return uid

def get_roadmap_for_current_user(roadmap_id):
    """Get roadmap for current user, aborting if not found or doesn't belong to user."""
    uid = current_user_id()
    r = Roadmap.query.filter_by(id=roadmap_id, user_id=uid).first()
    if not r:
        abort(404)
    return r

def parse_iso(dt_str):
    if not dt_str:
        return None
    dt = datetime.fromisoformat(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def normalize_task_ids(task_ids):
    if task_ids is None:
        return []
    if not isinstance(task_ids, list):
        abort(400, "task_ids must be a list of task identifiers")
    normalized_ids = []
    for task_id in task_ids:
        try:
            normalized_ids.append(int(task_id))
        except (TypeError, ValueError):
            abort(400, f"Invalid task_id value: {task_id}")
    return normalized_ids

@data_tracking_bp.app_errorhandler(HTTPException)
def handle_http_exc(e):
    return jsonify({"error": e.name, "message": e.description}), e.code

def _sync_roadmap_with_tasks(roadmap):
    """
    Sync roadmap with actual task statuses from task service.
    - Removes deleted tasks from task_ids
    - Updates completed_tasks count based on actual task statuses
    - Updates total_tasks count
    """
    if not roadmap.task_ids:
        return
    
    uid = current_user_id()
    
    valid_task_ids = []
    completed_count = 0
    
    for task_id in roadmap.task_ids:
        try:
            # Pass X-User-Id header to ensure we only get tasks belonging to the user
            headers = {"X-User-Id": uid}
            response = requests.get(f"{Config.API_GATEWAY_URL}/v1/task-service/tasks/{task_id}", headers=headers, timeout=3)
            if response.ok:
                task_data = response.json()
                
                # Check if task is deleted
                if task_data.get('deleted_at'):
                    # Task is deleted - remove from roadmap
                    continue
                
                # Task is valid - keep it
                valid_task_ids.append(task_id)
                
                # Check if task is completed
                status = task_data.get('status', '').lower()
                if status in ['completed', 'done']:
                    completed_count += 1
            elif response.status_code == 404:
                # Task not found (likely deleted or doesn't belong to user) - remove from roadmap
                continue
            else:
                # Other error - assume task still exists (don't remove it)
                # This prevents removing tasks due to temporary service issues
                valid_task_ids.append(task_id)
        except Exception:
            # On error, assume task still exists (don't remove it)
            # This prevents removing tasks due to temporary service issues
            valid_task_ids.append(task_id)
    
    # Update roadmap with synced data
    roadmap.task_ids = valid_task_ids
    roadmap.total_tasks = len(valid_task_ids)
    roadmap.completed_tasks = completed_count
    roadmap.progress_percentage = roadmap.calculate_progress()
    roadmap.updated_at = _utc_now()
    
    db.session.commit()

@data_tracking_bp.route('/roadmaps', methods=['POST'])
def create_roadmap():
    uid = current_user_id()
    data = request.get_json(force=True)
    title = data.get('title' or "").strip()
    if not title:
        abort (400, "Title of roadmap is required")

    # Check if there are already 3 active roadmaps (limit) for this user
    active_roadmaps_count = Roadmap.query.filter(
        Roadmap.user_id == uid,
        Roadmap.completed_at.is_(None)
    ).count()
    
    if active_roadmaps_count >= 3:
        abort(400, "Maximum limit of 3 roadmaps reached. Please complete or delete an existing roadmap before creating a new one.")

    #Non Mandatory Fields
    description = data.get('description' or "").strip()

    #Get the tasks that should be under roadmap
    task_ids = normalize_task_ids(data.get('task_ids'))

    due_date = parse_iso(data.get('due_date'))
        
    # Fetch task statuses from task-service
    headers = {"X-User-Id": uid}
    
    completed_tasks = 0
    valid_task_ids = []
    
    if task_ids:
        for task_id in task_ids:
            try:
                # Pass X-User-Id header to ensure we only get tasks belonging to the user
                response = requests.get(f"{Config.API_GATEWAY_URL}/v1/task-service/tasks/{task_id}", headers=headers, timeout=3)
                if response.ok:
                    task_data = response.json()
                    valid_task_ids.append(task_id)
                    if task_data.get('status') == 'done' or task_data.get('status') == 'completed':
                        completed_tasks += 1
                elif response.status_code == 404:
                    # Task doesn't exist or doesn't belong to user - skip it
                    continue
            except Exception:
                # Handle connection errors gracefully - assume task exists
                valid_task_ids.append(task_id)

    r = Roadmap(
        user_id=uid,
        title=title,
        description=description,
        total_tasks=len(valid_task_ids),
        completed_tasks=completed_tasks,
        task_ids=valid_task_ids,
        due_date=due_date,
        created_at=_utc_now(),
        updated_at=_utc_now(),
    )
    #Calculate progress
    r.progress_percentage = r.calculate_progress()

    db.session.add(r)
    db.session.commit()
    
    # Emit event to API Gateway
    event_client.emit(Events.ROADMAP_CREATED, {
        "roadmap_id": r.id,
        "title": r.title,
        "user_id": r.user_id,
    })
    
    return r.to_dict(), 201

@data_tracking_bp.route('/roadmaps', methods=['GET'])
def get_all_roadmaps():
    uid = current_user_id()
    roadmaps = Roadmap.query.filter(
        Roadmap.user_id == uid,
        Roadmap.completed_at.is_(None)
    ).limit(3).all()
    
    # Sync each roadmap with actual task statuses
    for roadmap in roadmaps:
        _sync_roadmap_with_tasks(roadmap)
    
    return [r.to_dict() for r in roadmaps], 200

@data_tracking_bp.route('/roadmaps/<int:roadmap_id>', methods=['GET'])
def get_roadmap(roadmap_id):
    r = get_roadmap_for_current_user(roadmap_id)
    
    # Sync roadmap with actual task statuses
    _sync_roadmap_with_tasks(r)
    
    return r.to_dict(), 200 

@data_tracking_bp.route('/roadmaps/<int:roadmap_id>', methods=['DELETE'])
def delete_roadmap(roadmap_id):
    r = get_roadmap_for_current_user(roadmap_id)
    r.completed_at = _utc_now()
    db.session.commit()
    
    # Emit event to API Gateway
    event_client.emit(Events.ROADMAP_DELETED, {
        "roadmap_id": r.id,
        "title": r.title,
        "user_id": r.user_id,
    })
    
    return "", 204

@data_tracking_bp.route('/roadmaps/<int:roadmap_id>', methods=['PATCH'])
def update_roadmap(roadmap_id):
    uid = current_user_id()
    r = get_roadmap_for_current_user(roadmap_id)
    data = request.get_json(force=True)
    
    # Update title if provided
    if 'title' in data:
        title = (data.get('title') or "").strip()
        if not title:
            abort(400, "Title of roadmap cannot be empty")
        r.title = title
    
    # Update description if provided
    if 'description' in data:
        r.description = (data.get('description') or "").strip()

    if 'due_date' in data:
        due_date_value = data.get('due_date')
        if due_date_value is None or due_date_value == '':
            r.due_date = None
        else:
            r.due_date = parse_iso(due_date_value)
    
    # Update task_ids and recalculate if provided
    if 'task_ids' in data:
        task_ids = normalize_task_ids(data.get('task_ids'))
        
        # Fetch task statuses from task-service
        headers = {"X-User-Id": uid}
        
        total_tasks = len(task_ids)
        completed_tasks = 0
        valid_task_ids = []
        
        if task_ids:
            for task_id in task_ids:
                try:
                    # Pass X-User-Id header to ensure we only get tasks belonging to the user
                    response = requests.get(f"{Config.API_GATEWAY_URL}/v1/task-service/tasks/{task_id}", headers=headers, timeout=3)
                    if response.ok:
                        task_data = response.json()
                        valid_task_ids.append(task_id)
                        if task_data.get('status') == 'done' or task_data.get('status') == 'completed':
                            completed_tasks += 1
                    elif response.status_code == 404:
                        # Task doesn't exist or doesn't belong to user - skip it
                        continue
                except Exception:
                    # Handle connection errors gracefully - assume task exists
                    valid_task_ids.append(task_id)
        
        r.total_tasks = len(valid_task_ids)
        r.completed_tasks = completed_tasks
        r.progress_percentage = r.calculate_progress()
        r.task_ids = valid_task_ids
    
    # Update timestamp
    r.updated_at = _utc_now()
    
    db.session.commit()
    
    # Emit event to API Gateway
    event_client.emit(Events.ROADMAP_UPDATED, {
        "roadmap_id": r.id,
        "title": r.title,
        "user_id": r.user_id,
    })
    
    return r.to_dict(), 200

@data_tracking_bp.route('/roadmaps/<int:roadmap_id>/refresh', methods=['POST'])
def refresh_roadmap_progress(roadmap_id):
    uid = current_user_id()
    r = get_roadmap_for_current_user(roadmap_id)
    data = request.get_json(force=True)
    
    task_ids = normalize_task_ids(data.get('task_ids'))
    
    # Same fetch logic as create/update
    headers = {"X-User-Id": uid}
    
    total_tasks = len(task_ids)
    completed_tasks = 0
    valid_task_ids = []
    
    if task_ids:
        for task_id in task_ids:
            try:
                # Pass X-User-Id header to ensure we only get tasks belonging to the user
                response = requests.get(f"{Config.API_GATEWAY_URL}/v1/task-service/tasks/{task_id}", headers=headers, timeout=3)
                if response.ok:
                    task_data = response.json()
                    valid_task_ids.append(task_id)
                    if task_data.get('status') == 'done' or task_data.get('status') == 'completed':
                        completed_tasks += 1
                elif response.status_code == 404:
                    # Task doesn't exist or doesn't belong to user - skip it
                    continue
            except Exception:
                # Handle connection errors gracefully - assume task exists
                valid_task_ids.append(task_id)
    
    r.total_tasks = len(valid_task_ids)
    r.completed_tasks = completed_tasks
    r.progress_percentage = r.calculate_progress()
    r.task_ids = valid_task_ids
    r.updated_at = _utc_now()
    
    db.session.commit()
    return r.to_dict(), 200