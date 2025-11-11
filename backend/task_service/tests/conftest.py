# tests/conftest.py
import os, sys, pytest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


os.environ["TASK_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEBUG"] = "True"

from app import create_app
from models import db

@pytest.fixture()
def app():
    app = create_app()
    app.config.update(TESTING=True)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture()
def client(app):
    return app.test_client()
