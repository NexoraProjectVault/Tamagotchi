import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from routes import pets_bp, root_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
    
    app.register_blueprint(pets_bp)
    app.register_blueprint(root_bp)

    @app.route("/")
    def index():
        return jsonify({'message': 'PET SERVICE is running'}), 200

    return app
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])