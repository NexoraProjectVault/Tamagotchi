# /backend/pet_service/routes.py
# -----------------------------------------------------------------------------
# Pet Service API Blueprints
#
# Exposes REST endpoints for:
# - Health check
# - Pet CRUD (id-based; legacy/compat)
# - Pet status & points
# - Pet actions (feed/play/clean) with point spend + XP awards
# - “/me” endpoints (unique-per-user convenience)
# - Event ingestion with idempotency (adds XP and tag-specific points)
#
# Environment flags
# -----------------
# POINT_COST_PER_ACTION : int  -> cost to perform an action (UI should mirror)
# AUTO_CREATE_DEFAULT   : bool -> if True, auto-provision a default pet for a user
#
# Notes
# -----
# • Authentication: _get_uid_or_401() is a placeholder. In production, replace
#   with middleware that sets a verified user_id (e.g., JWT -> request context).
# • Pet.tick() is called opportunistically to apply time-based stat decay.
# • DB writes are explicitly committed after any change to persist updates.
# -----------------------------------------------------------------------------

from flask import Blueprint, request, jsonify, current_app
from models import db, Pet, EventLog
from sqlalchemy.exc import IntegrityError
import os

# Namespace: /api/v1
pets_bp = Blueprint('pets', __name__, url_prefix='/api/v1')

# Server-side action cost; keep this in sync with the frontend constant.
POINT_COST_PER_ACTION = int(os.getenv("POINT_COST_PER_ACTION"))
# Development helper: auto-create a default pet when a user has none.
#AUTO_CREATE_DEFAULT = os.getenv("AUTO_CREATE_DEFAULT_PET", "true").lower() in {"1", "true", "yes", "y"}

# ===== Helpers =================================================================

def _get_uid_or_401():
    """
    Determine the calling user's id.

    Production:
      - Replace with an auth layer that injects a verified user id (e.g., JWT).
    Current behavior:
      - Accept 'X-User-Id' header if present and numeric.
      - If missing/invalid and AUTO_CREATE_DEFAULT is True, use id = 1.
      - Otherwise, return None and let the caller receive HTTP 401.
    """
    uid = request.headers.get("X-User-Id")
    if uid:
        try:
            return int(uid)
        except ValueError:
            pass
    # if AUTO_CREATE_DEFAULT:
    #     return 1
    return None

def _get_user_pet(uid: int):
    """Return the first pet for a user (legacy: supports multi-pet DBs)."""
    return Pet.query.filter_by(user_id=uid).order_by(Pet.id.asc()).first()

def _get_or_create_user_pet(uid: int):
    """
    Fetch the user's pet or create a default one if allowed.

    Creation is gated by AUTO_CREATE_DEFAULT and seeds a mid-game pet so the UI
    has meaningful stats out-of-the-box for demos/dev.
    """
    # pet = _get_user_pet(uid)
    # if pet:
    #     return pet
    # if not AUTO_CREATE_DEFAULT:
    #     return None
    # # pet = Pet(
    # #     user_id=uid,
    # #     name="Tamagotchi",
    # #     breed="Dragon",
    # #     hunger=75, happiness=80, energy=60,
    # #     level=5, xp=50
    # # )
    # db.session.add(pet)
    # db.session.commit()
    # return pet
    return _get_user_pet(uid)

# ===== Health ==================================================================

@pets_bp.route('/health', methods=['GET'])
def health():
    """Lightweight health probe for orchestrators/uptime checks."""
    return jsonify({'status': 'Pet Service is running', 'service': 'pet_service'}), 200

# ===== CRUD (id-based; kept for compatibility) =================================

@pets_bp.route('/pets', methods=['POST'])
def create_pet():
    """
    Create a new pet row.

    Body:
      - name (str, required)
      - breed (str, required)
      - user_id (int, required)
      - age, description (optional)
    """
    data = request.get_json(force=True) or {}
    name = (data.get('name') or '').strip()
    breed = (data.get('breed') or '').strip()
    user_id = int(data.get('user_id') or 0)

    if not name or not breed or user_id <= 0:
        return jsonify({"error": "name, breed, user_id are required"}), 400

    # To enforce one-pet-per-user, add a DB unique index in migrations.
    pet = Pet(
        user_id=user_id,
        name=name,
        breed=breed,
        age=int(data.get('age') or 0) or None,
        description=(data.get('description') or None)
    )
    db.session.add(pet)
    db.session.commit()
    return jsonify(pet.to_dict()), 201

@pets_bp.route('/pets', methods=['GET'])
def list_pets():
    """List pets, optionally filtered by user_id."""
    q = Pet.query
    user_id = request.args.get('user_id')
    if user_id:
        q = q.filter_by(user_id=int(user_id))
    items = q.order_by(Pet.id.asc()).all()
    return jsonify({"items": [p.to_dict() for p in items]}), 200

