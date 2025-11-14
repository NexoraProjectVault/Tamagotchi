import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models import db
from routes import users_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    db.init_app(app)
    
    with app.app_context():
        #db.drop_all()
        db.create_all()
    
    app.register_blueprint(users_bp)

    @app.route("/")
    def index():
        return jsonify({'message': 'USER SERVICE is running ...'}), 200
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=5001, debug=app.config['DEBUG'])