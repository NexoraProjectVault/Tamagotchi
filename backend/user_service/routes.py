from flask import Blueprint, request, jsonify, session
from datetime import datetime
from models import db, User
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from auth import make_access_token, auth_required

# Blueprint for user-related routes
users_bp = Blueprint("users", __name__, url_prefix="/api/v1")

@users_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'User Service is running', 'service': 'user-service'}), 200


@users_bp.route("/auth/register", methods=["POST"])
def register():
    # Ensure request is JSON
    if not request.is_json:
        return jsonify({"error": "bad_request", "message": "Content-Type must be application/json"}), 400

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "bad_json", "message": "Malformed JSON body"}), 400

    # Extract and validate fields
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "missing_fields", "message": "email and password are required"}), 400
    if len(email) > 120:
        return jsonify({"error": "email_too_long"}), 400
    if len(password) < 8:
        return jsonify({"error": "weak_password", "message": "password must be at least 8 characters"}), 400

    try:
        email = validate_email(email, check_deliverability=False).email
    except EmailNotValidError as e:
        return jsonify({"error": "invalid_email", "message": str(e)}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email_exists"}), 409

    # Create new user
    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "email_exists"}), 409

    return jsonify({
        "message": "registered", 
        "user": {"id": user.id, "email": user.email}
        }), 201


@users_bp.route("/auth/login", methods=["POST"])
def login():
    if not request.is_json:
        return jsonify({"error": "bad_request", "message": "Content-Type must be application/json"}), 400
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "bad_json", "message": "Malformed JSON body"}), 400

    email_raw = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email_raw or not password:
        return jsonify({"error": "missing_fields", "message": "email and password are required"}), 400

    try:
        email = validate_email(email_raw, check_deliverability=False).email
    except EmailNotValidError:
        return jsonify({"error": "invalid_credentials"}), 401

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid_credentials"}), 401

    access_token = make_access_token(user.id)

    return jsonify({
        "message": "ok",
        "access_token": access_token,
        # optional: return minimal user info if frontend wants to hydrate quickly
        "user": {"id": user.id, "email": user.email}
    }), 200


@users_bp.get("/users/me")
@auth_required
def get_me():
    uid = getattr(request, "user_id", None)
    if not uid:
        return jsonify({"error": "unauthorized"}), 401

    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "not_found"}), 404

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }), 200


@users_bp.route("/auth/logout", methods=["POST"])
@auth_required
def logout():
    """
    Stateless logout for JWT-based auth.
    Requires a valid token for consistency.
    The client should delete its token after calling this.
    """
    return jsonify({"message": "logged out"}), 200
# Note: Since JWTs are stateless, logout is handled on the client side by deleting the token.


def _norm(s):
    return s.strip() if isinstance(s, str) else s

@users_bp.route("/users/me", methods=["PATCH"])
@auth_required
def update_me():
    # 1) JSON required
    if not request.is_json:
        return jsonify({"error": "bad_request", "message": "Content-Type must be application/json"}), 400
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "bad_json", "message": "Malformed JSON body"}), 400

    # 2) Load current user
    uid = getattr(request, "user_id", None)
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "user_not_found"}), 404

    # 3) Extract allowed fields only
    name  = _norm(data.get("name"))
    phone = _norm(data.get("phone"))
    addr  = _norm(data.get("address"))

    # 4) Validate constraints
    if name  is not None and len(name)  > 100: return jsonify({"error":"invalid_name","message":"name must be ≤ 100 chars"}), 400
    if phone is not None and len(phone) > 15:  return jsonify({"error":"invalid_phone","message":"phone must be ≤ 15 chars"}), 400
    if addr  is not None and len(addr)  > 255: return jsonify({"error":"invalid_address","message":"address must be ≤ 255 chars"}), 400

    # 5) Apply changes
    changed = False
    if name  is not None and name  != user.name:    user.name    = name or None;   changed = True
    if phone is not None and phone != user.phone:   user.phone   = phone or None;  changed = True
    if addr  is not None and addr  != user.address: user.address = addr or None;   changed = True

    if not changed:
        # No-op: return current profile
        return jsonify({
            "id": user.id, "name": user.name, "email": user.email,
            "phone": user.phone, "address": user.address,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None
        }), 200

    # 6) Commit
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "db_transaction_error"}), 500

    # 7) Return updated profile
    return jsonify({
        "id": user.id, "name": user.name, "email": user.email,
        "phone": user.phone, "address": user.address,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }), 200


@users_bp.post("/users/me/password")
@auth_required
def change_password():
    # 1) JSON required
    if not request.is_json:
        return jsonify({"error": "bad_request", "message": "Content-Type must be application/json"}), 400
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "bad_json", "message": "Malformed JSON body"}), 400

    # 2) Load current user
    uid = getattr(request, "user_id", None)
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "user_not_found"}), 404

    # 3) Extract passwords
    curpwd = data.get("current_password") or ""
    newpwd = data.get("new_password") or ""

    # 4) Validate presence + rules
    if not curpwd or not newpwd:
        return jsonify({"error":"invalid_password_change","message":"current_password and new_password are required"}), 400
    if len(newpwd) < 8:
        return jsonify({"error":"weak_password","message":"new_password must be at least 8 characters"}), 400
    if not user.check_password(curpwd):
        return jsonify({"error":"wrong_password","message":"current_password is incorrect"}), 403
    if curpwd == newpwd:
        return jsonify({"error":"same_password","message":"new_password must be different"}), 400

    # 5) Update + commit
    user.set_password(newpwd)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error":"db_transaction_error"}), 500

    # 6) Done
    return jsonify({"message":"password_updated"}), 200
