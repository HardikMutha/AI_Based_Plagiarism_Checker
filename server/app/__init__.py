from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from app.config import Config
from app.extensions import mongo, jwt
from app.routes.openalex_routes import openalex_bp
from app.routes.auth_routes import auth_bp
from app.routes.code_plag_routes import code_plag_bp
from app.routes.ai_text_routes import ai_text_bp
from app.routes.text_plag_routes import text_plag_bp
from app.routes.citation_routes import citation_bp
from app.routes.report_routes import report_bp
from app.routes.pdf_routes import pdf_bp
from app.routes.assignment_routes import assignment_bp
from datetime import datetime
from bson import ObjectId


class AppJSONProvider(DefaultJSONProvider):
    """JSON provider that handles MongoDB types (ObjectId, datetime) as plain strings."""
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)

    mongo.init_app(app)
    jwt.init_app(app)
    CORS(app)

    # Override Flask-PyMongo's BSONProvider so dates serialize as plain ISO strings
    app.json_provider_class = AppJSONProvider
    app.json = AppJSONProvider(app)
    
    app.register_blueprint(openalex_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(code_plag_bp)
    app.register_blueprint(ai_text_bp)
    app.register_blueprint(text_plag_bp)
    app.register_blueprint(citation_bp, url_prefix='/api/citations')
    app.register_blueprint(report_bp)
    app.register_blueprint(pdf_bp)
    app.register_blueprint(assignment_bp, url_prefix='/api/assignments')

    @app.route('/')
    def index():
        return {'message': 'Welcome to plagecheck server!'}

    return app