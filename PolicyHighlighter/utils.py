import json
import glob
import re

import flask
import tldextract
from werkzeug.serving import is_running_from_reloader

from PolicyHighlighter.db_models import Policy, Meta, Priva
from PolicyHighlighter import db
from PolicyHighlighter.config import DEMO_META_FILEPATH, DEMO_PRIVA_FILEPATH, FULL_META_FILEPATH, FULL_PRIVA_FILEPATH, DEFAULT_JSON, dataMode
from PolicyHighlighter.status import Status


def check_policy_by_url(policy_url):
    policy_url_list = canonical_url(policy_url)  # normalizing url
    for policy_url in policy_url_list:
        policy = Policy.query.filter_by(url=policy_url).first()
        if policy is None or not policy.has_policy:

            in_internal_db, policy_text, meta_entry = check_internal_policy_DB(policy_url)

            if not in_internal_db:
                continue

            if policy is None:  # found in internal db
                policy = Policy(url=policy_url)
                db.session.add(policy)

            policy.update_policy_text(policy_text)
            policy.update_meta_info(meta_entry.timestamp, meta_entry.probability)

            db.session.commit()

        return policy


def load_meta_data(mode=dataMode.mode_FULL_DB):
    if is_running_from_reloader():
        return

    if Meta.query.first():
        return

    if mode == dataMode.mode_DEMO_DB:
        meta_file = glob.glob1(DEMO_META_FILEPATH, "*.jsonl")[0]
        filepath = DEMO_META_FILEPATH + "/" + meta_file
        with open(filepath, 'r') as json_file:
            json_list = list(json_file)

    if mode == dataMode.mode_FULL_DB:
        meta_file = glob.glob1(FULL_META_FILEPATH, "*.jsonl")[0]
        filepath = FULL_META_FILEPATH + "/" + meta_file
        with open(filepath, 'r') as json_file:
            json_list = list(json_file)

    for json_str in json_list:
        obj = json.loads(json_str)
        meta_columns = ('url', 'file_path', 'hash', 'timestamp', 'probability')
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
    extract = tldextract.extract(u)
    domain = ".".join([extract.domain, extract.suffix])
    subdomain = extract.subdomain

    if subdomain == "www":
        subdomain = ""

    if subdomain.startswith("www."):
        subdomain = subdomain[4:]

    # recursively building subdomain list: e.g.: forums.news.cnn.com -> news.cnn.com -> cnn.com
    if subdomain == "":
        return [domain]
    full_subdomain = ".".join([subdomain, domain])
    lst = [full_subdomain]
    subdomain_count = subdomain.count('.')
    name = full_subdomain
    for i in range(subdomain_count + 1):
        name = ".".join(name.split(".")[1:])
        lst.append(name)

    return lst


def check_internal_policy_DB(policy_url):
    expr = '%{0}%'.format(policy_url)
    meta_entry = Meta.query.filter(Meta.url.like(expr)).first()
    if meta_entry is None:
        return False, "", None

    policy_hash, file_num = meta_entry.hash, meta_entry.file_path

    priva_entry = Priva.query.filter_by(hash=policy_hash).first()
    if priva_entry is None:  # Not found in current Priva - might be from a different file
        load_priva_data(file_num)
        priva_entry = Priva.query.filter_by(hash=policy_hash).first()
        if priva_entry is None:  # SHOULD NEVER HAPPEN, since we loaded the new file
            print("!!!!!!!!!! FOUND IN METADATA BUT NOT IN PRIVA.DB !!!!!!!!!!")
            return False, "", meta_entry
    return True, priva_entry.text, meta_entry


def load_priva_data(file_num=-1, mode=dataMode.mode_FULL_DB):
    priva_files = []
    if mode == dataMode.mode_DEMO_DB:
        if file_num == -1:
            priva_files = glob.glob1(DEMO_PRIVA_FILEPATH, "*.json")
        else:
            filepath = DEMO_PRIVA_FILEPATH + "/" + str(file_num) + ".json"
            priva_files = [filepath]

    if mode == dataMode.mode_FULL_DB:
        if file_num == -1:
            priva_files = glob.glob1(FULL_PRIVA_FILEPATH, "*")
        else:
            filepath = FULL_PRIVA_FILEPATH + "/" + str(file_num)
            priva_files = [filepath]

    for file in priva_files:
        with open(file, 'r') as json_file:
            json_list = list(json_file)

        for json_str in json_list:
            obj = json.loads(json_str)
            priva_columns = ('hash', 'text')
            db.session.add(Priva(**{k: obj[k] for k in priva_columns if k in obj}))
        db.session.commit()


def response_jsonify(message, table, policy=None):
    if policy is None:
        response = flask.jsonify(table=table, code=int(message))
    else:
        response = flask.jsonify(table=table, code=int(message), domain=policy.url, creation_time=policy.timestamp,
                                 confidence=policy.probability)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response