@pets_bp.route('/pets/<int:pet_id>', methods=['GET'])
def get_pet(pet_id):
    """Get a pet by id; applies stat decay via tick() and persists if changed."""
    pet = Pet.query.get_or_404(pet_id)
    if pet.tick():
        db.session.commit()
    return jsonify(pet.to_dict()), 200

@pets_bp.route('/pets/<int:pet_id>', methods=['PATCH'])
def update_pet(pet_id):
    """
    Partial update for a pet's descriptive fields.

    Allows: name, breed, description, age.
    """
    pet = Pet.query.get_or_404(pet_id)
    data = request.get_json(force=True) or {}
    for key in ['name', 'breed', 'description']:
        if key in data:
            setattr(pet, key, (data.get(key) or None))
    if 'age' in data:
        pet.age = int(data.get('age') or 0) or None
    db.session.commit()
    return jsonify(pet.to_dict()), 200

# ===== Status (id-based; kept) =================================================

@pets_bp.route('/pets/<int:pet_id>/status', methods=['GET'])
def pet_status(pet_id):
    """Return only the dynamic status fields (stats/xp/level) for a pet id."""
    pet = Pet.query.get_or_404(pet_id)
    if pet.tick():
        db.session.commit()
    return jsonify({
        "hunger": pet.hunger,
        "happiness": pet.happiness,
        "energy": pet.energy,
        "level": pet.level,
        "xp": pet.xp,
        "xp_to_next": pet._xp_to_next(),
    }), 200

# ===== Default (dev helper; kept) =============================================

@pets_bp.route('/pets/default', methods=['GET'])
def get_default_pet():
    """Convenience endpoint for demos: returns (and auto-creates) pet for uid=1."""
    pet = _get_or_create_user_pet(uid=1)
    if pet.tick():
        db.session.commit()
    return jsonify(pet.to_dict()), 200

# ===== Points (id-based; kept) =================================================

@pets_bp.route('/pets/<int:pet_id>/points', methods=['GET'])
def get_points(pet_id):
    """Get the action-point balances for a specific pet."""
    pet = Pet.query.get_or_404(pet_id)
    return jsonify(pet.points_dict()), 200

# ===== Actions (id-based; kept) ================================================

def _apply_and_return(pet: Pet, action: str):
    """
    Core action executor:
      1) Apply decay (tick)
      2) Spend points (guarded by POINT_COST_PER_ACTION)
      3) Apply stat deltas (Pet.apply_action)
      4) Grant XP based on action type
      5) Commit and return updated pet + applied delta
    """
    pet.tick()

    # Spend points before applying stat bonuses.
    if not pet.spend_points(action, POINT_COST_PER_ACTION):
        return jsonify({"error": "insufficient_points", "message": f"Not enough points for '{action}'"}), 400

    # Apply stat changes for the action.
    delta = pet.apply_action(action)

    # XP rewards per action (configurable via Flask app config).
    xp_map = {
        "feed":  current_app.config.get("XP_PER_FEED", 10),
        "play":  current_app.config.get("XP_PER_PLAY", 15),
        "clean": current_app.config.get("XP_PER_CLEAN", 8),
    }
    pet.add_xp(int(xp_map.get(action, 0)))

    db.session.commit()
    return jsonify({
        "pet": pet.to_dict(),
        "applied": action,
        "delta": delta
    }), 200

@pets_bp.route('/pets/<int:pet_id>/actions/feed', methods=['POST'])
def action_feed(pet_id):
    """Spend points, apply 'feed' effects, and award XP."""
    pet = Pet.query.get_or_404(pet_id)
    return _apply_and_return(pet, "feed")

@pets_bp.route('/pets/<int:pet_id>/actions/play', methods=['POST'])
def action_play(pet_id):
    """Spend points, apply 'play' effects, and award XP."""
    pet = Pet.query.get_or_404(pet_id)
    return _apply_and_return(pet, "play")

@pets_bp.route('/pets/<int:pet_id>/actions/clean', methods=['POST'])
def action_clean(pet_id):
    """Spend points, apply 'clean' effects, and award XP."""
    pet = Pet.query.get_or_404(pet_id)
    return _apply_and_return(pet, "clean")

@pets_bp.route('/pets/<int:pet_id>/xp', methods=['POST'])
def add_xp(pet_id):
    """
    Directly add XP to a pet.

    Body:
      - points (int, >= 0)
    """
    pet = Pet.query.get_or_404(pet_id)
    data = request.get_json(force=True) or {}
    points = int(data.get('points') or 0)
    if points < 0:
        return jsonify({"error": "points must be >= 0"}), 400
    pet.add_xp(points)
    db.session.commit()
    return jsonify(pet.to_dict()), 200

# ===== Clean “/me” endpoints (unique-per-user) =================================

