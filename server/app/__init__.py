from flask import Flask
from app.config import Config
from app.extensions import mongo
from app.routes.openalex_routes import openalex_bp
from app.routes.code_plag_routes import code_plag_bp
from app.routes.text_plag_routes import text_plag_bp

def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)

    mongo.init_app(app)
    
    app.register_blueprint(openalex_bp)
    app.register_blueprint(code_plag_bp)
    app.register_blueprint(text_plag_bp)

    @app.route('/')
    def index():
        return {'message': 'Welcome to plagecheck server!'}

    return app