import datetime
import jwt
from jwt import InvalidTokenError
from functools import wraps
from flask import current_app, request, jsonify

def _now_utc():
    return datetime.datetime.utcnow()

def make_access_token(user_id: int) -> str:
    """Issue a short-lived access token."""
    now = _now_utc()
    ttl = int(current_app.config.get("JWT_ACCESS_TTL_MIN", 15))
    payload = {
        "sub": str(user_id),                               # who
        "iss": current_app.config.get("JWT_ISS", "user"),  # issuer
        "aud": current_app.config.get("JWT_AUD", "web"),   # audience
        "iat": now,
        "exp": now + datetime.timedelta(minutes=ttl),
        "scope": "access",
    }
    secret = current_app.config["JWT_SECRET"]
    return jwt.encode(payload, secret, algorithm="HS256")

def _decode_access_token(token: str):
    secret = current_app.config["JWT_SECRET"]
    iss = current_app.config.get("JWT_ISS", "user")
    aud = current_app.config.get("JWT_AUD", "web")
    return jwt.decode(token, secret, algorithms=["HS256"], issuer=iss, audience=aud)

def get_user_id_from_bearer() -> int | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = _decode_access_token(token)
        if payload.get("scope") != "access":
            return None
        return int(payload["sub"])
    except InvalidTokenError:
        return None
    except Exception:
        return None

def auth_required(fn):
    """JWT-only guard (clean and future-proof)."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        uid = get_user_id_from_bearer()
        if not uid:
            return jsonify({"error": "unauthorized"}), 401
        # stash for handlers
        request.user_id = uid
        return fn(*args, **kwargs)
    return wrapper
