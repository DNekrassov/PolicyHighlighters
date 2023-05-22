from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from PrivacyHighlighter.config import Config


db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    from PrivacyHighlighter.db_models import init_db

    init_db(app)

    from PrivacyHighlighter.routes import main
    app.register_blueprint(main)

    return app
