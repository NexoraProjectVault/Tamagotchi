from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
from routes import pets_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
    
    app.register_blueprint(pets_bp)
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5002, debug=app.config['DEBUG'])