import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from models import db

BASE_DIR = os.path.dirname(__file__)

def create_app():
    app = Flask(
        __name__,
        static_folder="static",       
        static_url_path="/static"   
    )
    CORS(app)
    app.config.from_object(Config)
    db.init_app(app)

    from routes import bp as routes_bp
    app.register_blueprint(routes_bp)


    @app.route("/")                  
    def index():
        static_dir = os.path.join(BASE_DIR, "static")
        return send_from_directory(static_dir, "index.html")

    with app.app_context():
        # only for development purposes
        # db.drop_all()
        db.create_all()
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5003, debug=app.config['DEBUG'])
