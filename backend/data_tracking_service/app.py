import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from routes import data_tracking_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    db.init_app(app)
    
    with app.app_context():
        db.drop_all()
        db.create_all()

    @app.route("/")
    def index():
        return jsonify({'message': 'DATA TRACKING SERVICE is running...'}), 200
    
    app.register_blueprint(data_tracking_bp)
    
    return app

app = create_app()

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5004))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])