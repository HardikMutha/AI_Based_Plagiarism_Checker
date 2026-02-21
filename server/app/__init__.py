from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import mongo, jwt
from app.routes.openalex_routes import openalex_bp
from app.routes.auth_routes import auth_bp
from app.routes.code_plag_routes import code_plag_bp
from app.routes.text_plag_routes import text_plag_bp
from app.routes.citation_routes import citation_bp

def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)

    mongo.init_app(app)
    jwt.init_app(app)
    CORS(app) # Enable CORS for frontend communication
    
    app.register_blueprint(openalex_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(code_plag_bp)
    app.register_blueprint(text_plag_bp)
    app.register_blueprint(citation_bp, url_prefix='/api/citations')

    @app.route('/')
    def index():
        return {'message': 'Welcome to plagecheck server!'}

    return app