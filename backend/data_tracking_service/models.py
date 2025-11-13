from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import func


db = SQLAlchemy()

class Roadmap(db.Model):
    __tablename__ = 'roadmaps'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), index=True, nullable=False) 
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    progress_percentage = db.Column(db.Integer) # will be calculated
    
    total_tasks = db.Column(db.Integer, default=0) # need to fetch from tasks service
    completed_tasks = db.Column(db.Integer, default=0) # need to fetch from tasks service
    task_ids = db.Column(db.JSON, default=list)

    due_date = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    completed_at = db.Column(db.DateTime(timezone=True))

    def calculate_progress(self):
        if self.total_tasks == 0:
            return 0
        return int((self.completed_tasks / self.total_tasks) * 100)

    def to_dict(self):
        iso = lambda dt: dt.isoformat() if dt else None
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'progress_percentage': self.progress_percentage,
            'total_tasks': self.total_tasks,
            'completed_tasks': self.completed_tasks,
            'task_ids': self.task_ids or [],
            'due_date': iso(self.due_date),
            'created_at': iso(self.created_at),
            'updated_at': iso(self.updated_at),
            'deleted_at': iso(self.deleted_at),
            'completed_at': iso(self.completed_at),
        }

    def __repr__(self):
        return f'<Roadmap id={self.id} user_id={self.user_id} title={self.title!r}>'

class TagStatistic(db.Model):
    __tablename__ = 'tag_statistics'

    id = db.Column(db.Integer, primary_key=True)
    tag = db.Column(db.String(64), unique=True, nullable=False)
    total_tasks = db.Column(db.Integer, default=0, nullable=False)
    completed_tasks = db.Column(db.Integer, default=0, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'tag': self.tag,
            'total_tasks': self.total_tasks,
            'completed_tasks': self.completed_tasks,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<TagStatistic {self.tag}: {self.completed_tasks}/{self.total_tasks}>'