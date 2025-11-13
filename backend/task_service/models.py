from datetime import datetime, timezone
from sqlalchemy import func
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

db = SQLAlchemy()

class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), index=True, nullable=False) 
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default="todo")  # todo|in_progress|done
    priority = db.Column(db.String(16), default="medium")              # low|medium|high
    due_at = db.Column(db.DateTime(timezone=True), nullable=True)
    tags = db.Column(JSONB, nullable=True)                           
    points = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    completed_at = db.Column(db.DateTime(timezone=True))
    completed_event_emitted_at = db.Column(db.DateTime(timezone=True)) 

    repeat_every = db.Column(db.String(16), nullable=True)
    next_occurrence_at = db.Column(db.DateTime(timezone=True), nullable=True)
    is_recurring_template = db.Column(db.Boolean, default=False)
    repeat_until = db.Column(db.DateTime(timezone=True), nullable=True)


    def to_dict(self):
        iso = lambda dt: dt.isoformat() if dt else None
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "due_at": iso(self.due_at),
            "tags": self.tags,
            "points": self.points,
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
            "deleted_at": iso(self.deleted_at),
            'completed_at': iso(self.completed_at),

            "repeat_every": self.repeat_every,
            "next_occurrence_at": iso(self.next_occurrence_at),
            "is_recurring_template": self.is_recurring_template,
            "repeat_until": iso(self.repeat_until),
        }

    def __repr__(self):
        return f"<Task id={self.id} user_id={self.user_id} title={self.title!r}>"
    

class Tag(db.Model):
    __tablename__ = "tags"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)  
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