@pets_bp.route('/pets/me', methods=['GET'])
def me_get():
    """Return the caller's pet (auto-creates if AUTO_CREATE_DEFAULT is enabled)."""
    uid = _get_uid_or_401()
    if uid is None:
        return jsonify({"error": "unauthorized"}), 401
    pet = _get_or_create_user_pet(uid)
    if not pet:
        return jsonify({"error": "not_found"}), 404
    if pet.tick():
        db.session.commit()
    return jsonify(pet.to_dict()), 200

@pets_bp.route('/pets/me/status', methods=['GET'])
def me_status():
    """Return dynamic status fields for the caller's pet (with decay applied)."""
    uid = _get_uid_or_401()
    if uid is None:
        return jsonify({"error": "unauthorized"}), 401
    pet = _get_or_create_user_pet(uid)
    if not pet:
        return jsonify({"error": "not_found"}), 404
    if pet.tick():
        db.session.commit()
    return jsonify({
        "hunger": pet.hunger,
        "happiness": pet.happiness,
        "energy": pet.energy,
        "level": pet.level,
        "xp": pet.xp,
        "xp_to_next": pet._xp_to_next(),
    }), 200

@pets_bp.route('/pets/me/points', methods=['GET'])
def me_points():
    """Return the action-point balances for the caller's pet."""
    uid = _get_uid_or_401()
    if uid is None:
        return jsonify({"error": "unauthorized"}), 401
    pet = _get_or_create_user_pet(uid)
    if not pet:
        return jsonify({"error": "not_found"}), 404
    return jsonify(pet.points_dict()), 200

@pets_bp.route('/pets/me/actions/<string:action>', methods=['POST'])
def me_action(action):
    """
    Execute an action for the caller's pet.

    Path:
      - action in {"feed","play","clean"}
    """
    uid = _get_uid_or_401()
    if uid is None:
        return jsonify({"error": "unauthorized"}), 401
    pet = _get_or_create_user_pet(uid)
    if not pet:
        return jsonify({"error": "not_found"}), 404
    if action not in {"feed", "play", "clean"}:
        return jsonify({"error": "invalid_action"}), 400
    return _apply_and_return(pet, action)

@pets_bp.route('/pets/me/xp', methods=['POST'])
def me_xp():
    """Directly add XP to the caller's pet (non-negative only)."""
    uid = _get_uid_or_401()
    if uid is None:
        return jsonify({"error": "unauthorized"}), 401
    pet = _get_or_create_user_pet(uid)
    if not pet:
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(force=True) or {}
    points = int(data.get('points') or 0)
    if points < 0:
        return jsonify({"error": "points must be >= 0"}), 400
    pet.add_xp(points)
    db.session.commit()
    return jsonify(pet.to_dict()), 200

# ===== Events (unchanged but now adds points to buckets) =======================

def _process_event(payload):
    """
    Apply side effects for an ingested event.

    Current behavior (demo):
      - Assumes uid=1; map user identity properly in production.
      - TASK_COMPLETED:
          * Adds XP equal to 'points'
          * If metadata.tags[0] is in {"feeding","cleaning","playing"}, also
            increments the corresponding point bucket by the same amount.
    """
    event_type = (payload.get("type") or "").strip().upper()
    # In production: resolve payload.user_id -> pet.user_id mapping.
    pet = _get_or_create_user_pet(uid=1)

    if event_type == "TASK_COMPLETED":
        points = int(payload.get("points") or 0)
        pet.add_xp(points)

        meta = payload.get("metadata") or {}
        tags = meta.get("tags") or []
        tag = tags[0] if isinstance(tags, list) and tags else None

        if tag in {"feeding", "cleaning", "playing"}:
            pet.add_points(tag, points)

    db.session.commit()
    return {"pet_id": pet.id, "level": pet.level, "xp": pet.xp, **pet.points_dict()}

@pets_bp.route('/events', methods=['POST'])
def events_namespaced():
    """
    Ingest an event with idempotency.

    Body:
      - idempotency_key (str, required)
      - type (str, required)
      - ...additional fields in payload (stored in EventLog.payload)

    Returns 409 if the idempotency_key has already been processed.
    """
    data = request.get_json(force=True) or {}
    idem = (data.get("idempotency_key") or "").strip()
    etype = (data.get("type") or "").strip().upper()
    if not idem or not etype:
        return jsonify({"error": "Missing idempotency_key or type"}), 400

    try:
        # Persist the event log first to guarantee idempotency checks.
        log = EventLog(idempotency_key=idem, event_type=etype, payload=data)
        db.session.add(log)
        db.session.flush()
    except IntegrityError:
        # Another request already wrote the same idempotency_key.
        db.session.rollback()
        return jsonify({"error": "duplicate_event"}), 409

    result = _process_event(data)
    return jsonify({"status": "ok", "processed": etype, "result": result}), 200

# Root-level alias for /api/v1/events (kept for backwards compatibility).
root_bp = Blueprint('root', __name__)

@root_bp.route('/events', methods=['POST'])
def events_root_alias():
    """Backward-compatible alias that forwards to the namespaced endpoint."""
    return events_namespaced()
