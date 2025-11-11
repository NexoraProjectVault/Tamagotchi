from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
from config import Config
from event_bus import event_bus
from shared.event_client import Events
import json
from datetime import datetime
from queue import Queue
import threading
from routes import api_gateway


def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config.from_object(Config)
    app.register_blueprint(api_gateway)

    @app.before_request
    def startup():
        """Initialize event bus on first request"""

        #TODO - Commented for now
        # if not event_bus.running:
        #     print(f"Starting Event Bus at {datetime.now()}")
        #     event_bus.start()

    @app.teardown_appcontext
    def shutdown(exception=None):
        """Cleanup on shutdown"""
        pass

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'], threaded=True)