from PrivacyHighlighter import db
from PrivacyHighlighter.config import DEFAULT_JSON


class Policy(db.Model):
    policy_id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String, unique=True, nullable=False)
    has_policy = db.Column(db.Boolean, default=False)
    policy_text = db.Column(db.UnicodeText, nullable=False, default="")
    has_result = db.Column(db.Boolean, default=False)
    gpt_result = db.Column(db.JSON, nullable=True, default=DEFAULT_JSON)
    test = db.Column(db.Boolean, default=True)  # We'll change the default to False once we start doing real stuff

    def __init__(self, **kwargs):
        super(Policy, self).__init__(**kwargs)
        self.has_policy = (self.policy_text != "")

    def __repr__(self):
        return f"Policy(id:'{self.policy_id}', url:'{self.url}', policy_text:'{self.policy_text}', gpt_result:'{self.gpt_result}')"

    def update_policy_text(self, text):
        self.policy_text = text
        self.has_policy = (self.policy_text != "")

    def update_gpt_result(self, result):
        self.gpt_result = result
        self.has_result = (self.gpt_result != DEFAULT_JSON)


class Meta(db.Model):
    __bind_key__ = 'meta_db'
    __tablename__ = 'meta'
    url = db.Column(db.String, unique=True, nullable=False)
    file_path = db.Column(db.Integer, nullable=False)
    hash = db.Column(db.String, unique=True, nullable=False, primary_key=True)


class Priva(db.Model):
    __bind_key__ = 'priva_db'
    __tablename__ = 'priva'
    hash = db.Column(db.String, unique=True, nullable=False, primary_key=True)
    text = db.Column(db.UnicodeText, nullable=False, default="")


def init_db(app):
    with app.app_context():
        db.create_all()
        from PrivacyHighlighter.utils import load_meta_data
        load_meta_data()