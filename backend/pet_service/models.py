# backend/pet_service/models.py
# -----------------------------------------------------------------------------
# SQLAlchemy models for the virtual pet service.
#
# - Pet: Player-owned pet with RPG-style stats, time-based decay, XP leveling,
#        and per-action point buckets (feeding/playing/cleaning).
# - EventLog: Append-only event store with idempotency enforcement.
#
# Configuration (Flask app.config)
# --------------------------------
# STAT_MIN / STAT_MAX                       -> stat clamping bounds (default 0..100)
# HUNGER_DECAY_SEC / ENERGY_DECAY_SEC /
#   HAPPINESS_DECAY_SEC                     -> seconds per -1 point for each stat
# PET_LEVEL_XP_BASE / PET_LEVEL_XP_GROWTH   -> XP curve parameters
# PET_MAX_LEVEL                             -> hard cap on levels
# -----------------------------------------------------------------------------

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import UniqueConstraint
from datetime import datetime, timezone, timedelta
from flask import current_app

db = SQLAlchemy()

class Pet(db.Model):
    """
    A virtual pet with progression and decaying stats.

    Fields
    ------
    Core:
      - id, name, breed, age, user_id, description
      - created_at / updated_at timestamps

    Gameplay:
      - level, xp: progression system with exponential requirements
      - hunger, happiness, energy: clamped stats (see _clamp)
      - feeding_points, playing_points, cleaning_points: action-specific currencies
      - last_tick_at: anchor timestamp for time-based decay

    Notes
    -----
    - All decay and progression parameters are configurable via Flask config:
        STAT_MIN / STAT_MAX
        HUNGER_DECAY_SEC / ENERGY_DECAY_SEC / HAPPINESS_DECAY_SEC
        PET_LEVEL_XP_BASE / PET_LEVEL_XP_GROWTH / PET_MAX_LEVEL
    """
    __tablename__ = 'pets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    breed = db.Column(db.String(100), nullable=False)  # breed label (e.g., "dog", "cat", "bird")
    age = db.Column(db.Integer)
    user_id = db.Column(db.Integer, nullable=False)  # Foreign key to a User service (external)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- Game Stats (clamped via _clamp) ---
    level = db.Column(db.Integer, default=0, nullable=False)
    xp = db.Column(db.Integer, default=0, nullable=False)
    hunger = db.Column(db.Integer, default=50, nullable=False)
    happiness = db.Column(db.Integer, default=50, nullable=False)
    energy = db.Column(db.Integer, default=50, nullable=False)

    # --- Action-specific point buckets (soft currency) ---
    feeding_points  = db.Column(db.Integer, default=0, nullable=False)
    playing_points  = db.Column(db.Integer, default=0, nullable=False)
    cleaning_points = db.Column(db.Integer, default=0, nullable=False)

    # Timestamp used as the origin when applying time-based decay.
    last_tick_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # ---- helpers ----
    def add_points(self, tag: str, pts: int):
        """
        Add points to one of the action buckets.

        Parameters
        ----------
        tag : {"feeding","playing","cleaning"}
            Which bucket to increment.
        pts : int
            Positive integer amount to add; non-positive is ignored.
        """
        if pts <= 0:
            return
        if tag == "feeding":
            self.feeding_points += pts
        elif tag == "playing":
            self.playing_points += pts
        elif tag == "cleaning":
            self.cleaning_points += pts

    def spend_points(self, verb: str, cost: int = 1) -> bool:
        """Consume points from the corresponding bucket.

        Parameters
        ----------
        verb : {"feed","play","clean"}
            Action verb that maps to the appropriate bucket.
        cost : int, default 1
            Number of points required.

        Returns
        -------
        bool
            True if points were deducted; False if insufficient.
        """
        if cost <= 0:
            return True
        tag = {"feed":"feeding","play":"playing","clean":"cleaning"}.get(verb)
        if tag == "feeding" and self.feeding_points >= cost:
            self.feeding_points -= cost; return True
        if tag == "playing" and self.playing_points >= cost:
            self.playing_points -= cost; return True
        if tag == "cleaning" and self.cleaning_points >= cost:
            self.cleaning_points -= cost; return True
        return False

    def points_dict(self):
        """Return a serializable snapshot of the action-point balances."""
        return {
            "feeding": int(self.feeding_points or 0),
            "playing": int(self.playing_points or 0),
            "cleaning": int(self.cleaning_points or 0),
        }

    # ====== DECAY LOGIC ======
    def _clamp(self, value):
        """
        Clamp stat values to [STAT_MIN, STAT_MAX] (defaults 0..100).

        Reads STAT_MIN/STAT_MAX from Flask config; falls back to 0/100.
        """
        mn = current_app.config.get('STAT_MIN', 0)
        mx = current_app.config.get('STAT_MAX', 100)
        return max(mn, min(mx, int(value)))

    def tick(self, now: datetime | None = None) -> bool:
        """
        Apply time-based decay to hunger, energy, and happiness since last_tick_at.

        Behavior
        --------
        - Uses *_DECAY_SEC config values to determine how often a stat decreases by 1.
        - Ignores negative time deltas; updates last_tick_at defensively.
        - Returns True if any stat changed by at least 1 point.

        Parameters
        ----------
        now : datetime | None
            Reference time; defaults to UTC now.

        Returns
        -------
        bool
            True if any stat decayed; False otherwise.
        """
        if now is None:
            now = datetime.utcnow()
        # Guard against non-monotonic time or uninitialized last_tick_at.
        if not self.last_tick_at or now <= self.last_tick_at:
            self.last_tick_at = now
            return False

        elapsed = (now - self.last_tick_at).total_seconds()

        # Seconds per -1 point (configurable; comments show defaults).
        hunger_sec     = float(current_app.config.get('HUNGER_DECAY_SEC', 600.0))     # ~1 every 10m
        energy_sec     = float(current_app.config.get('ENERGY_DECAY_SEC', 900.0))     # ~1 every 15m
        happiness_sec  = float(current_app.config.get('HAPPINESS_DECAY_SEC', 1200.0)) # ~1 every 20m

        dh = int(elapsed // hunger_sec) if hunger_sec > 0 else 0
        de = int(elapsed // energy_sec) if energy_sec > 0 else 0
        dhap = int(elapsed // happiness_sec) if happiness_sec > 0 else 0

        changed = False
        if dh > 0:
            self.hunger = self._clamp(self.hunger - dh); changed = True
        if de > 0:
            self.energy = self._clamp(self.energy - de); changed = True
        if dhap > 0:
            self.happiness = self._clamp(self.happiness - dhap); changed = True

        # Advance the reference timestamp. Using 'now' is simple and avoids drift.
        if changed:
            self.last_tick_at = now
        else:
            # Update even if no whole-point decay occurred to avoid large future jumps.
            # Remove this assignment if you prefer accumulating partial progress.
            self.last_tick_at = now

        return changed

    def _xp_to_next(self):
        """
        Compute XP required for the next level using exponential growth.

        Reads:
          - PET_LEVEL_XP_BASE (default 100)
          - PET_LEVEL_XP_GROWTH (default 1.5)
        """
        base = current_app.config.get('PET_LEVEL_XP_BASE', 100)
        growth = current_app.config.get('PET_LEVEL_XP_GROWTH', 1.5)
        needed = int(round(base * (growth ** (self.level - 1))))
        return max(needed, 1)

    def add_xp(self, points: int):
        """
        Award XP and handle level-ups (including large XP bursts).

        - Stops accruing XP at PET_MAX_LEVEL (default 9).
        - On each level-up: +5 happiness and +5 energy (capped by _clamp via min()).
        """
        points = max(int(points or 0), 0)
        if points <= 0:
            return

        max_level = current_app.config.get('PET_MAX_LEVEL', 9)
        # If already at max, do not accumulate further XP
        if int(self.level) >= int(max_level):
            self.level = int(max_level)
            self.xp = 0
            return

        self.xp += points
        # Loop to support multiple level-ups in one grant.
        while self.xp >= self._xp_to_next():
            # Stop if we are about to exceed max level
            if int(self.level) >= int(max_level):
                self.level = int(max_level)
                self.xp = 0
                break
            self.xp -= self._xp_to_next()
            self.level += 1
            # Small level-up bonuses (bounded to 100).
            self.happiness = min(self.happiness + 5, 100)
            self.energy = min(self.energy + 5, 100)

    def apply_action(self, action: str):
        """
        Apply an action's effects to the pet's stats.

        Supported actions:
          - "feed":   +25 hunger, +5 energy
          - "play":   +20 happiness, -10 energy, -5 hunger
          - "clean":  +10 happiness

        Returns
        -------
        dict
            Delta applied to {"hunger","happiness","energy"}; empty changes if no-op.
        """
        # Apply action effects to pet stats
        action = (action or '').lower().strip()
        delta = {"hunger": 0, "happiness": 0, "energy": 0}

        if action == "feed":
            delta["hunger"] = +25
            delta["energy"] = +5
        elif action == "play":
            delta["happiness"] = +20
            delta["energy"] = -10
            delta["hunger"] = -5
        elif action == "clean":
            delta["happiness"] = +10
        else:
            return delta  # Unsupported action: no changes

        self.hunger = self._clamp(self.hunger + delta["hunger"])
        self.happiness = self._clamp(self.happiness + delta["happiness"])
        self.energy = self._clamp(self.energy + delta["energy"])
        return delta

    def to_dict(self):
        """
        Serialize the pet to a dict suitable for JSON responses.

        Includes: core fields, timestamps (ISO 8601), stats, XP, and point buckets.
        """
        d = super().to_dict() if hasattr(super(), "to_dict") else {}
        d.update({
            'id': self.id,
            'name': self.name,
            'breed': self.breed,
            'age': self.age,
            'user_id': self.user_id,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'level': self.level,
            'xp': self.xp,
            'xp_to_next': self._xp_to_next(),
            'hunger': self.hunger,
            'happiness': self.happiness,
            'energy': self.energy,
            "feeding_points":  int(self.feeding_points or 0),
            "playing_points":  int(self.playing_points or 0),
            "cleaning_points": int(self.cleaning_points or 0),
        })
        return d

    def __repr__(self):
        return f'<Pet {self.id}: {self.name}>'

class EventLog(db.Model):
    """
    Append-only application event log.

    Purpose
    -------
    - Persist raw events (type + JSON payload) for auditing and troubleshooting.
    - Enforce idempotency using an application-provided idempotency_key.

    Notes
    -----
    - The (idempotency_key) column has a unique constraint to prevent duplicate ingests.
    - 'created_at' is server-side generated in UTC.
    """
    __tablename__ = 'event_logs'
    id = db.Column(db.Integer, primary_key=True)
    idempotency_key = db.Column(db.String(255), nullable=False)
    event_type = db.Column(db.String(100), nullable=False)
    payload = db.Column(JSONB, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('idempotency_key', name='uq_event_idempotency_key'),
    )

    def to_dict(self):
        """Return a JSON-serializable representation of the event log row."""
        return {
            "id": self.id,
            "idempotency_key": self.idempotency_key,
            "event_type": self.event_type,
            "payload": self.payload,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }