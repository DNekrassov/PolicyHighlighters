import logging
import validators
from flask import Blueprint, request, jsonify, json
from PrivacyHighlighter.db_models import Policy, DEFAULT_JSON
from PrivacyHighlighter.utils import check_policy_by_url, check_result_json_validity, response_jsonify
from PrivacyHighlighter.chatgpt_integration import chatgpt_policy_request
from PrivacyHighlighter.status import Status

main = Blueprint('main', __name__)


@main.route("/")
def default_route():
    return "Hey there, if you're a user, you shouldn't be here. This space is used by the PrivacyHighlighter project :)"


@main.route("/request")
def request_route():
    if 'policy_url' not in request.args:
        return response_jsonify(message=Status.MSG_ERR_INVALID_ARG, table=DEFAULT_JSON)

    policy_url = request.args.get('policy_url')

    if not validators.url(policy_url):
        return response_jsonify(message=Status.MSG_ERR_INVALID_URL, table=DEFAULT_JSON)

    policy = check_policy_by_url(policy_url)

    if not policy or not policy.has_policy:
        return response_jsonify(message=Status.MSG_ERR_NO_POLICY_FOUND, table=DEFAULT_JSON)

    if policy.has_result:
        return response_jsonify(message=Status.MSG_SUCCESS, table=policy.gpt_result, policy=policy)

    # else, parse result through ChatGPT
    gpt_result = chatgpt_policy_request(policy.policy_text)

    if not check_result_json_validity(gpt_result):
        return response_jsonify(message=Status.MSG_ERR_INVALID_RESULT, table=DEFAULT_JSON, policy=policy)

    policy.update_gpt_result(gpt_result)

    return response_jsonify(message=Status.MSG_SUCCESS, table=policy.gpt_result, policy=policy)
