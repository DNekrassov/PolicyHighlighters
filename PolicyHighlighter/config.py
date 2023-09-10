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
DEFAULT_JSON = None
TEST_JSON = {
		"contacts":         { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"cookies":          { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"demographics":     { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"financial_info":   { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"health_info":      { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"preferences":      { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"purchases":        { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"credit_card_info": { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"social_security":  { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"gov_id":           { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"site_activity":    { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 },
		"location":         { "service": 0, "maintenance": 1, "marketing": 2, "profiling": 3, "other_companies": 0, "public_forums": 0 }
	}
