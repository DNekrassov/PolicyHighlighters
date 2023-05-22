import json
import glob
from w3lib.url import url_query_cleaner
from url_normalize import url_normalize
from werkzeug.serving import is_running_from_reloader

from PrivacyHighlighter.db_models import Policy, Meta, Priva
from PrivacyHighlighter import db
from PrivacyHighlighter.config import META_FILEPATH, PRIVA_FILEPATH, DEFAULT_JSON


def check_policy_by_url(policy_url):
    policy_url = canonical_url(policy_url)  # normalizing url
    policy = Policy.query.filter_by(url=policy_url).first()
    # expr = '%{0}%'.format(policy_url)
    # policy = Policy.query.filter(Policy.url.like(expr)).first()  # querying url in cache
    if policy is None or not policy.has_policy:

        in_internal_db, policy_text = check_internal_policy_DB(policy_url)

        if not in_internal_db:
            return None

        if policy is None:  # found in internal db
            policy = Policy(url=policy_url)
            db.session.add(policy)

        policy.update_policy_text(policy_text)

        db.session.commit()

    return policy


def load_meta_data():
    if is_running_from_reloader():
        return

    if Meta.query.first():
        return

    meta_file = glob.glob1(META_FILEPATH, "*.jsonl")[0]
    filepath = META_FILEPATH + "/" + meta_file
    with open(filepath, 'r') as json_file:
        json_list = list(json_file)

    for json_str in json_list:
        obj = json.loads(json_str)
        meta_columns = ('url', 'file_path', 'hash')
        db.session.add(Meta(**{k: obj[k] for k in meta_columns if k in obj}))

    db.session.commit()


def check_result_json_validity(result_json):
    # FUTURE TODO: Check validity
    # This is just placeholder code
    if result_json == DEFAULT_JSON:
        return False
    return True


# ---------------------------------------------
# Internal util functions
# ---------------------------------------------
def canonical_url(u):
    u = url_normalize(u)
    u = url_query_cleaner(u, parameterlist=['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'], remove=True)

    if u.startswith("http://"):
        u = u[7:]
    if u.startswith("https://"):
        u = u[8:]
    if u.startswith("www."):
        u = u[4:]
    if u.endswith("/"):
        u = u[:-1]
    return u


def check_internal_policy_DB(policy_url):
    expr = '%{0}%'.format(policy_url)
    meta_entry = Meta.query.filter(Meta.url.like(expr)).first()
    if meta_entry is None:
        return False, ""

    policy_hash, file_num = meta_entry.hash, meta_entry.file_path

    # Future TODO: Try and replace it with a simple check whether file was read?
    priva_entry = Priva.query.filter_by(hash=policy_hash).first()
    if priva_entry is None:  # Not found in current Priva - might be from a different file
        load_priva_data(file_num)
        priva_entry = Priva.query.filter_by(hash=policy_hash).first()
        if priva_entry is None:  # SHOULD NEVER HAPPEN, since we loaded the new file
            print("!!!!!!!!!! FOUND IN METADATA BUT NOT IN PRIVA.DB !!!!!!!!!!")
            return False, ""
    return True, priva_entry.text


def load_priva_data(file_num=-1):
    if file_num == -1:
        priva_files = glob.glob1(PRIVA_FILEPATH, "*.json")
    else:
        filepath = PRIVA_FILEPATH + "/" + str(file_num) + ".json"
        priva_files = [filepath]

    print(priva_files)
    for file in priva_files:
        with open(file, 'r') as json_file:
            json_list = list(json_file)

        for json_str in json_list:
            obj = json.loads(json_str)
            priva_columns = ('hash', 'text')
            db.session.add(Priva(**{k: obj[k] for k in priva_columns if k in obj}))
        db.session.commit()
