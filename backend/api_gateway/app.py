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

    # # ===== Start EventBus once =====
    # if not event_bus.running:
    #     event_bus.start()
    #     print("✅ EventBus started")

    # @app.teardown_appcontext
    # def shutdown(exception=None):
    #     """Stop EventBus on shutdown"""
    #     event_bus.stop()
    #     print("❌ API Gateway shutting down")

    @app.route("/")
    def index():
        return jsonify({'message': 'API GATEWAY running.. try /v1/... endpoints'}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG'],
        threaded=True
    )