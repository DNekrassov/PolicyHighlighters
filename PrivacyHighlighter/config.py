class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///cache.db'
    SQLALCHEMY_BINDS = {
        "meta_db": "sqlite:///meta.db",
        "priva_db": "sqlite:///priva.db"
    }
    SECRET_KEY = '82afe8cdea1251bb5a66c994'
    SQLALCHEMY_TRACK_MODIFICATIONS = False


META_FILEPATH = './privaseer_demo/metadata'
PRIVA_FILEPATH = './privaseer_demo/plaintext'
DEFAULT_JSON = {"null": "null"}
