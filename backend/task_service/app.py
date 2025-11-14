import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from config import Config
from models import db

BASE_DIR = os.path.dirname(__file__)

def create_app():
    app = Flask(__name__)  
    CORS(app)
    app.config.from_object(Config)
    db.init_app(app)

    from routes import bp as routes_bp
    app.register_blueprint(routes_bp)

    with app.app_context():
        #db.drop_all()
        db.create_all()
    
    @app.route("/")
    def index():
        return jsonify({'message': 'TASK SERVICE is running ...'}), 200

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv('PORT', 5003))
    app.run(host="0.0.0.0", port=port, debug=app.config['DEBUG'])
